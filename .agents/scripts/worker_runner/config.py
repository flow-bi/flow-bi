from __future__ import annotations

from pathlib import Path
import json
import re
import tomllib

# Worker의 config.toml 경로 반환
def resolve_config_path(
    skill_name: str,
    project_root: Path,
) -> Path:
    return (
        project_root
        / ".agents"
        / "skills"
        / skill_name
        / "config.toml"
    )

# TOML Key를 안전한 문자열로 변환
def format_toml_key(key: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key

    return json.dumps(key)

# Python 객체를 TOML 문자열로 변환
def format_toml_value(value: object) -> str:
    if isinstance(value, str):
        return json.dumps(value)

    if isinstance(value, bool):
        return str(value).lower()

    if isinstance(value, (int, float)):
        return repr(value)

    if isinstance(value, list):
        values = ", ".join(
            format_toml_value(item)
            for item in value
        )
        return f"[{values}]"

    if isinstance(value, dict):
        entries = (
            f"{format_toml_key(key)} = {format_toml_value(item)}"
            for key, item in value.items()
        )
        return "{ " + ", ".join(entries) + " }"

    raise TypeError(
        f"지원하지 않는 config.toml 값입니다: "
        f"{type(value).__name__}"
    )

# config.toml을 Codex의 -c 옵션 형식으로 변환
def read_config_overrides(
    config_path: Path,
) -> list[str]:
    with config_path.open("rb") as config_file:
        config = tomllib.load(config_file)

    return [
        f"{format_toml_key(key)}={format_toml_value(value)}"
        for key, value in config.items()
    ]