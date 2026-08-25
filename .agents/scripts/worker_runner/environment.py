from __future__ import annotations

from pathlib import Path
import os
import sys

from .codex_cli import resolve_codex_home


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _read_project_java_home(env_path: Path) -> Path | None:
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


def validate_task_number(task_number: object) -> str:
    """Return a positive integer task number formatted for the Worker."""

    if (
        isinstance(task_number, bool)
        or not isinstance(task_number, int)
        or task_number <= 0
    ):
        raise ValueError("Task number must be a positive integer.")
    return str(task_number)


def build_subprocess_environment(
    run_id: str,
    task_number: object,
    base_environment: dict[str, str] | None = None,
    project_root: Path = PROJECT_ROOT,
) -> dict[str, str]:
    """Build the isolated environment passed to a Worker subprocess."""

    task_number_text = validate_task_number(task_number)
    environment = (
        base_environment if base_environment is not None else os.environ
    ).copy()

    environment["CODEX_HOME"] = str(resolve_codex_home())

    gradle_user_home = project_root / "backend" / ".gradle-user-home"
    worker_temp = gradle_user_home / "tmp"
    worker_home = gradle_user_home / "worker-home"
    worker_temp.mkdir(parents=True, exist_ok=True)
    worker_home.mkdir(parents=True, exist_ok=True)

    npm_cache = worker_temp / "npm-cache"
    npm_user_config = worker_home / ".npmrc"
    npm_cache.mkdir(parents=True, exist_ok=True)
    npm_user_config.touch(exist_ok=True)

    environment["NPM_CONFIG_CACHE"] = str(npm_cache)
    environment["NPM_CONFIG_USERCONFIG"] = str(npm_user_config)
    environment["NPM_CONFIG_UPDATE_NOTIFIER"] = "false"
    environment["GRADLE_USER_HOME"] = str(gradle_user_home)
    environment["TEMP"] = str(worker_temp)
    environment["TMP"] = str(worker_temp)
    environment["TMPDIR"] = str(worker_temp)
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        part
        for part in (
            environment.get("JAVA_TOOL_OPTIONS", ""),
            f'-Duser.home="{worker_home}"',
        )
        if part
    )

    java_home = _read_project_java_home(project_root / "backend" / ".env.local")
    if java_home is not None:
        java_bin = str(java_home / "bin")
        path_entries = environment.get("PATH", "").split(os.pathsep)
        environment["JAVA_HOME"] = str(java_home)
        environment["PATH"] = os.pathsep.join(
            [java_bin, *(entry for entry in path_entries if entry != java_bin)]
        )

    environment["FLOW_BI_RUN_ID"] = run_id
    environment["FLOW_BI_TASK_NUMBER"] = task_number_text
    environment["FLOW_BI_PYTHON_EXECUTABLE"] = sys.executable
    environment.pop("FLOW_BI_NOTION_PARENT", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)

    parent_session_id = environment.get("CODEX_THREAD_ID")
    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)
    return environment
