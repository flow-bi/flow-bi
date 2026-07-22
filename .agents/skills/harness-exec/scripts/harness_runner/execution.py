from __future__ import annotations

from collections.abc import Callable, Sequence
from pathlib import Path
import subprocess

from .models import ExecutionReport, HarnessRequest, Task, WorkerFailure
from .worker_gateway import invoke_worker
from concurrent.futures import Future, ThreadPoolExecutor, as_completed


WorkerInvoker = Callable[[str, str], object]


def _display_design_docs(task: Task) -> str:
    return ", ".join(task.design_docs) if task.design_docs else "없음"


def _build_worker_prompt(
    tasks: Sequence[Task],
    plan_path: Path,
    project_root: Path,
    additional_request: str,
) -> str:
    relative_plan = plan_path.resolve().relative_to(project_root.resolve()).as_posix()
    parts = [
        "다음 active plan의 배정된 task를 문서 순서대로 모두 수행하세요.",
        f"plan 경로: {relative_plan}",
        f"추가 사용자 요청: {additional_request.strip() or '없음'}",
    ]
    for task in tasks:
        parts.extend(
            [
                "",
                f"## Task: {task.task_id}",
                f"- 작업 유형: {task.work_type}",
                f"- 관련 설계 문서: {_display_design_docs(task)}",
                "",
                task.body,
                "마지막에는 작업 내용과 작업 성공 여부 그리고 전체적인 리뷰를 같이 넣어서 정리 해서 메시지 남겨줘",
                "작업이 끝난다음에는 review subagent 실행해서 결과 알려줘"
            ]
        )
    return '\n'.join(parts)


def _return_code(result: object) -> int:
    if isinstance(result, int):
        return result
    return_code = getattr(result, "returncode", 0)
    return return_code if isinstance(return_code, int) else 0


def _execute_worker(
    worker: str,
    tasks: Sequence[Task],
    request: HarnessRequest,
    plan_path: Path,
    project_root: Path,
    call_worker: WorkerInvoker,
) -> WorkerFailure | None:
    worker_tasks = [
        task
        for task in tasks
        if task.worker == worker
    ]

    if not worker_tasks:
        return None

    prompt = _build_worker_prompt(
        worker_tasks,
        plan_path,
        project_root,
        request.additional_request,
    )

    try:
        result = call_worker(worker, prompt)
        return_code = _return_code(result)

        if return_code != 0:
            return WorkerFailure(
                worker,
                return_code=return_code,
            )

    except subprocess.TimeoutExpired as error:
        return WorkerFailure(
            worker,
            return_code=124,
            timed_out=True,
            message=str(error),
        )

    except subprocess.CalledProcessError as error:
        return WorkerFailure(
            worker,
            return_code=error.returncode,
            message=str(error),
        )

    except Exception as error:
        return WorkerFailure(
            worker,
            message=str(error),
        )

    return None

def _execute_workers_parallel(
    workers: Sequence[str],
    tasks: Sequence[Task],
    request: HarnessRequest,
    plan_path: Path,
    project_root: Path,
    call_worker: WorkerInvoker,
) -> tuple[WorkerFailure, ...]:
    failures: list[WorkerFailure] = []

    max_workers = len(workers)
    if max_workers == 0:
        return ()

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures: dict[Future[WorkerFailure | None], str] = {
            executor.submit(
                _execute_worker,
                worker,
                tasks,
                request,
                plan_path,
                project_root,
                call_worker,
            ): worker
            for worker in workers
        }

        for future in as_completed(futures):
            worker = futures[future]

            try:
                failure = future.result()
            except Exception as error:
                failure = WorkerFailure(
                    worker,
                    message=str(error),
                )

            if failure is not None:
                failures.append(failure)

    failure_by_worker = {
        failure.worker: failure
        for failure in failures
    }

    return tuple(
        failure_by_worker[worker]
        for worker in workers
        if worker in failure_by_worker
    )

def _execute_workers_sequentially(
    workers: Sequence[str],
    tasks: Sequence[Task],
    request: HarnessRequest,
    plan_path: Path,
    project_root: Path,
    call_worker: WorkerInvoker,
) -> tuple[WorkerFailure, ...]:
    failures: list[WorkerFailure] = []

    for worker in workers:
        failure = _execute_worker(
            worker,
            tasks,
            request,
            plan_path,
            project_root,
            call_worker,
        )

        if failure is not None:
            failures.append(failure)

    return tuple(failures)

def execute_workers(
    tasks: Sequence[Task],
    request: HarnessRequest,
    plan_path: Path,
    project_root: Path,
    invoker: WorkerInvoker | None = None,
) -> ExecutionReport:
    call_worker = invoker or (
        lambda worker, prompt: invoke_worker(
            worker,
            prompt,
            project_root,
        )
    )

    workers = tuple(
        worker
        for worker in request.worker_order
        if any(task.worker == worker for task in tasks)
    )

    if request.parallel:
        failures = _execute_workers_parallel(
            workers,
            tasks,
            request,
            plan_path,
            project_root,
            call_worker,
        )
    else:
        failures = _execute_workers_sequentially(
            workers,
            tasks,
            request,
            plan_path,
            project_root,
            call_worker,
        )

    return ExecutionReport(
        workers,
        failures,
    )