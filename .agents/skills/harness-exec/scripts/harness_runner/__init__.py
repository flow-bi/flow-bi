"""Responsibility-focused implementation for the harness executor."""

from pathlib import Path
import sys


WORKER_SCRIPTS = Path(__file__).resolve().parents[4] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

