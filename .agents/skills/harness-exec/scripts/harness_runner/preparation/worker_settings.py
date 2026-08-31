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
class TaskWorkerSettings:
    """Sandbox and environment settings prepared for one Task."""

    config_overrides: tuple[str, ...] = field(repr=False)
    environment: dict[str, str] = field(repr=False)


def prepare_task_worker_settings(
    tasks: Sequence[Task],
    *,
    project_root: Path = PROJECT_ROOT,
) -> dict[int, TaskWorkerSettings]:
    root = project_root.resolve()
    environment = build_worker_environment(root)
    toolchain_readable_paths = collect_toolchain_readable_paths(
        environment,
        project_root=root,
    )
    return {
        task.number: TaskWorkerSettings(
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
