from __future__ import annotations

from pathlib import Path


def build_codex_command(
    *,
    output_path: Path,
    executable: str,
    config_overrides: tuple[str, ...],
) -> list[str]:
    command = [executable, "exec", "--json", "-o", str(output_path)]
    for override in config_overrides:
        command.extend(("-c", override))
    command.append("-")
    return command
