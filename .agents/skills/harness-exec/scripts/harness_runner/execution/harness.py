from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

from verifier_runtime import (
    TaskVerifierScope,
    VerifierRuntimeError,
    open_verifier_runtime,
)

from ..models.plan import ParsedPlan, Task
from ..models.request import HarnessRequest
from ..models.result import ExecutionReport, TaskResult
from ..preparation.entry import PreparedExecution
from ..results.evidence import TaskEvidenceStore
from .execution_state import restore_execution_state
from .state_store import PlanTaskStateStore, StateStoreError
from .task_runner import TaskRunner
from .task_scheduler import schedule_tasks


class HarnessExecutionError(RuntimeError):
    """Raised when the Harness cannot initialize its execution runtime."""


def _validate_prepared_worker_settings(
    task_by_number: Mapping[int, Task],
    prepared: PreparedExecution,
) -> None:
    task_numbers = set(task_by_number)
    prepared_numbers = set(prepared.worker_settings_by_task)
    if task_numbers != prepared_numbers:
        missing = tuple(sorted(task_numbers - prepared_numbers))
        unexpected = tuple(sorted(prepared_numbers - task_numbers))
        raise ValueError(
            "Prepared Worker Task 번호가 Plan과 일치하지 않습니다: "
            f"missing={missing}, unexpected={unexpected}"
        )


def _state_read_failure(
    plan: ParsedPlan,
    error: StateStoreError,
) -> ExecutionReport:
    task = plan.tasks[0]
    return ExecutionReport(
        (
            TaskResult(
                task.number,
                task.title,
                "failed",
                message=f"상태 기록 읽기 실패: {error}",
            ),
        )
    )


def run_harness_execution(
    plan: ParsedPlan,
    request: HarnessRequest,
    prepared: PreparedExecution,
    project_root: Path,
) -> ExecutionReport:
    """Initialize one Harness runtime and execute the Plan to completion."""
    root = project_root.resolve()
    state_store = PlanTaskStateStore(root / "docs" / "plans" / "state")
    evidence_store = TaskEvidenceStore(
        root
        / ".agents"
        / "skills"
        / "harness-exec"
        / "scripts"
        / "harness_runner"
        / ".execution-records"
    )
    task_by_number = {task.number: task for task in plan.tasks}
    _validate_prepared_worker_settings(task_by_number, prepared)
    try:
        execution_state = restore_execution_state(
            plan,
            request,
            evidence_store,
            state_store,
        )
    except StateStoreError as error:
        return _state_read_failure(plan, error)

    verifier_scopes = tuple(
        TaskVerifierScope(
            task.number,
            task.allowed_paths,
            task.read_only_paths,
        )
        for task in plan.tasks
    )

    try:
        with open_verifier_runtime(root, verifier_scopes) as verifier_runtime:
            task_runner = TaskRunner(
                common_prompt=plan.common_prompt,
                request=request,
                worker_settings_by_task=prepared.worker_settings_by_task,
                codex_executable=prepared.codex_executable,
                project_root=root,
                verifier_runtime=verifier_runtime,
                evidence_store=evidence_store,
            )
            schedule_tasks(execution_state, task_runner)
            execution_state.block_remaining_tasks()
            return execution_state.to_execution_report()
    except VerifierRuntimeError as error:
        raise HarnessExecutionError(str(error)) from error
