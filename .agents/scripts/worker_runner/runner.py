from __future__ import annotations

from pathlib import Path

from .codex_cli import build_codex_command
from .worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
    run_worker_process,
)


def execute_prepared_worker(
    *,
    prompt: str,
    run_id: str,
    executable: str,
    config_overrides: tuple[str, ...],
    environment: dict[str, str],
    project_root: Path,
    process_runner: SubprocessRunner,
    logger: WorkerLogger | None,
    timeout: int,
) -> WorkerExecutionResult:
    """Run one Task using already-prepared cohort and Task inputs."""

    def command_factory(output_path: Path) -> list[str]:
        return build_codex_command(
            output_path=output_path,
            executable=executable,
            config_overrides=config_overrides,
        )

    return run_worker_process(
        run_id=run_id,
        command_factory=command_factory,
        prompt=prompt,
        environment=environment,
        project_root=project_root,
        runner=process_runner,
        logger=logger,
        timeout=timeout,
    )
