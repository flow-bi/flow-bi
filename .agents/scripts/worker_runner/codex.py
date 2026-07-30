from __future__ import annotations

from pathlib import Path
import os
import shutil

from .config import read_config_overrides


# Codex 실행 기본 제한 시간 (30분)
DEFAULT_TIMEOUT_SECONDS = 30 * 60

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# 허용되는 Worker 목록
WORKERS = ("fe-worker", "be-worker")


# PATH에서 Codex 실행 파일 찾기
def resolve_codex_executable() -> str:
    for candidate in ("codex", "codex.cmd"):
        resolved = shutil.which(candidate)

        if resolved is not None:
            return resolved

    raise RuntimeError(
        "PATH에서 Codex CLI를 찾을 수 없습니다."
    )
# 기본 CODEX_HOME 경로 반환
def resolve_codex_home() -> Path:
    return Path.home() / ".codex"


# codex exec 명령어 생성
def build_codex_command(
    allowed_paths: tuple[str, ...],
    forbidden_paths: tuple[str, ...],
    output_path: Path,
    executable: str | None = None,
    readable_paths: tuple[str, ...] = (),
) -> list[str]:
    command = [executable or resolve_codex_executable(), "exec", "-o", str(output_path)]
    
    for override in read_config_overrides(
        allowed_paths,
        forbidden_paths,
        readable_paths=readable_paths,
    ):
        command.extend(["-c", override])
    
    command.append("-")
    return command

# Worker 실행에 필요한 환경변수 구성
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
        java_executable = java_home / "bin" / "java.exe"
        if not java_home.is_absolute() or not java_executable.is_file():
            raise RuntimeError(
                f"backend/.env.local JAVA_HOME is invalid: {java_home}"
            )
        return java_home

    return None


def build_subprocess_environment(
    run_id: str,
    base_environment: dict[str, str] | None = None,
    project_root: Path = PROJECT_ROOT,
) -> dict[str, str]:
    environment = (
        base_environment
        if base_environment is not None
        else os.environ
    ).copy()

    environment["CODEX_HOME"] = str(resolve_codex_home())
    gradle_user_home = project_root / "backend" / ".gradle-user-home"
    worker_temp = gradle_user_home / "tmp"
    worker_home = gradle_user_home / "worker-home"
    worker_temp.mkdir(parents=True, exist_ok=True)
    worker_home.mkdir(parents=True, exist_ok=True)

    environment["GRADLE_USER_HOME"] = str(gradle_user_home)
    environment["TEMP"] = str(worker_temp)
    environment["TMP"] = str(worker_temp)
    environment["JAVA_TOOL_OPTIONS"] = " ".join(
        part
        for part in (
            environment.get("JAVA_TOOL_OPTIONS", ""),
            f'-Duser.home="{worker_home}"',
        )
        if part
    )

    java_home = _read_project_java_home(
        project_root / "backend" / ".env.local"
    )
    if java_home is not None:
        java_bin = str(java_home / "bin")
        current_path = environment.get("PATH", "")
        path_entries = current_path.split(os.pathsep) if current_path else []
        environment["JAVA_HOME"] = str(java_home)
        environment["PATH"] = os.pathsep.join(
            [java_bin, *(entry for entry in path_entries if entry != java_bin)]
        )

    environment["FLOW_BI_RUN_ID"] = run_id
    environment.pop("FLOW_BI_WORKER", None)
    environment.pop("CODEX_PERMISSION_PROFILE", None)

    parent_session_id = environment.get("CODEX_THREAD_ID")
    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)
    return environment
