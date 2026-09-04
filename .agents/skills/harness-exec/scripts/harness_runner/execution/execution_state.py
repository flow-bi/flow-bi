from __future__ import annotations

from dataclasses import dataclass, replace

from ..models.plan import ParsedPlan, Task
from ..models.request import HarnessRequest
from ..models.result import ExecutionReport, TaskResult
from ..results.evidence import (
    EvidenceError,
    TaskEvidenceStore,
    task_contract_fingerprint,
)
from .state_store import PlanTaskStateStore, StateStoreError


@dataclass
class PlanExecutionState:
    """In-memory Task graph, statuses, and results for one Plan execution."""

    plan_id: str
    task_by_number: dict[int, Task]
    dependent_task_numbers_by_task: dict[int, tuple[int, ...]]
    status_by_task_number: dict[int, str]
    result_by_task_number: dict[int, TaskResult]
    state_store: PlanTaskStateStore

    def mark_task_running(self, task: Task) -> bool:
        self.status_by_task_number[task.number] = "running"
        try:
            self.state_store.save_task_status(self.plan_id, task, "running")
        except StateStoreError as error:
            self._set_result(
                TaskResult(
                    task.number,
                    task.title,
                    "failed",
                    message=f"상태 기록 저장 실패: {error}",
                )
            )
            self.block_tasks_with_failed_prerequisites()
            return False
        return True

    def record_task_failure(self, task: Task, message: str) -> None:
        task_result = TaskResult(task.number, task.title, "failed", message=message)
        self._set_result(task_result)
        try:
            self.state_store.save_task_status(
                self.plan_id,
                task,
                "failed",
                reason=message,
            )
        except StateStoreError as error:
            self.result_by_task_number[task.number] = replace(
                task_result,
                message=f"{message}; 상태 기록 저장 실패: {error}",
            )

    def record_task_result(self, task: Task, task_result: TaskResult) -> None:
        self._set_result(task_result)
        status = "succeeded" if task_result.status == "succeeded" else "failed"
        reason = (
            None
            if status == "succeeded"
            else task_result.message or "Worker 실행 실패"
        )
        try:
            self.state_store.save_task_status(
                self.plan_id,
                task,
                status,
                reason=reason,
            )
        except StateStoreError as error:
            self._set_result(
                replace(
                    task_result,
                    status="failed",
                    message=f"상태 기록 저장 실패: {error}",
                )
            )

    def block_tasks_with_failed_prerequisites(self) -> None:
        pending_failures = [
            task_number
            for task_number, status in self.status_by_task_number.items()
            if status in {"failed", "blocked"}
        ]
        visited: set[int] = set()
        while pending_failures:
            failed_task_number = pending_failures.pop(0)
            for task_number in self.dependent_task_numbers_by_task.get(
                failed_task_number, ()
            ):
                if (
                    task_number in visited
                    or self.status_by_task_number.get(task_number) != "pending"
                ):
                    continue
                visited.add(task_number)
                task = self.task_by_number[task_number]
                failed_prerequisites = tuple(
                    prerequisite
                    for prerequisite in task.prerequisite_numbers
                    if self.status_by_task_number.get(prerequisite)
                    in {"failed", "blocked"}
                )
                if not failed_prerequisites:
                    continue
                message = "실패하거나 차단된 선행 Task: " + ", ".join(
                    f"Task {prerequisite}"
                    for prerequisite in failed_prerequisites
                )
                task_result = TaskResult(
                    task_number,
                    task.title,
                    "blocked",
                    message=message,
                )
                self._set_result(task_result)
                try:
                    self.state_store.save_task_status(
                        self.plan_id,
                        task,
                        "blocked",
                        reason=message,
                    )
                except StateStoreError as error:
                    self.result_by_task_number[task_number] = replace(
                        task_result,
                        message=f"{message}; 상태 기록 저장 실패: {error}",
                    )
                pending_failures.append(task_number)

    def block_remaining_tasks(self) -> None:
        for task_number, task in self.task_by_number.items():
            if self.status_by_task_number[task_number] != "pending":
                continue
            message = "선행 Task 조건을 충족하지 못해 차단되었습니다."
            self._set_result(
                TaskResult(
                    task_number,
                    task.title,
                    "blocked",
                    message=message,
                )
            )
            try:
                self.state_store.save_task_status(
                    self.plan_id,
                    task,
                    "blocked",
                    reason=message,
                )
            except StateStoreError:
                pass

    def ready_task_numbers(self) -> tuple[int, ...]:
        return tuple(
            sorted(
                task_number
                for task_number, task in self.task_by_number.items()
                if self.status_by_task_number[task_number] == "pending"
                and all(
                    self.status_by_task_number.get(prerequisite) == "succeeded"
                    for prerequisite in task.prerequisite_numbers
                )
            )
        )

    def to_execution_report(self) -> ExecutionReport:
        return ExecutionReport(
            tuple(
                self.result_by_task_number[task_number]
                for task_number in sorted(self.result_by_task_number)
            )
        )

    def _set_result(self, task_result: TaskResult) -> None:
        self.result_by_task_number[task_result.task_number] = task_result
        self.status_by_task_number[task_result.task_number] = task_result.status


