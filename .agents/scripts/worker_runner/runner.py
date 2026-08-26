from __future__ import annotations

from pathlib import Path
import subprocess
import uuid

from .codex_cli import build_codex_command
from .environment import build_subprocess_environment
from .paths import PROJECT_ROOT
from .toolchain_paths import collect_worker_readable_paths
from .valids import validate_task_number
from .worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
    run_worker_process,
)


DEFAULT_TIMEOUT_SECONDS = 30 * 60


def execute_worker(
    prompt: str,
    allowed_paths: tuple[str, ...],
    read_only_paths: tuple[str, ...],
    task_number: object,
    project_root: Path = PROJECT_ROOT,
    executable: str | None = None,
    base_environment: dict[str, str] | None = None,
    runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> WorkerExecutionResult:
    """Coordinate Worker setup, command construction, and process execution."""

    validate_task_number(task_number)
    run_id = str(uuid.uuid4())

    environment = build_subprocess_environment(
        run_id,
        task_number=task_number,
        base_environment=base_environment,
        project_root=project_root,
    )

    toolchain_readable_paths = collect_worker_readable_paths(
        environment,
        project_root=project_root,
    )

    def command_factory(output_path: Path) -> list[str]:
        return build_codex_command(
            writable_paths=allowed_paths,
            read_only_paths=read_only_paths,
            output_path=output_path,
            executable=executable,
            toolchain_readable_paths=toolchain_readable_paths,
        )

    return run_worker_process(
        run_id=run_id,
        command_factory=command_factory,
        prompt=prompt,
        environment=environment,
        project_root=project_root,
        runner=runner,
        logger=logger,
        timeout=timeout,
    )
