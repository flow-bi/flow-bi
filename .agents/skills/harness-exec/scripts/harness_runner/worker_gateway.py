from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
import json
import os
import sys

from .models import TaskInvocation
from .plan import repository_root


WORKER_SCRIPTS = Path(__file__).resolve().parents[4] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner import execute_worker, parse_invocation


def invoke_task(
    invocation: TaskInvocation,
    *,
    environment_overrides: dict[str, str] | None = None,
) -> object:
    root = repository_root().resolve()
    payload = json.dumps(asdict(invocation), ensure_ascii=False)
    prompt, allowed_paths, forbidden_paths = parse_invocation(payload)
    environment = os.environ.copy()
    if environment_overrides:
        environment.update(environment_overrides)
    return execute_worker(
        prompt,
        allowed_paths,
        forbidden_paths,
        task_number=invocation.task.number,
        project_root=root,
        base_environment=environment,
    )
