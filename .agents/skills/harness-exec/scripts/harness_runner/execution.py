from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import replace
import heapq
import math
import subprocess
from pathlib import Path

from .models import (
    ExecutionReport,
    HarnessRequest,
    ParsedPlan,
    Task,
    TaskExecutionContext,
    TaskInvocation,
    TaskResult,
    VerificationResult,
    REUSE_ALLOWED,
)
from .evidence import EvidenceRecordError, ExecutionRecordStore, revision_fingerprint
from .state import PlanStateStore, StateRecordError
from .worker_gateway import invoke_task

MAX_PARALLEL_TASKS = 4
MAX_VERIFICATION_RESULT_COLLECTION_ATTEMPTS = 3
IN_PROGRESS_EVIDENCE_MARKERS = (
    "session",
    "진행 중",
    "in progress",
    "running",
)

WorkerInvoker = Callable[[TaskInvocation], object]
MANDATORY_GATES = (
    "permission_security",
    "scope",
    "requirements",
    "tdd",
    "automated_verification",
    "contract_sync",
    "critical_findings",
)
EXPLICIT_FAILURE_DECISIONS = frozenset((
    "RETRY",
    "HUMAN_REVIEW_REQUIRED",
    "FAILED",
    "BLOCKED",
))

# Woker 결과에서 종료 코드 추출
def _return_code(result: object) -> int:
    if type(result) is int:
        return result
    return_code = getattr(result, "returncode", 0)
    return return_code if type(return_code) is int else 0


def _non_empty_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _report_contract_error(worker_result: object) -> str:
    output = getattr(worker_result, "output", None)
    if not isinstance(output, dict):
        return ""
    if not _non_empty_text(output.get("work_summary")):
        return "work_summary가 누락되었거나 비어 있습니다."
    remaining_issues = output.get("remaining_issues")
    if not isinstance(remaining_issues, list) or any(
        not _non_empty_text(issue) for issue in remaining_issues
    ):
        return "remaining_issues가 문자열 배열이 아닙니다."
    if output.get("final_status") not in {"PASS", "FAILED", "BLOCKED"}:
        return "final_status가 PASS, FAILED 또는 BLOCKED가 아닙니다."
    return ""


def _tdd_contract_error(task: Task, context: TaskExecutionContext | None, gate: object) -> str:
    if not isinstance(gate, dict) or context is None:
        return "TDD 정책 실행 컨텍스트가 누락되었습니다."
    policy = context.effective_tdd_policy
    if policy != task.tdd_policy and not (
        policy == REUSE_ALLOWED and task.tdd_policy == "REQUIRED"
    ):
        return "선언 TDD 정책과 유효 정책이 모순됩니다."
    if gate.get("effective_policy") != policy:
        return "Worker TDD 유효 정책이 실행 컨텍스트와 일치하지 않습니다."
    if not _non_empty_text(gate.get("evidence")) or not _non_empty_text(gate.get("current_verification_evidence")):
        return f"{policy} TDD에는 현재 검증 증거가 필요합니다."
    if policy == "NOT_APPLICABLE":
        if gate.get("result") != "N/A" or not _non_empty_text(gate.get("reason")):
            return "NOT_APPLICABLE TDD에는 N/A 결과와 적용 제외 사유가 필요합니다."
    elif gate.get("result") != "PASS":
        return f"{policy} TDD Gate는 PASS여야 합니다."
    reused = gate.get("reused_evidence")
    if policy == REUSE_ALLOWED:
        if not isinstance(reused, dict) or reused.get("record_id") != context.prior_evidence_id or reused.get("fingerprint") != context.fingerprint:
            return "REUSE_ALLOWED TDD에는 동일 fingerprint의 선행 증거 식별자가 필요합니다."
    elif reused not in (None, {"record_id": None, "fingerprint": None}):
        return "재사용이 아닌 TDD 정책에는 선행 증거를 지정할 수 없습니다."
    return ""

