from __future__ import annotations

from pathlib import Path
import subprocess
import uuid

from .codex_cli import build_codex_command
from .paths import PROJECT_ROOT
from .worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
    run_worker_process,
)


def execute_prepared_worker(
    *,
    prompt: str,
    task_runtime: "WorkerTaskRuntime",
    run_id: str,
) -> WorkerExecutionResult:
    """Run one Task using already-prepared cohort and Task inputs."""
    runtime = task_runtime.runtime

    def command_factory(output_path: Path) -> list[str]:
        return build_codex_command(
            writable_paths=task_runtime.writable_paths,
            read_only_paths=task_runtime.read_only_paths,
            toolchain_readable_paths=runtime.toolchain_readable_paths,
            output_path=output_path,
            executable=runtime.executable,
            config_overrides=task_runtime.config_overrides,
        )

    return run_worker_process(
        run_id=run_id,
        command_factory=command_factory,
        prompt=prompt,
        environment=task_runtime.environment_for_run(run_id),
        project_root=runtime.project_root,
        runner=runtime.process_runner,
        logger=runtime.logger,
        timeout=runtime.timeout,
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

    run_id = str(uuid.uuid4())

    from .runtime import prepare_worker_runtime

    prepared_runtime = prepare_worker_runtime(
        project_root,
        base_environment=base_environment,
        timeout=timeout,
        process_runner=runner,
        logger=logger,
        executable=executable,
    )
    return execute_prepared_worker(
        prompt=prompt,
        task_runtime=prepared_runtime.bind_task(task_number, allowed_paths, read_only_paths),
        run_id=run_id,
    )
