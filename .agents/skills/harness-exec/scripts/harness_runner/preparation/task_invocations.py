from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

from ..models.plan import Task
from ..paths import PROJECT_ROOT
from .environment import build_task_environment, build_worker_environment
from .permissions import build_config_overrides
from .toolchain import collect_toolchain_readable_paths

@dataclass(frozen=True)
class PreparedWorkerTask:
    """실행 계층에 전달할 Worker 입력만 보관한다."""

    task_number: int
    title: str
    task_prompt: str
    verification_items: tuple[str, ...]
    executable: str
    config_overrides: tuple[str, ...] = field(repr=False)
    environment: dict[str, str] = field(repr=False)

def prepare_task_invocations(
    tasks: Sequence[Task],
    *,
    executable: str,
    project_root: Path = PROJECT_ROOT,
) -> dict[int, PreparedWorkerTask]:
    """공통 실행 기반을 한 번 만들고 Task별 실행 입력을 준비한다."""
    root = project_root.resolve()

    environment = build_worker_environment(root)
    toolchain_readable_paths = collect_toolchain_readable_paths(
        environment,
        project_root=root,
    )

    return {
        task.number: PreparedWorkerTask(
            task_number=task.number,
            title=task.title,
            task_prompt=task.task_prompt,
            verification_items=task.verification_items,
            executable=executable,
            config_overrides=tuple(
                build_config_overrides(
                    task.allowed_paths,
                    task.read_only_paths,
                    toolchain_readable_paths,
                )
            ),
            environment=build_task_environment(
                environment,
                task_number=task.number,
                overrides={},
            ),
        )
        for task in tasks
    }
