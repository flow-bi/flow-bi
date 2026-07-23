from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
import heapq
from pathlib import Path
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


WorkerInvoker = Callable[[TaskInvocation], object]


def _return_code(result: object) -> int:
    if type(result) is int:
        return result
    return_code = getattr(result, "returncode", 0)
    return return_code if type(return_code) is int else 0


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
        return_code = _return_code(call_worker(invocation))
        if return_code != 0:
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
    plan_path: Path,
    project_root: Path,
    invoker: WorkerInvoker | None = None,
    max_parallel_tasks: int = 4,
    *,
    call_worker: WorkerInvoker | None = None,
) -> ExecutionReport:
    del plan_path, project_root
    if type(max_parallel_tasks) is not int or max_parallel_tasks < 1:
        raise ValueError(
            "max_parallel_tasks는 1 이상의 정수여야 합니다."
        )
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
