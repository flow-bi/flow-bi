from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait

from ..models.result import TaskResult
from .execution_state import PlanExecutionState
from .task_runner import TaskRunner


def schedule_tasks(
    execution_state: PlanExecutionState,
    task_runner: TaskRunner,
    *,
    max_parallel_tasks: int = 4,
) -> None:
    """Run ready Tasks while preserving dependency and failure isolation rules."""
    task_number_by_future: dict[Future[TaskResult], int] = {}

    with ThreadPoolExecutor(max_workers=max_parallel_tasks) as worker_pool:
        while True:
            ready_task_numbers = execution_state.ready_task_numbers()
            available_slots = max_parallel_tasks - len(task_number_by_future)
            for task_number in ready_task_numbers[:available_slots]:
                task = execution_state.task_by_number[task_number]
                if not execution_state.mark_task_running(task):
                    continue
                future = worker_pool.submit(task_runner.run, task)
                task_number_by_future[future] = task.number

            if not task_number_by_future:
                if execution_state.ready_task_numbers():
                    continue
                break

            completed_futures, _ = wait(
                task_number_by_future,
                return_when=FIRST_COMPLETED,
            )
            for future in sorted(
                completed_futures,
                key=lambda item: task_number_by_future[item],
            ):
                task_number = task_number_by_future.pop(future)
                task = execution_state.task_by_number[task_number]
                try:
                    task_result = future.result()
                except Exception as error:
                    task_result = TaskResult(
                        task.number,
                        task.title,
                        "failed",
                        message=str(error),
                    )
                execution_state.record_task_result(task, task_result)

            execution_state.block_tasks_with_failed_prerequisites()
