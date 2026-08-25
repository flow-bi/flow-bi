from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
import json
import re
import tomllib

# worker config
CONFIG_PATH = Path(__file__).with_name("config.toml")


class WorkerConfigError(RuntimeError):
    """Worker runner 공통 설정을 사용할 수 없을 때 발생한다."""


# TOML Key를 안전한 문자열로 변환
def format_toml_key(key: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key

    return json.dumps(key)

# Python 객체를 TOML 문자열로 변환
# Codex CLI의 -c 옵션에 전달할 문자열을 만든다.
def format_toml_value(value: object) -> str:
    ## 문자열 처리
    if isinstance(value, str):
        return json.dumps(value)

    ## boolean 처리
    if isinstance(value, bool):
        return str(value).lower()

    ## 정수와 실수 처리
    if isinstance(value, (int, float)):
        return repr(value)

    ## 리스트 처리
    if isinstance(value, list):
        values = ", ".join(
            format_toml_value(item)
            for item in value
        )
        return f"[{values}]"

    ## 딕셔너리 처리
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

# config 설정을 읽고 실행 별 경로 권한 병합
def build_worker_config(
    writable_paths: Iterable[str],
    read_only_paths: Iterable[str],
    toolchain_readable_paths: Iterable[str] = (),
) -> dict[str, object]:

    try:
        with CONFIG_PATH.open("rb") as config_file:
            config = tomllib.load(config_file)

    except FileNotFoundError as error:
        raise WorkerConfigError(
            f"config 파일이 경로에 존재하지 않습니다. : {CONFIG_PATH}"
        ) from error

    except tomllib.TOMLDecodeError as error:
        raise WorkerConfigError(
            f"config 파일안의 문법이 잘못되었습니다. : {CONFIG_PATH}: {error}"
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
            "default_permissions에 지정된 권한 프로필을 찾을 수 없습니다."
            f"default_permissions={profile_name!r}: {CONFIG_PATH}"
        )

    filesystem = profile.setdefault("filesystem", {})
    if not isinstance(filesystem, dict):
        raise WorkerConfigError(
            f"권한 프로필{profile_name!r}의 filesystem 설정이"
            f"테이블이 아닙니다 : {CONFIG_PATH}"
        )

    workspace_roots = filesystem.setdefault(":workspace_roots", {})
    if not isinstance(workspace_roots, dict):
        raise WorkerConfigError(
            f"권한 프로필{profile_name!r}의"
            f'filesystem.":workspace_roots" 설정이 테이블 형식이 아닙니다. : {CONFIG_PATH}'
        )

    for writable_path in writable_paths:
        workspace_roots[writable_path] = "write"

    for read_only_path in read_only_paths:
        workspace_roots.setdefault(read_only_path, "read")

    for toolchain_path in toolchain_readable_paths:
        filesystem[toolchain_path] = "read"

    return config


# config.toml을 Codex의 -c 옵션 형식으로 변환
def build_config_overrides(
    writable_paths: Iterable[str],
    read_only_paths: Iterable[str],
    toolchain_readable_paths: Iterable[str] = (),
) -> list[str]:
    config = build_worker_config(
        writable_paths=writable_paths,
        read_only_paths=read_only_paths,
        toolchain_readable_paths=toolchain_readable_paths,
    )

    return [
        f"{format_toml_key(key)}={format_toml_value(value)}"
        for key, value in config.items()
    ]
