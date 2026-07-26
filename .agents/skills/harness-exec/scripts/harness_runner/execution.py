from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
import heapq
import math
import subprocess

from .models import (
    ExecutionReport,
    HarnessRequest,
    ParsedPlan,
    Task,
    TaskInvocation,
    TaskResult,
)
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


def _return_code(result: object) -> int:
    if type(result) is int:
        return result
    return_code = getattr(result, "returncode", 0)
    return return_code if type(return_code) is int else 0


def _non_empty_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _completion_error(task: Task, worker_result: object) -> str:
    output = getattr(worker_result, "output", None)
    output_error = getattr(worker_result, "output_error", "")
    if not isinstance(output, dict):
        detail = output_error if _non_empty_text(output_error) else "JSON 객체 없음"
        return f"Worker 결과 JSON이 유효하지 않습니다: {detail}"

    if output.get("task_id") != f"Task {task.number}":
        return "Worker 결과의 Task ID가 일치하지 않습니다."

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

    remaining_issues = output.get("remaining_issues")
    if not isinstance(remaining_issues, list) or remaining_issues:
        return "남은 문제가 있어 완료할 수 없습니다."
    if output.get("decision") != "PASS":
        return "Worker 판정이 PASS가 아닙니다."

    quality_score = output.get("quality_score")
    if (
        not isinstance(quality_score, (int, float))
        or isinstance(quality_score, bool)
        or not math.isfinite(quality_score)
        or not 0 <= quality_score <= 100
        or task.minimum_quality_score is None
        or quality_score < task.minimum_quality_score
    ):
        return "quality_score가 Plan의 최소값보다 낮거나 유효하지 않습니다."
    return ""


def _execute_task(
    task: Task,
    invocation: TaskInvocation,
    call_worker: WorkerInvoker,
) -> TaskResult:
    status = "succeeded"
    return_code: int | None = None
    timed_out = False
    message = ""

    try:
        worker_result = call_worker(invocation)
        return_code = _return_code(worker_result)
        if return_code != 0:
            status = "failed"
        else:
            message = _completion_error(task, worker_result)
            if message:
                status = "failed"
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

    return TaskResult(
        task_number=task.number,
        title=task.title,
        status=status,
        return_code=return_code,
        timed_out=timed_out,
        message=message,
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
) -> ExecutionReport:
    
    if invoker is not None and call_worker is not None:
        raise ValueError("invoker와 call_worker 중 하나만 전달해야 합니다.")
    worker_call = call_worker if call_worker is not None else invoker
    if worker_call is None:
        worker_call = invoke_task

    tasks_by_number = {task.number: task for task in plan.tasks}
    statuses = {task.number: "pending" for task in plan.tasks}
    results: dict[int, TaskResult] = {}
    ready = [
        task.number
        for task in plan.tasks
        if not task.prerequisite_numbers
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
                invocation = TaskInvocation(
                    common_prompt=plan.common_prompt,
                    additional_request=request.additional_request,
                    task=task,
                )
                future = executor.submit(
                    _execute_task,
                    task,
                    invocation,
                    worker_call,
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
