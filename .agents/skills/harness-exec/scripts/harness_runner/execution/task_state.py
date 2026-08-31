from __future__ import annotations

from dataclasses import dataclass, replace

from ..models.invocation import HarnessRequest
from ..models.plan import ParsedPlan, Task
from ..models.result import ExecutionReport, TaskResult
from ..results.evidence import EvidenceRecordError, ExecutionRecordStore, revision_fingerprint
from .scheduling import TaskGraph, block_failed_dependents, restore_succeeded_tasks
from .state_store import PlanStateStore, StateRecordError


@dataclass
class ExecutionTaskState:
    """Task 상태와 상태 저장소 갱신을 한 경계에서 관리한다."""

    plan_id: str
    graph: TaskGraph
    state_store: PlanStateStore
    statuses: dict[int, str]
    results: dict[int, TaskResult]

    @classmethod
    def restore(
        cls,
        plan: ParsedPlan,
        request: HarnessRequest,
        graph: TaskGraph,
        record_store: ExecutionRecordStore,
        state_store: PlanStateStore,
    ) -> ExecutionTaskState:
        statuses = {task.number: "pending" for task in plan.tasks}
        results: dict[int, TaskResult] = {}
        saved = state_store.load_task_records(request.plan_id, plan.tasks)

        state = cls(request.plan_id, graph, state_store, statuses, results)
        if request.start_task_number is None:
            restore_succeeded_tasks(plan.tasks, saved, statuses, results)
        else:
            state._restore_predecessors_from_evidence(
                plan.tasks,
                request.start_task_number,
                record_store,
            )
            state.block_failed_dependents()
        return state

    def _restore_predecessors_from_evidence(
        self,
        tasks: tuple[Task, ...],
        start_task_number: int,
        record_store: ExecutionRecordStore,
    ) -> None:
        for task in tasks:
            if task.number >= start_task_number:
                continue
            self._restore_predecessor(task, record_store)

    def _restore_predecessor(
        self,
        task: Task,
        record_store: ExecutionRecordStore,
    ) -> None:
        try:
            record = record_store.load(
                self.plan_id,
                task.number,
                revision_fingerprint(self.plan_id, task),
            )
            detail = "현재 Task 계약과 일치하는 기록이 없습니다."
        except EvidenceRecordError as error:
            record, detail = None, str(error)

        if record is None:
            self.fail(
                task,
                f"이전 PASS 실행 기록을 신뢰할 수 없습니다: {detail}",
            )
            return

        self.statuses[task.number] = "succeeded"
        self.results[task.number] = TaskResult(
            task.number,
            task.title,
            "succeeded",
            message="이전 PASS 실행 기록을 검증해 선행 Task를 복원했습니다.",
            work_summary="이전 PASS 실행 기록을 재사용했습니다.",
            restored=True,
        )

    def start(self, task: Task) -> bool:
        self.statuses[task.number] = "running"
        try:
            self.state_store.update(self.plan_id, task, "running")
        except StateRecordError as error:
            result = TaskResult(
                task.number,
                task.title,
                "failed",
                message=f"상태 기록 저장 실패: {error}",
            )
            self._set_result(result)
            self.block_failed_dependents()
            return False
        return True

    def fail(self, task: Task, message: str) -> None:
        result = TaskResult(task.number, task.title, "failed", message=message)
        self._set_result(result)
        try:
            self.state_store.update(
                self.plan_id,
                task,
                "failed",
                reason=message,
            )
        except StateRecordError as error:
            self.results[task.number] = replace(
                result,
                message=f"{message}; 상태 기록 저장 실패: {error}",
            )

    def complete(self, task: Task, result: TaskResult) -> None:
        self._set_result(result)
        status = "succeeded" if result.status == "succeeded" else "failed"
        reason = None if status == "succeeded" else result.message or "Worker 실행 실패"
        try:
            self.state_store.update(
                self.plan_id,
                task,
                status,
                reason=reason,
            )
        except StateRecordError as error:
            self._set_result(
                replace(
                    result,
                    status="failed",
                    message=f"상태 기록 저장 실패: {error}",
                )
            )

    def block_failed_dependents(self) -> None:
        numbers = block_failed_dependents(
            self.graph,
            self.statuses,
            self.results,
        )
        for number in numbers:
            result = self.results[number]
            try:
                self.state_store.update(
                    self.plan_id,
                    self.graph.tasks[number],
                    "blocked",
                    reason=result.message,
                )
            except StateRecordError as error:
                self.results[number] = replace(
                    result,
                    message=f"{result.message}; state record save failed: {error}",
                )

    def block_pending_tasks(self) -> None:
        for number, task in self.graph.tasks.items():
            if self.statuses[number] != "pending":
                continue
            message = "선행 Task 조건을 충족하지 못해 차단했습니다."
            result = TaskResult(number, task.title, "blocked", message=message)
            self._set_result(result)
            try:
                self.state_store.update(
                    self.plan_id,
                    task,
                    "blocked",
                    reason=message,
                )
            except StateRecordError:
                pass

    def report(self) -> ExecutionReport:
        return ExecutionReport(
            tuple(self.results[number] for number in sorted(self.results))
        )

    def _set_result(self, result: TaskResult) -> None:
        self.results[result.task_number] = result
        self.statuses[result.task_number] = result.status