def restore_execution_state(
    plan: ParsedPlan,
    request: HarnessRequest,
    evidence_store: TaskEvidenceStore,
    state_store: PlanTaskStateStore,
) -> PlanExecutionState:
    task_by_number = {task.number: task for task in plan.tasks}
    dependents: dict[int, list[int]] = {
        task_number: [] for task_number in task_by_number
    }
    for task in plan.tasks:
        for prerequisite in task.prerequisite_numbers:
            dependents.setdefault(prerequisite, []).append(task.number)
    dependent_task_numbers_by_task = {
        task_number: tuple(task_numbers)
        for task_number, task_numbers in dependents.items()
    }
    status_by_task_number = {task.number: "pending" for task in plan.tasks}
    saved_statuses = state_store.load_plan_task_statuses(
        request.plan_id,
        plan.tasks,
    )
    execution_state = PlanExecutionState(
        plan_id=request.plan_id,
        task_by_number=task_by_number,
        dependent_task_numbers_by_task=dependent_task_numbers_by_task,
        status_by_task_number=status_by_task_number,
        result_by_task_number={},
        state_store=state_store,
    )

    if request.start_task_number is None:
        for task in plan.tasks:
            saved_status = saved_statuses.get(f"task{task.number}")
            if isinstance(saved_status, dict) and saved_status.get("status") == "succeeded":
                execution_state._set_result(
                    TaskResult(
                        task.number,
                        task.title,
                        "succeeded",
                        message="이전 실행의 완료 상태를 복원했습니다.",
                        restored=True,
                    )
                )
        return execution_state

    for task in plan.tasks:
        if task.number >= request.start_task_number:
            continue
        try:
            prior_evidence = evidence_store.load_valid_evidence(
                request.plan_id,
                task.number,
                task_contract_fingerprint(request.plan_id, task),
            )
            detail = "현재 Task 계약과 일치하는 기록이 없습니다."
        except EvidenceError as error:
            prior_evidence, detail = None, str(error)
        if prior_evidence is None:
            execution_state.record_task_failure(
                task,
                f"이전 PASS 실행 기록을 신뢰할 수 없습니다: {detail}",
            )
            continue
        execution_state._set_result(
            TaskResult(
                task.number,
                task.title,
                "succeeded",
                message="이전 PASS 실행 기록을 검증해 선행 Task를 복원했습니다.",
                work_summary="이전 PASS 실행 기록을 재사용했습니다.",
                restored=True,
            )
        )
    execution_state.block_tasks_with_failed_prerequisites()
    return execution_state
