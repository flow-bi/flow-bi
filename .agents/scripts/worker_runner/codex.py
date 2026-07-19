from __future__ import annotations

from pathlib import Path
import json
import os
import re
import shutil
import tomllib


# Codex 실행 기본 제한 시간 (30분)
DEFAULT_TIMEOUT_SECONDS = 30 * 60

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# 허용되는 Worker 목록
WORKERS = ("fe-worker", "be-worker")


# Worker의 config.toml 경로 반환
def resolve_config_path(skill_name: str, project_root: Path = PROJECT_ROOT) -> Path:
    return project_root / ".agents" / "skills" / skill_name / "config.toml"

# PATH에서 Codex 실행 파일 찾기
def resolve_codex_executable() -> str:
    for candidate in ("codex", "codex.cmd"):
        if resolved := shutil.which(candidate):
            return resolved
    raise RuntimeError("PATH에서 Codex CLI를 찾을 수 없습니다.")

# 기본 CODEX_HOME 경로 반환
def resolve_codex_home() -> Path:
    return Path.home() / ".codex"

# TOML Key를 안전한 문자열로 변환
def format_toml_key(key: str) -> str:
    return key if re.fullmatch(r"[A-Za-z0-9_-]+", key) else json.dumps(key)

# Python 객체를 TOML 문자열로 변환
def format_toml_value(value: object) -> str:
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, list):
        return "[" + ", ".join(format_toml_value(item) for item in value) + "]"
    if isinstance(value, dict):
        entries = (
            f"{format_toml_key(key)} = {format_toml_value(item)}"
            for key, item in value.items()
        )
        return "{ " + ", ".join(entries) + " }"
    raise TypeError(f"Unsupported config.toml value: {type(value).__name__}")

# config.toml을 Codex의 -c 옵션 형식으로 변환
def read_config_overrides(config_path: Path) -> list[str]:
    with config_path.open("rb") as config_file:
        config = tomllib.load(config_file)
    return [
        f"{format_toml_key(key)}={format_toml_value(value)}"
        for key, value in config.items()
    ]

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
    environment = (base_environment or os.environ).copy()
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
