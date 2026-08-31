from __future__ import annotations

from collections.abc import Mapping
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass
import heapq
from pathlib import Path

from worker_runner import WorkerExecutor

from ..models.invocation import HarnessRequest
from ..models.plan import ParsedPlan, Task
from ..models.result import ExecutionReport, TaskResult
from ..preparation.task_invocations import PreparedWorkerTask
from ..results.evidence import EvidenceRecordError, ExecutionRecordStore
from ..results.state import PlanStateStore, StateRecordError
from .scheduling import build_task_graph, enqueue_ready_tasks, ready_task_numbers
from .task_executor import execute_task
from .task_invocation import prepare_task_invocation
from .task_state import ExecutionTaskState


MAX_PARALLEL_TASKS = 4


@dataclass(frozen=True)
class ExecutionDependencies:
    plan: ParsedPlan
    request: HarnessRequest
    prepared_workers: Mapping[int, PreparedWorkerTask]
    record_store: ExecutionRecordStore
    worker_executor: WorkerExecutor


def _validate_prepared_workers(
    tasks: Mapping[int, Task],
    prepared_workers: Mapping[int, PreparedWorkerTask],
) -> None:
    missing = tuple(number for number in tasks if number not in prepared_workers)
    if missing:
        raise ValueError(f"Prepared Workers are missing for Tasks: {missing}")


def _submit_task(
    executor: ThreadPoolExecutor,
    task: Task,
    dependencies: ExecutionDependencies,
    state: ExecutionTaskState,
) -> Future[TaskResult] | None:
    """실행 가능한 Task 하나를 검증하고 Worker pool에 제출한다."""
    if not state.start(task):
        return None

    try:
        invocation = prepare_task_invocation(
            dependencies.plan,
            dependencies.request,
            task,
            dependencies.record_store,
        )
    except EvidenceRecordError as error:
        state.fail(task, f"HUMAN_REVIEW_REQUIRED: {error}")
        state.block_failed_dependents()
        return None

    return executor.submit(
        execute_task,
        task,
        invocation,
        dependencies.prepared_workers[task.number],
        dependencies.record_store,
        dependencies.worker_executor,
    )


def _completed_task_result(
    future: Future[TaskResult],
    task: Task,
) -> TaskResult:
    """Worker future의 예외를 Task 실패 결과로 정규화한다."""
    try:
        return future.result()
    except Exception as error:
        return TaskResult(task.number, task.title, "failed", message=str(error))


def _run_scheduled_tasks(
    dependencies: ExecutionDependencies,
    state: ExecutionTaskState,
    max_parallel_tasks: int,
) -> None:
    """의존성이 충족된 Task를 제한된 병렬도로 스케줄링한다."""
    tasks = state.graph.tasks
    ready = ready_task_numbers(tasks, state.statuses)
    submitted = set(ready)
    running: dict[Future[TaskResult], int] = {}

    with ThreadPoolExecutor(max_workers=max_parallel_tasks) as executor:
        while ready or running:
            while ready and len(running) < max_parallel_tasks:
                number = heapq.heappop(ready)
                future = _submit_task(
                    executor,
                    tasks[number],
                    dependencies,
                    state,
                )
                if future is not None:
                    running[future] = number

            if not running:
                break

            completed, _ = wait(running, return_when=FIRST_COMPLETED)
            for future in sorted(completed, key=lambda item: running[item]):
                number = running.pop(future)
                task = tasks[number]
                state.complete(task, _completed_task_result(future, task))

            state.block_failed_dependents()
            enqueue_ready_tasks(ready, submitted, tasks, state.statuses)


def _state_read_failure(
    plan: ParsedPlan,
    error: StateRecordError,
) -> ExecutionReport:
    task = plan.tasks[0]
    result = TaskResult(
        task.number,
        task.title,
        "failed",
        message=f"상태 기록 읽기 실패: {error}",
    )
    return ExecutionReport((result,))


def execute_workers(
    plan: ParsedPlan,
    request: HarnessRequest,
    prepared_workers: Mapping[int, PreparedWorkerTask],
    max_parallel_tasks: int = MAX_PARALLEL_TASKS,
    *,
    worker_executor: WorkerExecutor,
    project_root: Path,
    record_store: ExecutionRecordStore | None = None,
    state_store: PlanStateStore | None = None,
) -> ExecutionReport:
    """Worker 실행 의존성을 준비하고 Task 스케줄링을 시작한다."""
    root = project_root.resolve()
    records = record_store or ExecutionRecordStore(
        root
        / ".agents"
        / "skills"
        / "harness-exec"
        / "scripts"
        / "harness_runner"
        / ".execution-records"
    )
    states = state_store or PlanStateStore(root / "docs" / "plans" / "state")
    graph = build_task_graph(plan.tasks)
    _validate_prepared_workers(graph.tasks, prepared_workers)

    try:
        state = ExecutionTaskState.restore(
            plan,
            request,
            graph,
            records,
            states,
        )
    except StateRecordError as error:
        return _state_read_failure(plan, error)

    dependencies = ExecutionDependencies(
        plan,
        request,
        prepared_workers,
        records,
        worker_executor,
    )
    _run_scheduled_tasks(dependencies, state, max_parallel_tasks)
    state.block_pending_tasks()
    return state.report()
