from __future__ import annotations

from collections.abc import Iterable
from copy import deepcopy
from pathlib import Path
import json
import re
import tomllib

# Harness가 Worker 실행 권한 정책을 준비한다.
CONFIG_PATH = Path(__file__).with_name("config.toml")


class WorkerConfigError(RuntimeError):
    """Worker runner 공통 설정을 사용할 수 없을 때 발생한다."""


# TOML Key를 안전한 문자열로 변환
def _format_toml_key(key: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key

    return json.dumps(key)

# Python 객체를 TOML 문자열로 변환
# Codex CLI의 -c 옵션에 전달할 문자열을 만든다.
def _format_toml_value(value: object) -> str:
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
            _format_toml_value(item)
            for item in value
        )
        return f"[{values}]"

    ## 딕셔너리 처리
    if isinstance(value, dict):
        entries = (
            f"{_format_toml_key(key)} = {_format_toml_value(item)}"
            for key, item in value.items()
        )
        return "{ " + ", ".join(entries) + " }"

    raise TypeError(
        f"지원하지 않는 config.toml 값입니다: "
        f"{type(value).__name__}"
    )

def _build_common_worker_config(
    writable_paths: Iterable[str],
    read_only_paths: Iterable[str],
    toolchain_readable_paths: Iterable[str] = (),
    writable_directories: Iterable[str] = (),
    *,
    template: dict[str, object] | None = None,
) -> dict[str, object]:

    try:
        if template is None:
            with CONFIG_PATH.open("rb") as config_file:
                config = tomllib.load(config_file)
        else:
            config = deepcopy(template)

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

    for writable_directory in writable_directories:
        trimmed_path = writable_directory.rstrip("/\\")
        filesystem[trimmed_path] = "write"
        filesystem[f"{trimmed_path}/**"] = "write"

    return config


# config.toml을 Codex의 -c 옵션 형식으로 변환
def build_config_overrides(
    writable_paths: Iterable[str],
    read_only_paths: Iterable[str],
    toolchain_readable_paths: Iterable[str] = (),
    writable_directories: Iterable[str] = (),
) -> list[str]:
    config = _build_common_worker_config(
        writable_paths=writable_paths,
        read_only_paths=read_only_paths,
        toolchain_readable_paths=toolchain_readable_paths,
        writable_directories=writable_directories,
    )

    return [
        f"{_format_toml_key(key)}={_format_toml_value(value)}"
        for key, value in config.items()
    ]
