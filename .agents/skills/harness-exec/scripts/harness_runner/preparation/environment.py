from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
import os
import shutil
import sys
import tempfile
import uuid

from ..paths import PROJECT_ROOT
from .codex import resolve_codex_home
from .paths import WorkerPaths, build_common_worker_paths


_PROTECTED_KEYS = frozenset(
    {
        "CODEX_HOME",
        "JAVA_HOME",
        "PATH",
        "PYTHONPATH",
        "TEMP",
        "TMP",
        "TMPDIR",
        "GRADLE_USER_HOME",
        "NPM_CONFIG_CACHE",
        "NPM_CONFIG_USERCONFIG",
        "NPM_CONFIG_UPDATE_NOTIFIER",
        "JAVA_TOOL_OPTIONS",
        "FLOW_BI_PYTHON_EXECUTABLE",
    }
)


def _prepend_worker_scripts_path(
    environment: dict[str, str],
    project_root: Path,
) -> None:
    """Make Worker-owned modules importable without changing the parent shell."""
    scripts_path = str((project_root / ".agents" / "scripts").resolve())
    scripts_identity = os.path.normcase(os.path.abspath(scripts_path))
    inherited_entries = environment.get("PYTHONPATH", "").split(os.pathsep)
    unique_entries: list[str] = []
    seen_entries = {scripts_identity}
    for entry in inherited_entries:
        if not entry:
            continue
        identity = os.path.normcase(os.path.abspath(entry))
        if identity not in seen_entries:
            seen_entries.add(identity)
            unique_entries.append(entry)
    environment["PYTHONPATH"] = os.pathsep.join((scripts_path, *unique_entries))


def _load_java_home(env_file: Path) -> Path | None:
    if not env_file.is_file():
        return None

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() != "JAVA_HOME":
            continue

        java_home = Path(value.strip().strip("\"'"))
        executable = java_home / "bin" / (
            "java.exe" if os.name == "nt" else "java"
        )
        if not java_home.is_absolute() or not executable.is_file():
            raise RuntimeError(
                f"backend/.env.local JAVA_HOME is invalid: {java_home}"
            )
        return java_home
    return None


def _prepare_worker_paths(paths: WorkerPaths) -> None:
    for directory in (paths.worker_temp, paths.worker_home, paths.npm_cache):
        directory.mkdir(parents=True, exist_ok=True)
    paths.npm_user_config.touch(exist_ok=True)


def _apply_java_environment(
    environment: dict[str, str],
    paths: WorkerPaths,
) -> None:
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        filter(
            None,
            (
                environment.get("JAVA_TOOL_OPTIONS"),
                f'-Duser.home="{paths.worker_home}"',
            ),
        )
    )

    java_home = _load_java_home(paths.java_env)
    if java_home is None:
        return

    java_bin = str(java_home / "bin")
    path_entries = environment.get("PATH", "").split(os.pathsep)
    environment["JAVA_HOME"] = str(java_home)
    environment["PATH"] = os.pathsep.join(
        [java_bin, *(entry for entry in path_entries if entry != java_bin)]
    )

def _apply_parent_session_environment(
    environment: dict[str, str],
) -> None:
    parent_session_id = environment.get("CODEX_THREAD_ID")

    environment.pop("FLOW_BI_NOTION_PARENT", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)

    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)


def build_worker_environment(
    project_root: Path = PROJECT_ROOT,
) -> dict[str, str]:
    """공통 Worker 프로세스 환경을 구성한다."""
    paths = build_common_worker_paths(project_root.resolve())

    _prepare_worker_paths(paths)

    environment = os.environ.copy()
    environment.update(
        {
            "CODEX_HOME": str(resolve_codex_home()),
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
    _prepend_worker_scripts_path(environment, project_root)
    _apply_java_environment(environment, paths)
    _apply_parent_session_environment(environment)

    return environment



def build_task_environment(
    base_environment: dict[str, str],
    *,
    task_number: int,
    overrides: dict[str, str],
) -> dict[str, str]:
    """보호된 공통 값을 유지하며 Task 환경을 준비한다."""
    environment = base_environment.copy()
    environment.update(
        (key, value)
        for key, value in overrides.items()
        if key not in _PROTECTED_KEYS
    )
    environment["FLOW_BI_TASK_NUMBER"] = str(task_number)
    return environment


@contextmanager
def prepare_run_environment(
    base_environment: dict[str, str],
) -> Generator[tuple[str, dict[str, str], Path], None, None]:
    """실행별 임시 환경을 준비하고 Worker 종료 후 정리한다."""
    run_id = str(uuid.uuid4())
    worker_temp = Path(tempfile.gettempdir()) / "flow-bi-harness-worker" / run_id
    worker_home = worker_temp / "worker-home"
    npm_cache = worker_temp / "npm-cache"
    worker_home.mkdir(parents=True, exist_ok=False)
    npm_cache.mkdir()
    npm_user_config = worker_home / ".npmrc"
    npm_user_config.touch()

    environment = base_environment.copy()
    environment.update(
        {
            "FLOW_BI_RUN_ID": run_id,
            "TEMP": str(worker_temp),
            "TMP": str(worker_temp),
            "TMPDIR": str(worker_temp),
            "NPM_CONFIG_CACHE": str(npm_cache),
            "NPM_CONFIG_USERCONFIG": str(npm_user_config),
        }
    )
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        filter(
            None,
            (
                environment.get("JAVA_TOOL_OPTIONS"),
                f'-Duser.home="{worker_home}"',
            ),
        )
    )
    try:
        yield run_id, environment, worker_temp
    finally:
        shutil.rmtree(worker_temp, ignore_errors=True)
        try:
            worker_temp.parent.rmdir()
        except OSError:
            pass
