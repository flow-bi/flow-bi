from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import replace
import heapq
from pathlib import Path
import subprocess

from .evidence import EvidenceRecordError, ExecutionRecordStore, revision_fingerprint
from .models import ExecutionReport, HarnessRequest, ParsedPlan, Task, TaskExecutionContext, TaskInvocation, TaskResult
from .scheduling import block_failed_dependents, enqueue_ready_tasks, ready_task_numbers, restore_succeeded_tasks
from .state import PlanStateStore, StateRecordError
from .worker_gateway import invoke_task
from .worker_result import completion_error, decision_correction, needs_decision_correction, return_code, task_result_from_worker


MAX_PARALLEL_TASKS = 4
WorkerInvoker = Callable[[TaskInvocation], object]


def _execute_task(task: Task, invocation: TaskInvocation, call_worker: WorkerInvoker, store: ExecutionRecordStore) -> TaskResult:
    status, code, timed_out, message, output = "succeeded", None, False, "", None
    try:
        result = call_worker(invocation)
        raw = getattr(result, "output", None)
        output = raw if isinstance(raw, dict) else None
        code = return_code(result)
        if code:
            status, message = "failed", f"Worker 종료 코드 {code}"
        else:
            message = completion_error(task, result)
            if message and needs_decision_correction(task, result):
                corrected = call_worker(decision_correction(invocation, result))
                code = return_code(corrected)
                if code:
                    status, message = "failed", "판정 교정 요청 Worker 호출이 실패했습니다."
                else:
                    message = completion_error(task, corrected)
                    if message:
                        status, message = "failed", f"판정 교정 후에도 완료 계약을 충족하지 않습니다: {message}"
                    else:
                        result, raw = corrected, getattr(corrected, "output", None)
                        output = raw if isinstance(raw, dict) else None
            if message:
                status = "failed"
            else:
                try:
                    store.save(invocation.execution_context.plan_id, task, invocation.execution_context.fingerprint, result.output)
                except (OSError, EvidenceRecordError) as error:
                    status, message = "failed", f"실행 기록 저장 실패: {error}"
    except subprocess.TimeoutExpired as error:
        status, code, timed_out, message = "failed", 124, True, str(error)
    except subprocess.CalledProcessError as error:
        status, code, message = "failed", error.returncode, str(error)
    except Exception as error:
        status, message = "failed", str(error)
    return task_result_from_worker(task, status, code, timed_out, message, output)


def _restore_from_evidence(plan: ParsedPlan, request: HarnessRequest, store: ExecutionRecordStore, states: PlanStateStore, statuses: dict[int, str], results: dict[int, TaskResult]) -> None:
    for task in plan.tasks:
        if task.number >= request.start_task_number:
            continue
        try:
            record = store.load(request.plan_id, task.number, revision_fingerprint(request.plan_id, task))
            detail = "현재 Task 계약과 일치하는 기록이 없습니다."
        except EvidenceRecordError as error:
            record, detail = None, str(error)
        if record is None:
            message = f"이전 PASS 실행 기록을 신뢰할 수 없습니다: {detail}"
            statuses[task.number] = "failed"
            results[task.number] = TaskResult(task.number, task.title, "failed", message=message)
            try:
                states.update(request.plan_id, task, "failed", reason=message)
            except StateRecordError as error:
                results[task.number] = replace(results[task.number], message=f"{message}; 상태 기록 저장 실패: {error}")
        else:
            statuses[task.number] = "succeeded"
            results[task.number] = TaskResult(task.number, task.title, "succeeded", message="이전 PASS 실행 기록을 검증해 선행 Task를 복원했습니다.", work_summary="이전 PASS 실행 기록을 재사용했습니다.", restored=True)


def execute_workers(plan: ParsedPlan, request: HarnessRequest, call_worker: WorkerInvoker = invoke_task, max_parallel_tasks: int = MAX_PARALLEL_TASKS, *, project_root: Path | None = None, record_store: ExecutionRecordStore | None = None, state_store: PlanStateStore | None = None) -> ExecutionReport:
    root = (project_root or Path.cwd()).resolve()
    store = record_store or ExecutionRecordStore(root / ".agents" / "skills" / "harness-exec" / "scripts" / "harness_runner" / ".execution-records")
    states = state_store or PlanStateStore(root / "docs" / "plans" / "state")
    tasks = {task.number: task for task in plan.tasks}
    statuses, results = {number: "pending" for number in tasks}, {}
    try:
        saved = states.load_task_records(request.plan_id, plan.tasks)
    except StateRecordError as error:
        task = plan.tasks[0]
        return ExecutionReport((TaskResult(task.number, task.title, "failed", message=f"상태 기록 읽기 실패: {error}"),))

    if request.start_task_number is None:
        restore_succeeded_tasks(plan.tasks, saved, statuses, results)
    else:
        _restore_from_evidence(plan, request, store, states, statuses, results)
        block_failed_dependents(tasks, statuses, results, states, request.plan_id)

    ready = ready_task_numbers(tasks, statuses)
    submitted, running = set(ready), {}
    with ThreadPoolExecutor(max_workers=max_parallel_tasks) as executor:
        while ready or running:
            while ready and len(running) < max_parallel_tasks:
                number = heapq.heappop(ready)
                task = tasks[number]
                statuses[number] = "running"
                try:
                    states.update(request.plan_id, task, "running")
                except StateRecordError as error:
                    result = TaskResult(number, task.title, "failed", message=f"상태 기록 저장 실패: {error}")
                    results[number], statuses[number] = result, result.status
                    block_failed_dependents(tasks, statuses, results, states, request.plan_id)
                    continue
                fingerprint = revision_fingerprint(request.plan_id, task)
                try:
                    prior = store.load(request.plan_id, number, fingerprint)
                except EvidenceRecordError as error:
                    result = TaskResult(number, task.title, "failed", message=f"HUMAN_REVIEW_REQUIRED: {error}")
                    results[number], statuses[number] = result, result.status
                    try:
                        states.update(request.plan_id, task, "failed", reason=result.message)
                    except StateRecordError:
                        pass
                    block_failed_dependents(tasks, statuses, results, states, request.plan_id)
                    continue
                context = TaskExecutionContext(request.plan_id, fingerprint, "rerun" if prior else "new_or_changed", prior["tdd_evidence"] if prior else None)
                invocation = TaskInvocation(plan.common_prompt, request.additional_request, task, context)
                running[executor.submit(_execute_task, task, invocation, call_worker, store)] = number
            if not running:
                break
            completed, _ = wait(running, return_when=FIRST_COMPLETED)
            for future in sorted(completed, key=lambda item: running[item]):
                number = running.pop(future)
                result = future.result()
                results[number], statuses[number] = result, result.status
                try:
                    states.update(request.plan_id, tasks[number], "succeeded" if result.status == "succeeded" else "failed", reason=None if result.status == "succeeded" else result.message or "Worker 실행 실패")
                except StateRecordError as error:
                    result = replace(result, status="failed", message=f"상태 기록 저장 실패: {error}")
                    results[number], statuses[number] = result, result.status
            block_failed_dependents(tasks, statuses, results, states, request.plan_id)
            enqueue_ready_tasks(ready, submitted, tasks, statuses)

    for number, task in tasks.items():
        if statuses[number] == "pending":
            message = "선행 Task 조건을 충족하지 못해 차단했습니다."
            results[number] = TaskResult(number, task.title, "blocked", message=message)
            try:
                states.update(request.plan_id, task, "blocked", reason=message)
            except StateRecordError:
                pass
    return ExecutionReport(tuple(results[number] for number in sorted(results)))
