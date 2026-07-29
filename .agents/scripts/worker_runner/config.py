from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
import json
import re
import tomllib


CONFIG_PATH = Path(__file__).with_name("config.toml")


class WorkerConfigError(RuntimeError):
    """Worker runner 공통 설정을 사용할 수 없을 때 발생한다."""


# 기존 package API 호환을 위해 유지한다.
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


def load_config(
    allowed_paths: Iterable[str],
    forbidden_paths: Iterable[str],
    config_path: Path | None = None,
) -> dict[str, object]:
    """공통 설정을 읽고 실행별 경로 권한을 병합한다."""

    path = config_path or CONFIG_PATH

    try:
        with path.open("rb") as config_file:
            config = tomllib.load(config_file)
    except FileNotFoundError as error:
        raise WorkerConfigError(
            f"Worker runner config file does not exist: {path}"
        ) from error
    except tomllib.TOMLDecodeError as error:
        raise WorkerConfigError(
            f"Worker runner config file is invalid TOML: {path}: {error}"
        ) from error

    profile_name = config.get("default_permissions")
    permissions = config.get("permissions")
    profile = (
        permissions.get(profile_name)
        if isinstance(profile_name, str) and isinstance(permissions, dict)
        else None
    )

    if not isinstance(profile, dict):
        raise WorkerConfigError(
            "Worker runner config has no permission profile for "
            f"default_permissions={profile_name!r}: {path}"
        )

    filesystem = profile.setdefault("filesystem", {})
    if not isinstance(filesystem, dict):
        raise WorkerConfigError(
            f"Permission profile {profile_name!r} has an invalid filesystem "
            f"table: {path}"
        )

    workspace_roots = filesystem.setdefault(":workspace_roots", {})
    if not isinstance(workspace_roots, dict):
        raise WorkerConfigError(
            f"Permission profile {profile_name!r} has an invalid "
            f'filesystem.":workspace_roots" table: {path}'
        )

    for allowed_path in allowed_paths:
        workspace_roots[allowed_path] = "write"

    # 같은 경로가 양쪽에 있으면 deny가 우선한다.
    for forbidden_path in forbidden_paths:
        workspace_roots[forbidden_path] = "deny"

    return config


# config.toml을 Codex의 -c 옵션 형식으로 변환
def read_config_overrides(
    allowed_paths: Iterable[str],
    forbidden_paths: Iterable[str],
    config_path: Path | None = None,
) -> list[str]:
    config = load_config(allowed_paths, forbidden_paths, config_path)

    return [
        f"{format_toml_key(key)}={format_toml_value(value)}"
        for key, value in config.items()
    ]
