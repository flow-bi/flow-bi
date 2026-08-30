from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import os
import sys

from ..models import Task
from ..planning.paths import PROJECT_ROOT
from .codex import resolve_codex_executable, resolve_codex_home
from .paths import WorkerPaths, build_worker_paths
from .toolchain import collect_worker_readable_paths

from worker_runner.backend_verifier import BackendVerifier
from worker_runner.frontend_verifier import FrontendVerifier

_PROTECTED_ENVIRONMENT_KEYS = (
    "CODEX_HOME",
    "JAVA_HOME",
    "PATH",
    "TEMP",
    "TMP",
    "TMPDIR",
    "GRADLE_USER_HOME",
    "NPM_CONFIG_CACHE",
    "NPM_CONFIG_USERCONFIG",
    "NPM_CONFIG_UPDATE_NOTIFIER",
    "JAVA_TOOL_OPTIONS",
    "FLOW_BI_PYTHON_EXECUTABLE",
)


@dataclass(frozen=True)
class PreparedWorkerEnvironment:
    executable: str
    process_environment: dict[str, str] = field(repr=False)
    toolchain_readable_paths: tuple[str, ...]


def _load_project_java_home(env_path: Path) -> Path | None:
    """Load and validate JAVA_HOME from backend/.env.local."""
    if not env_path.is_file():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        if key.strip() != "JAVA_HOME":
            continue

        java_home = Path(value.strip().strip("\"'"))
        java_executable_name = "java.exe" if os.name == "nt" else "java"
        java_executable = java_home / "bin" / java_executable_name
        if not java_home.is_absolute() or not java_executable.is_file():
            raise RuntimeError(
                f"backend/.env.local JAVA_HOME is invalid: {java_home}"
            )
        return java_home

    return None


def _create_worker_directories(paths: WorkerPaths) -> None:
    paths.worker_temp.mkdir(parents=True, exist_ok=True)
    paths.worker_home.mkdir(parents=True, exist_ok=True)
    paths.npm_cache.mkdir(parents=True, exist_ok=True)
    paths.npm_user_config.touch(exist_ok=True)


def _configure_java_environment(
    environment: dict[str, str],
    paths: WorkerPaths,
) -> None:
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        part
        for part in (
            environment.get("JAVA_TOOL_OPTIONS", ""),
            f'-Duser.home="{paths.worker_home}"',
        )
        if part
    )

    java_home = _load_project_java_home(paths.java_env)
    if java_home is None:
        return

    java_bin = str(java_home / "bin")
    environment["JAVA_HOME"] = str(java_home)
    environment["PATH"] = os.pathsep.join(
        [
            java_bin,
            *(
                entry
                for entry in environment.get("PATH", "").split(os.pathsep)
                if entry != java_bin
            ),
        ]
    )


def _apply_parent_session_context(environment: dict[str, str]) -> None:
    parent_session_id = environment.get("CODEX_THREAD_ID")
    environment.pop("FLOW_BI_NOTION_PARENT", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)

    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)


def _build_shared_worker_environment(
    *,
    project_root: Path,
    codex_home: Path,
) -> dict[str, str]:
    environment = os.environ.copy()
    paths = build_worker_paths(project_root)

    _create_worker_directories(paths)
    environment.update(
        {
            "CODEX_HOME": str(codex_home),
            "NPM_CONFIG_CACHE": str(paths.npm_cache),
            "NPM_CONFIG_USERCONFIG": str(paths.npm_user_config),
            "NPM_CONFIG_UPDATE_NOTIFIER": "false",
            "GRADLE_USER_HOME": str(paths.gradle_user_home),
            "TEMP": str(paths.worker_temp),
            "TMP": str(paths.worker_temp),
            "TMPDIR": str(paths.worker_temp),
            "FLOW_BI_PYTHON_EXECUTABLE": sys.executable,
        }
    )
    _configure_java_environment(environment, paths)
    _apply_parent_session_context(environment)
    return environment

# 프로젝트 공통 환경 준비!
def prepare_common_worker_environment(
    *,
    project_root: Path = PROJECT_ROOT,
) -> PreparedWorkerEnvironment:
    """Prepare every machine-level input shared by Worker Tasks."""
    root = project_root.resolve()
    codex_home = resolve_codex_home()
    process_environment = _build_shared_worker_environment(
        project_root=root,
        codex_home=codex_home,
    )
    return PreparedWorkerEnvironment(
        executable= resolve_codex_executable(),
        process_environment=process_environment,
        toolchain_readable_paths=collect_worker_readable_paths(
            process_environment,
            project_root=root,
        ),
    )

# Task, 실행 별 환경 추가
def build_worker_task_environment(
    shared_environment: dict[str, str],
    *,
    run_id: str,
    task_number: str,
    overrides: dict[str, str] | None = None,
) -> dict[str, str]:
    """Add Task-specific values without allowing shared settings to be replaced."""
    environment = shared_environment.copy()
    protected_values = {
        key: environment.get(key) for key in _PROTECTED_ENVIRONMENT_KEYS
    }

    if overrides:
        environment.update(overrides)

    for key, value in protected_values.items():
        if value is None:
            environment.pop(key, None)
        else:
            environment[key] = value

    environment["FLOW_BI_RUN_ID"] = run_id
    environment["FLOW_BI_TASK_NUMBER"] = task_number
    return environment


def _uses_frontend(allowed_paths: tuple[str, ...]) -> bool:
    return any(
        path == "frontend" or path.startswith("frontend/")
        for path in allowed_paths
    )


def build_task_verifier_environment(
    task: Task,
    *,
    backend_verifier: BackendVerifier,
    frontend_verifier: FrontendVerifier,
) -> dict[str, str]:
    backend_environment = backend_verifier.environment_for_task(
        task.allowed_paths,
        task.read_only_paths,
    )

    frontend_environment = (
        frontend_verifier.environment
        if _uses_frontend(task.allowed_paths)
        else {}
    )

    return {
        **backend_environment,
        **frontend_environment,
    }