# Worker가 제출한 JSON 결과 중 판정을 제외한 객관적 완료 조건을 검증한다.
def _objective_completion_error(task: Task, worker_result: object, context: TaskExecutionContext | None = None) -> str:
    output = getattr(worker_result, "output", None)
    output_error = getattr(worker_result, "output_error", "")

    if not isinstance(output, dict):
        detail = output_error if _non_empty_text(output_error) else "JSON 객체 없음"
        return f"Worker 결과 JSON이 유효하지 않습니다: {detail}"

    report_error = _report_contract_error(worker_result)
    if report_error:
        return report_error

    gates = output.get("mandatory_gates")
    if not isinstance(gates, dict):
        return "Mandatory Gate 결과가 누락되었습니다."
    
    for gate_name in MANDATORY_GATES:
        gate = gates.get(gate_name)
        if not isinstance(gate, dict):
            return f"Mandatory Gate {gate_name} 결과가 누락되었습니다."
        result = gate.get("result")
        if gate_name == "tdd":
            tdd_error = _tdd_contract_error(task, context, gate)
            if tdd_error:
                return tdd_error
        elif result != "PASS":
            return f"Mandatory Gate {gate_name}이 PASS가 아닙니다."
        if not _non_empty_text(gate.get("evidence")):
            return f"Mandatory Gate {gate_name}의 증거가 누락되었습니다."

    expected_verification = task.verification_items
    if not expected_verification:
        return "Plan의 검증 항목이 비어 있습니다."
    
    verification = output.get("verification")
    if not isinstance(verification, list):
        return "검증 결과가 누락되었습니다."
    
    if len(verification) != len(expected_verification):
        return "Plan의 모든 검증 항목과 Worker 검증 결과가 대응하지 않습니다."
    results_by_item: dict[str, dict[object, object]] = {}
    for item in verification:
        if not isinstance(item, dict) or not isinstance(item.get("item"), str):
            return "검증 결과 형식이 유효하지 않습니다."
        item_name = item["item"]
        if item_name in results_by_item:
            return f"검증 결과가 중복되었습니다: {item_name}"
        results_by_item[item_name] = item
    if set(results_by_item) != set(expected_verification):
        return "Plan의 모든 검증 항목과 Worker 검증 결과가 대응하지 않습니다."
    
    for item_name in expected_verification:
        verification_result = results_by_item[item_name]

        if verification_result.get("result") != "PASS":
            return f"검증 항목이 PASS가 아닙니다: {item_name}"
        
        if not _non_empty_text(verification_result.get("evidence")):
            return f"검증 증거가 누락되었습니다: {item_name}"

    quality_score = output.get("quality_score")
    if type(quality_score) is not int:
        return "quality_score가 누락되었거나 정수가 아닙니다."
    if task.minimum_quality_score is not None and quality_score < task.minimum_quality_score:
        return f"quality_score가 최소 기준 {task.minimum_quality_score}점 미만입니다."

    return ""


# Worker가 제출한 JSON 결과 검증
def _completion_error(task: Task, worker_result: object, context: TaskExecutionContext | None = None) -> str:
    objective_error = _objective_completion_error(task, worker_result, context)
    if objective_error:
        return objective_error

    decision = worker_result.output.get("decision")
    if decision != "PASS":
        return f"Worker 판정이 PASS가 아닙니다: {decision!r}."
    if worker_result.output.get("final_status") != "PASS":
        return "Worker final_status가 PASS가 아닙니다."
    return ""


def _needs_decision_correction(task: Task, worker_result: object, context: TaskExecutionContext | None) -> bool:
    if _objective_completion_error(task, worker_result, context):
        return False
    output = getattr(worker_result, "output", None)
    decision = output.get("decision") if isinstance(output, dict) else None
    return decision != "PASS" and decision not in EXPLICIT_FAILURE_DECISIONS


def _in_progress_not_run_verification(worker_result: object) -> list[dict[str, object]]:
    """Return only NOT_RUN items that prove an existing verifier is still running."""

    output = getattr(worker_result, "output", None)
    if not isinstance(output, dict) or not isinstance(output.get("verification"), list):
        return []
    pending: list[dict[str, object]] = []
    for item in output["verification"]:
        if not isinstance(item, dict):
            return []
        result = item.get("result")
        if result == "PASS":
            continue
        if result != "NOT_RUN" or not _non_empty_text(item.get("evidence")):
            return []
        evidence = item["evidence"].lower()
        if not any(marker in evidence for marker in IN_PROGRESS_EVIDENCE_MARKERS):
            return []
        pending.append(item)
    return pending


def _verification_result_collection(
    invocation: TaskInvocation,
    attempt: int,
    verification: list[dict[str, object]],
) -> TaskInvocation:
    return replace(
        invocation,
        verification_result_collection={
            "attempt": attempt,
            "verification": verification,
        },
    )


def _decision_correction(invocation: TaskInvocation, worker_result: object) -> TaskInvocation:
    output = getattr(worker_result, "output")
    return replace(
        invocation,
        decision_correction={
            "prior_decision": output.get("decision"),
            "objective_evidence": {
                "work_summary": output.get("work_summary"),
                "mandatory_gates": output.get("mandatory_gates"),
                "verification": output.get("verification"),
                "remaining_issues": output.get("remaining_issues"),
                "final_status": output.get("final_status"),
                "quality_score": output.get("quality_score"),
            },
        },
    )


