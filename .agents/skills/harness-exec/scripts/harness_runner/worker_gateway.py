from __future__ import annotations

from dataclasses import asdict
import json
import subprocess
import sys

from .models import TaskInvocation
from .plan import repository_root


def invoke_task(
    invocation: TaskInvocation,
) -> subprocess.CompletedProcess[bytes]:
    root = repository_root().resolve()
    run_worker = root / ".agents" / "scripts" / "run-worker.py"
    payload = json.dumps(asdict(invocation), ensure_ascii=False)
    return subprocess.run(
        [sys.executable, str(run_worker), payload],
        cwd=root,
        check=True,
    )
