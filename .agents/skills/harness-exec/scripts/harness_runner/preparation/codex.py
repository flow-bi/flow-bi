from __future__ import annotations

"""Codex 실행 환경에 필요한 경로를 결정한다."""

from pathlib import Path
import shutil


def resolve_codex_executable() -> str:
    for candidate in ("codex", "codex.cmd"):
        resolved = shutil.which(candidate)
        if resolved is not None:
            return resolved

    raise RuntimeError("PATH에서 Codex CLI를 찾을 수 없습니다.")


def resolve_codex_home() -> Path:
    return Path.home() / ".codex"
