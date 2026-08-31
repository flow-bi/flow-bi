from __future__ import annotations

from pathlib import Path

from verifier_runtime import (
    TaskVerifierScope,
    VerifierRuntimeError,
    open_verifier_runtime,
)

from ..models.invocation import HarnessRequest
from ..models.plan import ParsedPlan
from ..models.result import ExecutionReport
from ..preparation.entry import PreparedExecution
from .coordinator import execute_workers


class HarnessExecutionError(RuntimeError):
    """Harness가 Worker 제출 전 실행 기반을 준비하지 못했다."""


def run_harness_execution(
    plan: ParsedPlan,
    request: HarnessRequest,
    prepared: PreparedExecution,
    project_root: Path,
) -> ExecutionReport:
    """Harness 실행 의존성을 조립하고 전체 Worker 실행을 완료한다."""
    scopes = tuple(
        TaskVerifierScope(
            task.number,
            task.allowed_paths,
            task.read_only_paths,
        )
        for task in plan.tasks
    )

    try:
        with open_verifier_runtime(project_root, scopes) as verifier_runtime:
            return execute_workers(
                plan,
                request,
                prepared,
                project_root=project_root,
                verifier_runtime=verifier_runtime,
            )
    except VerifierRuntimeError as error:
        raise HarnessExecutionError(str(error)) from error
