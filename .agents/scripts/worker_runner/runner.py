from __future__ import annotations

import subprocess
import uuid

from .prompt import build_worker_prompt
from .request import WorkerExecutionRequest
from .worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
    run_worker_process,
)


def execute_worker(
    request: WorkerExecutionRequest,
    *,
    process_runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    timeout: int = 30 * 60,
) -> WorkerExecutionResult:
    """완성된 요청 하나로 Worker 실행 전체를 수행한다."""
    prompt = build_worker_prompt(request)

    execution_environment = request.environment.copy()
    run_id = str(uuid.uuid4())
    execution_environment["FLOW_BI_RUN_ID"] = run_id

    return run_worker_process(
        executable=request.executable,
        config_overrides=request.config_overrides,
        prompt=prompt,
        run_id=run_id,
        environment=execution_environment,
        project_root=request.project_root,
        runner=process_runner,
        logger=logger,
        timeout=timeout,
    )