def _execute_task(
    task: Task,
    invocation: TaskInvocation,
    call_worker: WorkerInvoker,
    record_store: ExecutionRecordStore,
) -> TaskResult:
    status = "succeeded"
    return_code: int | None = None
    timed_out = False
    message = ""
    worker_output: dict[str, object] | None = None
    timing = None
    timing_observation_error = ""

    try:
        worker_result = call_worker(invocation)
        raw_output = getattr(worker_result, "output", None)
        worker_output = raw_output if isinstance(raw_output, dict) else None
        timing = getattr(worker_result, "timing", None)
        timing_observation_error = str(
            getattr(worker_result, "timing_observation_error", "") or ""
        )
        return_code = _return_code(worker_result)
        if return_code != 0:
            status = "failed"
            message = f"Worker 종료 코드 {return_code}"
        else:
            message = _completion_error(task, worker_result, invocation.execution_context)
            collection_attempts = 1
            pending_verification = _in_progress_not_run_verification(worker_result)
            while message and pending_verification:
                if collection_attempts >= MAX_VERIFICATION_RESULT_COLLECTION_ATTEMPTS:
                    status = "failed"
                    message = (
                        "진행 중 verifier 결과 수집이 "
                        f"{MAX_VERIFICATION_RESULT_COLLECTION_ATTEMPTS}회 후에도 완료되지 않았습니다: "
                        + "; ".join(
                            str(item["evidence"]) for item in pending_verification
                        )
                    )
                    break
                collection_attempts += 1
                collected_result = call_worker(
                    _verification_result_collection(
                        invocation,
                        collection_attempts,
                        pending_verification,
                    )
                )
                collected_return_code = _return_code(collected_result)
                if collected_return_code != 0:
                    status = "failed"
                    return_code = collected_return_code
                    message = "검증 결과 수집 continuation Worker 호출이 실패했습니다."
                    break
                worker_result = collected_result
                collected_output = getattr(collected_result, "output", None)
                worker_output = collected_output if isinstance(collected_output, dict) else None
                message = _completion_error(task, worker_result, invocation.execution_context)
                pending_verification = _in_progress_not_run_verification(worker_result)
            if message and _needs_decision_correction(task, worker_result, invocation.execution_context):
                corrected_result = call_worker(_decision_correction(invocation, worker_result))
                corrected_return_code = _return_code(corrected_result)
                if corrected_return_code != 0:
                    status = "failed"
                    return_code = corrected_return_code
                    message = "판정 교정 요청 Worker 호출이 실패했습니다."
                else:
                    corrected_message = _completion_error(task, corrected_result, invocation.execution_context)
                    if corrected_message:
                        status = "failed"
                        message = f"판정 교정 후에도 완료 계약을 충족하지 않습니다: {corrected_message}"
                    else:
                        message = ""
                        worker_result = corrected_result
                        corrected_output = getattr(corrected_result, "output", None)
                        worker_output = corrected_output if isinstance(corrected_output, dict) else None
            if message:
                status = "failed"
            else:
                output = getattr(worker_result, "output")
                try:
                    record_store.save(
                        invocation.execution_context.plan_id,
                        task,
                        invocation.execution_context.fingerprint,
                        output,
                    )
                except (OSError, EvidenceRecordError) as error:
                    status = "failed"
                    message = f"실행 기록 저장 실패: {error}"
    except subprocess.TimeoutExpired as error:
        status = "failed"
        return_code = 124
        timed_out = True
        message = str(error)
        timing = getattr(error, "timing", None)
        timing_observation_error = str(
            getattr(error, "timing_observation_error", "") or ""
        )
    except subprocess.CalledProcessError as error:
        status = "failed"
        return_code = error.returncode
        message = str(error)
    except Exception as error:
        status = "failed"
        message = str(error)

    verification: list[VerificationResult] = []
    if worker_output is not None and isinstance(worker_output.get("verification"), list):
        for item in worker_output["verification"]:
            if not isinstance(item, dict):
                continue
            name = item.get("item")
            result = item.get("result")
            evidence = item.get("evidence")
            if all(isinstance(value, str) for value in (name, result, evidence)):
                verification.append(VerificationResult(name, result, evidence))

    raw_issues = worker_output.get("remaining_issues") if worker_output else None
    remaining_issues = tuple(
        issue for issue in raw_issues if isinstance(issue, str) and issue.strip()
    ) if isinstance(raw_issues, list) else ()
    if status != "succeeded" and message and message not in remaining_issues:
        remaining_issues = (*remaining_issues, message)

    return TaskResult(
        task_number=task.number,
        title=task.title,
        status=status,
        return_code=return_code,
        timed_out=timed_out,
        message=message,
        work_summary=(
            str(worker_output.get("work_summary", ""))
            if worker_output is not None
            else ""
        ),
        verification=tuple(verification),
        quality_score=(
            worker_output.get("quality_score")
            if worker_output is not None and type(worker_output.get("quality_score")) is int
            else None
        ),
        remaining_issues=remaining_issues,
        final_status=(
            str(worker_output.get("final_status", ""))
            if worker_output is not None
            else ""
        ),
        timing=timing,
        timing_observation_error=timing_observation_error,
    )


