from __future__ import annotations

"""Command-line entry point for the harness runner."""

from pathlib import Path as _Path
import sys as _sys


_SCRIPT_DIR = str(_Path(__file__).resolve().parent)
if _SCRIPT_DIR not in _sys.path:
    _sys.path.insert(0, _SCRIPT_DIR)

from harness_runner.cli import main as _main


if __name__ == "__main__":
    raise SystemExit(_main())
