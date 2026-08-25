from __future__ import annotations

from pathlib import Path
import shutil

from .config import build_config_overrides


def resolve_codex_executable() -> str:
    for candidate in ("codex", "codex.cmd"):
        resolved = shutil.which(candidate)
        if resolved is not None:
            return resolved

    raise RuntimeError("PATH에서 Codex CLI를 찾을 수 없습니다.")


def resolve_codex_home() -> Path:
    return Path.home() / ".codex"


def build_codex_command(
    *,
    writable_paths: tuple[str, ...],
    read_only_paths: tuple[str, ...],
    toolchain_readable_paths: tuple[str, ...],
    output_path: Path,
    executable: str | None = None,
) -> list[str]:
    command = [executable or resolve_codex_executable(), "exec", "-o", str(output_path)]
    for override in build_config_overrides(
        writable_paths=writable_paths,
        read_only_paths=read_only_paths,
        toolchain_readable_paths=toolchain_readable_paths,
    ):
        command.extend(("-c", override))
    command.append("-")
    return command
