from __future__ import annotations

from collections.abc import Callable, Sequence
from pathlib import Path
import subprocess

from .models import ExecutionReport, HarnessRequest, Task, WorkerFailure
from .worker_gateway import invoke_worker


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
            ]
        )
    return "\n".join(parts)


def _return_code(result: object) -> int:
    if isinstance(result, int):
        return result
    return_code = getattr(result, "returncode", 0)
    return return_code if isinstance(return_code, int) else 0


def execute_workers(
    tasks: Sequence[Task],
    request: HarnessRequest,
    plan_path: Path,
    project_root: Path,
    invoker: WorkerInvoker | None = None,
) -> ExecutionReport:
    call_worker = invoker or (
        lambda worker, prompt: invoke_worker(worker, prompt, project_root)
    )
    workers: list[str] = []
    failures: list[WorkerFailure] = []

    for worker in request.worker_order:
        worker_tasks = [task for task in tasks if task.worker == worker]
        if not worker_tasks:
            continue
        workers.append(worker)
        prompt = _build_worker_prompt(
            worker_tasks, plan_path, project_root, request.additional_request
        )
        try:
            result = call_worker(worker, prompt)
            return_code = _return_code(result)
            if return_code != 0:
                failures.append(WorkerFailure(worker, return_code=return_code))
        except subprocess.TimeoutExpired as error:
            failures.append(
                WorkerFailure(worker, return_code=124, timed_out=True, message=str(error))
            )
        except subprocess.CalledProcessError as error:
            failures.append(
                WorkerFailure(worker, return_code=error.returncode, message=str(error))
            )
        except Exception as error:
            failures.append(WorkerFailure(worker, message=str(error)))

    return ExecutionReport(tuple(workers), tuple(failures))
