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
)
from .evidence import EvidenceRecordError, ExecutionRecordStore, revision_fingerprint
from .worker_gateway import invoke_task

MAX_PARALLEL_TASKS = 4

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

# Worker가 제출한 JSON 결과 중 판정을 제외한 객관적 완료 조건을 검증한다.
def _objective_completion_error(task: Task, worker_result: object) -> str:
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
        if gate_name == "tdd" and result == "N/A":
            if not _non_empty_text(gate.get("reason")):
                return "TDD N/A에는 사유가 필요합니다."
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
def _completion_error(task: Task, worker_result: object) -> str:
    objective_error = _objective_completion_error(task, worker_result)
    if objective_error:
        return objective_error

    decision = worker_result.output.get("decision")
    if decision != "PASS":
        return f"Worker 판정이 PASS가 아닙니다: {decision!r}."
    if worker_result.output.get("final_status") != "PASS":
        return "Worker final_status가 PASS가 아닙니다."
    return ""


def _needs_decision_correction(task: Task, worker_result: object) -> bool:
    if _objective_completion_error(task, worker_result):
        return False
    output = getattr(worker_result, "output", None)
    decision = output.get("decision") if isinstance(output, dict) else None
    return decision != "PASS" and decision not in EXPLICIT_FAILURE_DECISIONS


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

    try:
        worker_result = call_worker(invocation)
        raw_output = getattr(worker_result, "output", None)
        worker_output = raw_output if isinstance(raw_output, dict) else None
        return_code = _return_code(worker_result)
        if return_code != 0:
            status = "failed"
            message = f"Worker 종료 코드 {return_code}"
        else:
            message = _completion_error(task, worker_result)
            if message and _needs_decision_correction(task, worker_result):
                corrected_result = call_worker(_decision_correction(invocation, worker_result))
                corrected_return_code = _return_code(corrected_result)
                if corrected_return_code != 0:
                    status = "failed"
                    return_code = corrected_return_code
                    message = "판정 교정 요청 Worker 호출이 실패했습니다."
                else:
                    corrected_message = _completion_error(task, corrected_result)
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
    )


def _block_failed_descendants(
    tasks_by_number: dict[int, Task],
    statuses: dict[int, str],
    results: dict[int, TaskResult],
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

    tasks_by_number = {task.number: task for task in plan.tasks}
    if (
        request.start_task_number is not None
        and request.start_task_number not in tasks_by_number
    ):
        raise ValueError(
            f"시작 Task가 Plan에 없습니다: Task {request.start_task_number}"
        )
    statuses = {task.number: "pending" for task in plan.tasks}
    results: dict[int, TaskResult] = {}

    prior_task_numbers = {
        task.number
        for task in plan.tasks
        if request.start_task_number is not None
        and task.number < request.start_task_number
    }
    for task_number in sorted(prior_task_numbers):
        task = tasks_by_number[task_number]
        fingerprint = revision_fingerprint(
            root, request.plan_id, task, plan.common_prompt
        )
        try:
            prior_record = store.load(request.plan_id, task.number, fingerprint)
        except EvidenceRecordError as error:
            prior_record = None
            message = f"HUMAN_REVIEW_REQUIRED: {error}"
        else:
            message = ""

        if prior_record is None:
            statuses[task_number] = "failed"
            results[task_number] = TaskResult(
                task.number,
                task.title,
                "failed",
                message=message or "신뢰할 수 있는 이전 PASS 실행 기록이 없습니다.",
            )
            continue

        statuses[task_number] = "succeeded"
        results[task_number] = TaskResult(
            task.number,
            task.title,
            "succeeded",
            work_summary=(
                "검증된 이전 PASS 실행 기록을 재사용해 Worker와 검증을 "
                "다시 실행하지 않았습니다."
            ),
            verification=tuple(
                VerificationResult(
                    str(item["item"]),
                    str(item["result"]),
                    str(item["evidence"]),
                )
                for item in prior_record["verification"]
            ),
            quality_score=prior_record["quality_score"],
            final_status="PASS",
        )

    _block_failed_descendants(tasks_by_number, statuses, results)
    ready = [
        task.number
        for task in plan.tasks
        if statuses[task.number] == "pending"
        and all(
            statuses.get(prerequisite) == "succeeded"
            for prerequisite in task.prerequisite_numbers
        )
    ]
    heapq.heapify(ready)
    submitted = set(ready) | prior_task_numbers
    running: dict[Future[TaskResult], int] = {}

    with ThreadPoolExecutor(max_workers=max_parallel_tasks) as executor:
        while ready or running:
            while ready and len(running) < max_parallel_tasks:
                task_number = heapq.heappop(ready)
                task = tasks_by_number[task_number]
                statuses[task_number] = "running"
                fingerprint = revision_fingerprint(root, request.plan_id, task, plan.common_prompt)
                try:
                    prior_record = store.load(request.plan_id, task.number, fingerprint)
                except EvidenceRecordError as error:
                    result = TaskResult(task.number, task.title, "failed", message=f"HUMAN_REVIEW_REQUIRED: {error}")
                    results[task_number] = result
                    statuses[task_number] = result.status
                    _block_failed_descendants(tasks_by_number, statuses, results)
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

            _block_failed_descendants(tasks_by_number, statuses, results)

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

    return ExecutionReport(
        tuple(results[number] for number in sorted(results))
    )
