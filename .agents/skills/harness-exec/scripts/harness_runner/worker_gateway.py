from __future__ import annotations

from pathlib import Path
import subprocess
import sys

from .plan import repository_root


def invoke_worker(
    worker: str, prompt: str, project_root: Path | None = None
) -> subprocess.CompletedProcess[bytes]:
    root = (project_root or repository_root()).resolve()
    run_worker = root / ".agents" / "scripts" / "run-worker.py"
    invocation = f"${worker} {prompt}"
    return subprocess.run(
        [sys.executable, str(run_worker), invocation], cwd=root, check=True
    )
