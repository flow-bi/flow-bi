from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import subprocess
import sys
import uuid


WORKER_SCRIPTS = Path(__file__).resolve().parents[5] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner import execute_prepared_worker
from worker_runner.worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
)

from ..planning.paths import PROJECT_ROOT
from .codex import resolve_codex_executable, resolve_codex_home
from .config import build_config_overrides, load_worker_config_template
from .environment import (
    _read_project_java_home,
    build_task_environment,
    prepare_worker_base_environment,
)
from .paths import build_worker_paths
from .toolchain import collect_worker_readable_paths


DEFAULT_TIMEOUT_SECONDS = 30 * 60


def _validate_task_number(task_number: object) -> str:
    if (
        isinstance(task_number, bool)
        or not isinstance(task_number, int)
        or task_number <= 0
    ):
        raise ValueError("Task number must be a positive integer.")
    return str(task_number)


@dataclass(frozen=True)
class WorkerRuntime:
    project_root: Path
    executable: str
    codex_home: Path
    base_environment: dict[str, str] = field(repr=False)
    config_template: dict[str, object] = field(repr=False)
    toolchain_readable_paths: tuple[str, ...]
    timeout: int = DEFAULT_TIMEOUT_SECONDS
    process_runner: SubprocessRunner = field(
        default=subprocess.run,
        repr=False,
        compare=False,
    )
    logger: WorkerLogger | None = field(default=None, repr=False, compare=False)

    def bind_task(
        self,
        task_number: object,
        writable_paths: tuple[str, ...],
        read_only_paths: tuple[str, ...],
        verifier_environment: dict[str, str] | None = None,
    ) -> WorkerTaskRuntime:
        task_number_text = _validate_task_number(task_number)
        config_overrides = tuple(
            build_config_overrides(
                writable_paths,
                read_only_paths,
                self.toolchain_readable_paths,
                template=self.config_template,
            )
        )
        return WorkerTaskRuntime(
            self,
            task_number_text,
            dict(verifier_environment or {}),
            config_overrides,
        )


@dataclass(frozen=True)
class WorkerTaskRuntime:
    runtime: WorkerRuntime = field(repr=False)
    task_number: str
    verifier_environment: dict[str, str] = field(repr=False)
    config_overrides: tuple[str, ...] = field(repr=False)

    def environment_for_run(self, run_id: str) -> dict[str, str]:
        return build_task_environment(
            self.runtime.base_environment,
            run_id=run_id,
            task_number=self.task_number,
            overrides=self.verifier_environment,
        )

    def execute(self, prompt: str) -> WorkerExecutionResult:
        runtime = self.runtime
        run_id = str(uuid.uuid4())
        return execute_prepared_worker(
            prompt=prompt,
            run_id=run_id,
            executable=runtime.executable,
            config_overrides=self.config_overrides,
            environment=self.environment_for_run(run_id),
            project_root=runtime.project_root,
            process_runner=runtime.process_runner,
            logger=runtime.logger,
            timeout=runtime.timeout,
        )


def prepare_worker_runtime(
    project_root: Path = PROJECT_ROOT,
    *,
    base_environment: dict[str, str] | None = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    process_runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    executable: str | None = None,
) -> WorkerRuntime:
    root = project_root.resolve()
    worker_paths = build_worker_paths(root)
    resolved_executable = executable or resolve_codex_executable()
    codex_home = resolve_codex_home()
    java_home = _read_project_java_home(worker_paths.java_env)
    environment = prepare_worker_base_environment(
        base_environment=base_environment,
        project_root=root,
        codex_home=codex_home,
        java_home=java_home,
    )
    return WorkerRuntime(
        project_root=root,
        executable=resolved_executable,
        codex_home=codex_home,
        base_environment=environment,
        config_template=load_worker_config_template(),
        toolchain_readable_paths=collect_worker_readable_paths(
            environment,
            project_root=root,
        ),
        timeout=timeout,
        process_runner=process_runner,
        logger=logger,
    )
