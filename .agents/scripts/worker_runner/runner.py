from __future__ import annotations

from pathlib import Path
import subprocess
import uuid

from .codex_cli import build_codex_command
from .worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
    run_worker_process,
)


def _execute_prepared_worker(
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


def execute_worker(
    *,
    prompt: str,
    executable: str,
    config_overrides: tuple[str, ...],
    environment: dict[str, str],
    project_root: Path,
    process_runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    timeout: int = 30 * 60,
) -> WorkerExecutionResult:
    """Harness 입력으로 하나의 Worker 실행 전체를 수행한다."""
    run_id = str(uuid.uuid4())
    execution_environment = environment.copy()
    execution_environment["FLOW_BI_RUN_ID"] = run_id

    return _execute_prepared_worker(
        prompt=prompt,
        run_id=run_id,
        executable=executable,
        config_overrides=config_overrides,
        environment=execution_environment,
        project_root=project_root,
        process_runner=process_runner,
        logger=logger,
        timeout=timeout,
    )
