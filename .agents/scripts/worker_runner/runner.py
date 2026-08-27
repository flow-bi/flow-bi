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
