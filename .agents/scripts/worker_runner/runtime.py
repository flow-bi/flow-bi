from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import subprocess
import uuid

from .codex_cli import resolve_codex_executable, resolve_codex_home
from .config import build_config_overrides, load_worker_config_template
from .environment import _read_project_java_home, build_task_environment, prepare_worker_base_environment
from .paths import PROJECT_ROOT, WorkerPaths, build_worker_paths
from .toolchain_paths import collect_worker_readable_paths
from .worker_process import SubprocessRunner, WorkerExecutionResult, WorkerLogger


DEFAULT_TIMEOUT_SECONDS = 30 * 60


def _validate_task_number(task_number: object) -> str:
    if isinstance(task_number, bool) or not isinstance(task_number, int) or task_number <= 0:
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
    worker_paths: WorkerPaths
    timeout: int = DEFAULT_TIMEOUT_SECONDS
    process_runner: SubprocessRunner = field(default=subprocess.run, repr=False, compare=False)
    logger: WorkerLogger | None = field(default=None, repr=False, compare=False)

    def bind_task(self, task_number: object, writable_paths: tuple[str, ...], read_only_paths: tuple[str, ...], verifier_environment: dict[str, str] | None = None) -> WorkerTaskRuntime:
        task_number_text = _validate_task_number(task_number)
        config_overrides = tuple(build_config_overrides(
            writable_paths, read_only_paths, self.toolchain_readable_paths,
            template=self.config_template,
        ))
        return WorkerTaskRuntime(self, task_number_text, tuple(writable_paths), tuple(read_only_paths), dict(verifier_environment or {}), config_overrides)


@dataclass(frozen=True)
class WorkerTaskRuntime:
    runtime: WorkerRuntime = field(repr=False)
    task_number: str
    writable_paths: tuple[str, ...]
    read_only_paths: tuple[str, ...]
    verifier_environment: dict[str, str] = field(repr=False)
    config_overrides: tuple[str, ...] = field(repr=False)

    def environment_for_run(self, run_id: str) -> dict[str, str]:
        return build_task_environment(self.runtime.base_environment, run_id=run_id, task_number=self.task_number, overrides=self.verifier_environment)

    def execute(self, prompt: str) -> WorkerExecutionResult:
        from .runner import execute_prepared_worker
        return execute_prepared_worker(prompt=prompt, task_runtime=self, run_id=str(uuid.uuid4()))


def prepare_worker_runtime(project_root: Path = PROJECT_ROOT, *, base_environment: dict[str, str] | None = None, timeout: int = DEFAULT_TIMEOUT_SECONDS, process_runner: SubprocessRunner = subprocess.run, logger: WorkerLogger | None = None, executable: str | None = None) -> WorkerRuntime:
    root = project_root.resolve()
    worker_paths = build_worker_paths(root)
    executable = executable or resolve_codex_executable()
    codex_home = resolve_codex_home()
    java_home = _read_project_java_home(worker_paths.java_env)
    environment = prepare_worker_base_environment(base_environment=base_environment, project_root=root, codex_home=codex_home, java_home=java_home)
    return WorkerRuntime(root, executable, codex_home, environment, load_worker_config_template(), collect_worker_readable_paths(environment, project_root=root), worker_paths, timeout, process_runner, logger)
