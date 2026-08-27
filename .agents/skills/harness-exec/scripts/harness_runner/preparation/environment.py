from __future__ import annotations

from pathlib import Path
import os
import sys

from ..planning.paths import PROJECT_ROOT
from .codex import resolve_codex_home
from .paths import build_worker_paths


_PROTECTED_ENVIRONMENT_KEYS = (
    "CODEX_HOME", "JAVA_HOME", "PATH", "TEMP", "TMP", "TMPDIR",
    "GRADLE_USER_HOME", "NPM_CONFIG_CACHE", "NPM_CONFIG_USERCONFIG",
    "NPM_CONFIG_UPDATE_NOTIFIER", "JAVA_TOOL_OPTIONS", "FLOW_BI_PYTHON_EXECUTABLE",
)


def _validate_legacy_task_number(task_number: object) -> str:
    if isinstance(task_number, bool) or not isinstance(task_number, int) or task_number <= 0:
        raise ValueError("Task number must be a positive integer.")
    return str(task_number)


def _read_project_java_home(env_path: Path) -> Path | None:
    """backend/.env.local 파일에서 JAVA_HOME을 읽고 검증한다."""

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


def build_subprocess_environment(
    run_id: str,
    task_number: object,
    base_environment: dict[str, str] | None = None,
    project_root: Path = PROJECT_ROOT,
) -> dict[str, str]:
    """Worker subprocess에 전달할 환경 변수를 구성한다."""

    task_number_text = _validate_legacy_task_number(task_number)

    # 부모 프로세스의 환경을 복사해 Worker 전용 환경을 구성한다.
    environment = (
        base_environment if base_environment is not None else os.environ
    ).copy()

    paths = build_worker_paths(project_root)

    # Codex 설정
    environment["CODEX_HOME"] = str(resolve_codex_home())

    # Worker 디렉터리 준비
    paths.worker_temp.mkdir(parents=True, exist_ok=True)
    paths.worker_home.mkdir(parents=True, exist_ok=True)
    paths.npm_cache.mkdir(parents=True, exist_ok=True)
    paths.npm_user_config.touch(exist_ok=True)

    # npm 설정
    environment["NPM_CONFIG_CACHE"] = str(paths.npm_cache)
    environment["NPM_CONFIG_USERCONFIG"] = str(paths.npm_user_config)
    environment["NPM_CONFIG_UPDATE_NOTIFIER"] = "false"

    # Gradle 및 임시 디렉터리 설정
    environment["GRADLE_USER_HOME"] = str(paths.gradle_user_home)
    environment["TEMP"] = str(paths.worker_temp)
    environment["TMP"] = str(paths.worker_temp)
    environment["TMPDIR"] = str(paths.worker_temp)

    # Java 사용자 홈 설정
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        part
        for part in (
            environment.get("JAVA_TOOL_OPTIONS", ""),
            f'-Duser.home="{paths.worker_home}"',
        )
        if part
    )

    # 프로젝트 JAVA_HOME 설정
    java_home = _read_project_java_home(paths.java_env)

    if java_home is not None:
        java_bin = str(java_home / "bin")
        path_entries = environment.get("PATH", "").split(os.pathsep)

        environment["JAVA_HOME"] = str(java_home)
        environment["PATH"] = os.pathsep.join(
            [
                java_bin,
                *(
                    entry
                    for entry in path_entries
                    if entry != java_bin
                ),
            ]
        )

    # Worker 실행 정보
    environment["FLOW_BI_RUN_ID"] = run_id
    environment["FLOW_BI_TASK_NUMBER"] = task_number_text
    environment["FLOW_BI_PYTHON_EXECUTABLE"] = sys.executable

    # 부모 Codex 세션 정보 전달
    parent_session_id = environment.get("CODEX_THREAD_ID")

    # Worker가 상속하지 않아야 하는 부모 환경 제거
    environment.pop("FLOW_BI_NOTION_PARENT", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)

    

    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)

    return environment


def prepare_worker_base_environment(
    *,
    base_environment: dict[str, str] | None = None,
    project_root: Path = PROJECT_ROOT,
    codex_home: Path | None = None,
    java_home: Path | None = None,
) -> dict[str, str]:
    """Prepare cohort-shared values without Task or attempt values."""
    environment = (base_environment if base_environment is not None else os.environ).copy()
    paths = build_worker_paths(project_root)
    environment["CODEX_HOME"] = str(codex_home or resolve_codex_home())
    paths.worker_temp.mkdir(parents=True, exist_ok=True)
    paths.worker_home.mkdir(parents=True, exist_ok=True)
    paths.npm_cache.mkdir(parents=True, exist_ok=True)
    paths.npm_user_config.touch(exist_ok=True)
    environment.update({
        "NPM_CONFIG_CACHE": str(paths.npm_cache), "NPM_CONFIG_USERCONFIG": str(paths.npm_user_config),
        "NPM_CONFIG_UPDATE_NOTIFIER": "false", "GRADLE_USER_HOME": str(paths.gradle_user_home),
        "TEMP": str(paths.worker_temp), "TMP": str(paths.worker_temp), "TMPDIR": str(paths.worker_temp),
        "FLOW_BI_PYTHON_EXECUTABLE": sys.executable,
    })
    environment["JAVA_TOOL_OPTIONS"] = " ".join(part for part in (environment.get("JAVA_TOOL_OPTIONS", ""), f'-Duser.home="{paths.worker_home}"') if part)
    if java_home is not None:
        java_bin = str(java_home / "bin")
        environment["JAVA_HOME"] = str(java_home)
        environment["PATH"] = os.pathsep.join([java_bin, *(entry for entry in environment.get("PATH", "").split(os.pathsep) if entry != java_bin)])
    parent_session_id = environment.get("CODEX_THREAD_ID")
    environment.pop("FLOW_BI_NOTION_PARENT", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)
    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)
    return environment


def build_task_environment(base_environment: dict[str, str], *, run_id: str, task_number: str, overrides: dict[str, str] | None = None) -> dict[str, str]:
    environment = base_environment.copy()
    protected = {key: environment.get(key) for key in _PROTECTED_ENVIRONMENT_KEYS}
    if overrides:
        environment.update(overrides)
    for key, value in protected.items():
        if value is None:
            environment.pop(key, None)
        else:
            environment[key] = value
    environment["FLOW_BI_RUN_ID"] = run_id
    environment["FLOW_BI_TASK_NUMBER"] = task_number
    return environment