def _block_failed_descendants(
    tasks_by_number: dict[int, Task],
    statuses: dict[int, str],
    results: dict[int, TaskResult],
    state_store: PlanStateStore,
    plan_id: str,
) -> None:
    changed = True
    while changed:
        changed = False
        for task_number in sorted(tasks_by_number):
            if statuses[task_number] != "pending":
                continue
            task = tasks_by_number[task_number]
            failed_prerequisites = tuple(
                prerequisite
                for prerequisite in task.prerequisite_numbers
                if statuses.get(prerequisite) in {"failed", "blocked"}
            )
            if not failed_prerequisites:
                continue
            statuses[task_number] = "blocked"
            results[task_number] = TaskResult(
                task_number=task.number,
                title=task.title,
                status="blocked",
                message=(
                    "실패하거나 차단된 선행 Task: "
                    + ", ".join(
                        f"Task {number}" for number in failed_prerequisites
                    )
                ),
            )
            state_store.update(plan_id, task, "blocked", reason=results[task_number].message)
            changed = True


def execute_workers(
    plan: ParsedPlan,
    request: HarnessRequest,
    invoker: WorkerInvoker | None = None,
    max_parallel_tasks: int = MAX_PARALLEL_TASKS,
    *,
    call_worker: WorkerInvoker | None = None,
    project_root: Path | None = None,
    record_store: ExecutionRecordStore | None = None,
    state_store: PlanStateStore | None = None,
) -> ExecutionReport:
    
    if invoker is not None and call_worker is not None:
        raise ValueError("invoker와 call_worker 중 하나만 전달해야 합니다.")
    worker_call = call_worker if call_worker is not None else invoker
    if worker_call is None:
        worker_call = invoke_task
    root = (project_root or Path.cwd()).resolve()
    store = record_store or ExecutionRecordStore(
        root / ".agents" / "skills" / "harness-exec" / "scripts" / "harness_runner" / ".execution-records"
    )
    states = state_store or PlanStateStore(root / "docs" / "plans" / "state")

    tasks_by_number = {task.number: task for task in plan.tasks}
    statuses = {task.number: "pending" for task in plan.tasks}
    results: dict[int, TaskResult] = {}
    try:
        state_document = states.load(request.plan_id, plan.tasks)
    except StateRecordError as error:
        failure = TaskResult(
            task_number=plan.tasks[0].number,
            title=plan.tasks[0].title,
            status="failed",
            message=f"상태 기록 읽기 실패: {error}",
        )
        return ExecutionReport((failure,))
    _, plan_number = states._parts(request.plan_id)
    saved_plan = state_document.get(plan_number, {})
    if request.start_task_number is None:
        for task in plan.tasks:
            record = saved_plan.get(f"task{task.number}")
            if record and record["status"] == "succeeded":
                statuses[task.number] = "succeeded"
                results[task.number] = TaskResult(
                    task_number=task.number,
                    title=task.title,
                    status="succeeded",
                    message="이전 실행의 완료 상태를 복원했습니다.",
                    restored=True,
                )
    else:
        for task in plan.tasks:
            if task.number >= request.start_task_number:
                continue
            fingerprint = revision_fingerprint(
                root,
                request.plan_id,
                task,
                plan.common_prompt,
            )
            try:
                prior_record = store.load(request.plan_id, task.number, fingerprint)
            except EvidenceRecordError as error:
                prior_record = None
                failure_detail = str(error)
            else:
                failure_detail = "현재 Task 계약과 일치하는 기록이 없습니다."
            if prior_record is None:
                statuses[task.number] = "failed"
                results[task.number] = TaskResult(
                    task_number=task.number,
                    title=task.title,
                    status="failed",
                    message=(
                        "이전 PASS 실행 기록을 신뢰할 수 없습니다: "
                        f"{failure_detail}"
                    ),
                )
                states.update(
                    request.plan_id,
                    task,
                    "failed",
                    reason=results[task.number].message,
                )
                continue
            statuses[task.number] = "succeeded"
            results[task.number] = TaskResult(
                task_number=task.number,
                title=task.title,
                status="succeeded",
                message="이전 PASS 실행 기록을 검증해 선행 Task를 복원했습니다.",
                work_summary="이전 PASS 실행 기록을 재사용했습니다.",
                restored=True,
            )

        _block_failed_descendants(
            tasks_by_number,
            statuses,
            results,
            states,
            request.plan_id,
        )
    ready = [
        task.number
        for task in plan.tasks
        if statuses[task.number] == "pending" and all(
            statuses.get(prerequisite) == "succeeded"
            for prerequisite in task.prerequisite_numbers
        )
    ]
    heapq.heapify(ready)
    submitted = set(ready)
    running: dict[Future[TaskResult], int] = {}

    with ThreadPoolExecutor(max_workers=max_parallel_tasks) as executor:
        while ready or running:
            while ready and len(running) < max_parallel_tasks:
                task_number = heapq.heappop(ready)
                task = tasks_by_number[task_number]
                statuses[task_number] = "running"
                try:
                    states.update(request.plan_id, task, "running")
                except StateRecordError as error:
                    result = TaskResult(task.number, task.title, "failed", message=f"상태 기록 저장 실패: {error}")
                    results[task_number] = result
                    statuses[task_number] = result.status
                    _block_failed_descendants(tasks_by_number, statuses, results, states, request.plan_id)
                    continue
                fingerprint = revision_fingerprint(root, request.plan_id, task, plan.common_prompt)
                try:
                    prior_record = store.load(request.plan_id, task.number, fingerprint)
                except EvidenceRecordError as error:
                    result = TaskResult(task.number, task.title, "failed", message=f"HUMAN_REVIEW_REQUIRED: {error}")
                    results[task_number] = result
                    statuses[task_number] = result.status
                    try:
                        states.update(request.plan_id, task, "failed", reason=result.message)
                    except StateRecordError:
                        pass
                    _block_failed_descendants(tasks_by_number, statuses, results, states, request.plan_id)
                    continue
                invocation = TaskInvocation(
                    common_prompt=plan.common_prompt,
                    additional_request=request.additional_request,
                    task=task,
                    execution_context=TaskExecutionContext(
                        plan_id=request.plan_id,
                        fingerprint=fingerprint,
                        mode="rerun" if prior_record else "new_or_changed",
                        prior_tdd_evidence=prior_record["tdd_evidence"] if prior_record else None,
                        prior_evidence_id=(f"plan:{request.plan_id}:task:{task.number}:fingerprint:{fingerprint}" if prior_record else None),
                        effective_tdd_policy=(REUSE_ALLOWED if prior_record and task.tdd_policy == "REQUIRED" else task.tdd_policy),
                    ),
                )
                future = executor.submit(
                    _execute_task,
                    task,
                    invocation,
                    worker_call,
                    store,
                )
                running[future] = task_number

            if not running:
                break

            completed, _ = wait(running, return_when=FIRST_COMPLETED)
            for future in sorted(completed, key=lambda item: running[item]):
                task_number = running.pop(future)
                result = future.result()
                results[task_number] = result
                statuses[task_number] = result.status
                try:
                    if result.status == "succeeded":
                        states.update(request.plan_id, tasks_by_number[task_number], "succeeded")
                    else:
                        states.update(request.plan_id, tasks_by_number[task_number], "failed", reason=result.message or "Worker 실행 실패")
                except StateRecordError as error:
                    result = replace(result, status="failed", message=f"상태 기록 저장 실패: {error}")
                    results[task_number] = result
                    statuses[task_number] = result.status

            _block_failed_descendants(tasks_by_number, statuses, results, states, request.plan_id)

            for task_number in sorted(tasks_by_number):
                if statuses[task_number] != "pending" or task_number in submitted:
                    continue
                task = tasks_by_number[task_number]
                if all(
                    statuses.get(prerequisite) == "succeeded"
                    for prerequisite in task.prerequisite_numbers
                ):
                    heapq.heappush(ready, task_number)
                    submitted.add(task_number)

    for task_number in sorted(tasks_by_number):
        if statuses[task_number] != "pending":
            continue
        task = tasks_by_number[task_number]
        results[task_number] = TaskResult(
            task_number=task.number,
            title=task.title,
            status="blocked",
            message="선행 Task 조건을 충족할 수 없어 차단되었습니다.",
        )
        try:
            states.update(request.plan_id, task, "blocked", reason=results[task_number].message)
        except StateRecordError:
            pass

    return ExecutionReport(
        tuple(results[number] for number in sorted(results))
    )
