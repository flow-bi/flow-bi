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
    config_path: Path,
    output_path: Path,
    executable: str | None = None,
) -> list[str]:
    command = [executable or resolve_codex_executable(), "exec", "-o", str(output_path)]
    
    for override in read_config_overrides(config_path):
        command.extend(["-c", override])
    
    command.append("-")
    return command

# Worker 실행에 필요한 환경변수 구성
def build_subprocess_environment(
    worker: str,
    run_id: str,
    base_environment: dict[str, str] | None = None,
) -> dict[str, str]:
    environment = (
        base_environment
        if base_environment is not None
        else os.environ
    ).copy()

    environment["CODEX_HOME"] = str(resolve_codex_home())
    environment["FLOW_BI_RUN_ID"] = run_id
    
    if worker in WORKERS:
        environment["FLOW_BI_WORKER"] = worker
        environment["CODEX_PERMISSION_PROFILE"] = worker

    parent_session_id = environment.get("CODEX_THREAD_ID")
    if parent_session_id:
        environment["FLOW_BI_PARENT_SESSION_ID"] = parent_session_id
    else:
        environment.pop("FLOW_BI_PARENT_SESSION_ID", None)
    return environment
