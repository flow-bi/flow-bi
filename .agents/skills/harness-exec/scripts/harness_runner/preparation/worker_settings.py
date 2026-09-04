from __future__ import annotations

from collections.abc import Generator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path

from ..models.plan import Task
from ..paths import PROJECT_ROOT
from .environment import (
    build_task_environment,
    build_worker_environment,
    prepare_run_environment,
)
from .permissions import build_config_overrides
from .toolchain import collect_toolchain_readable_paths


@dataclass(frozen=True)
class TaskWorkerSettings:
    """Sandbox and environment settings prepared for one Task."""

    config_overrides: tuple[str, ...] = field(repr=False)
    environment: dict[str, str] = field(repr=False)
    writable_paths: tuple[str, ...] | None = field(default=None, repr=False)
    read_only_paths: tuple[str, ...] = field(default=(), repr=False)
    toolchain_readable_paths: tuple[str, ...] = field(default=(), repr=False)

    @contextmanager
    def prepare_run(
        self,
    ) -> Generator[tuple[str, dict[str, str], tuple[str, ...]], None, None]:
        with prepare_run_environment(self.environment) as (
            run_id,
            environment,
            worker_temp,
        ):
            config_overrides = self.config_overrides
            if self.writable_paths is not None:
                config_overrides = tuple(
                    build_config_overrides(
                        self.writable_paths,
                        self.read_only_paths,
                        self.toolchain_readable_paths,
                        writable_directories=(str(worker_temp),),
                    )
                )
            yield (
                run_id,
                environment,
                config_overrides,
            )


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
            writable_paths=task.allowed_paths,
            read_only_paths=task.read_only_paths,
            toolchain_readable_paths=toolchain_readable_paths,
        )
        for task in tasks
    }
