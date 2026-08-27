from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import replace
import heapq
from pathlib import Path

from ..models import ExecutionReport, HarnessRequest, ParsedPlan, Task, TaskExecutionContext, TaskInvocation, TaskResult
from ..preparation.gateway import invoke_task
from ..results.evidence import EvidenceRecordError, ExecutionRecordStore, revision_fingerprint
from ..results.state import PlanStateStore, StateRecordError
from .scheduling import TaskGraph, block_failed_dependents, build_task_graph, enqueue_ready_tasks, ready_task_numbers, restore_succeeded_tasks
from .task_executor import WorkerInvoker, execute_task


MAX_PARALLEL_TASKS = 4


def _persist_blocked(graph: TaskGraph, numbers: tuple[int, ...], results: dict[int, TaskResult], states: PlanStateStore, plan_id: str) -> None:
    for number in numbers:
        result = results[number]
        try:
            states.update(plan_id, graph.tasks[number], "blocked", reason=result.message)
        except StateRecordError as error:
            results[number] = replace(result, message=f"{result.message}; state record save failed: {error}")


def _restore_from_evidence(plan: ParsedPlan, request: HarnessRequest, store: ExecutionRecordStore, states: PlanStateStore, statuses: dict[int, str], results: dict[int, TaskResult]) -> None:
    for task in plan.tasks:
        if task.number >= request.start_task_number:
            continue
        try:
            record = store.load(request.plan_id, task.number, revision_fingerprint(request.plan_id, task))
            detail = "현재 Task 계약과 일치하는 기록이 없습니다."
        except EvidenceRecordError as error:
            record, detail = None, str(error)
        if record is None:
            message = f"이전 PASS 실행 기록을 신뢰할 수 없습니다: {detail}"
            statuses[task.number] = "failed"
            results[task.number] = TaskResult(task.number, task.title, "failed", message=message)
            try:
                states.update(request.plan_id, task, "failed", reason=message)
            except StateRecordError as error:
                results[task.number] = replace(results[task.number], message=f"{message}; 상태 기록 저장 실패: {error}")
        else:
            statuses[task.number] = "succeeded"
            results[task.number] = TaskResult(task.number, task.title, "succeeded", message="이전 PASS 실행 기록을 검증해 선행 Task를 복원했습니다.", work_summary="이전 PASS 실행 기록을 재사용했습니다.", restored=True)


def execute_workers(plan: ParsedPlan, request: HarnessRequest, call_worker: WorkerInvoker = invoke_task, max_parallel_tasks: int = MAX_PARALLEL_TASKS, *, project_root: Path | None = None, record_store: ExecutionRecordStore | None = None, state_store: PlanStateStore | None = None) -> ExecutionReport:
    root = (project_root or Path.cwd()).resolve()
    store = record_store or ExecutionRecordStore(root / ".agents" / "skills" / "harness-exec" / "scripts" / "harness_runner" / ".execution-records")
    states = state_store or PlanStateStore(root / "docs" / "plans" / "state")
    graph = build_task_graph(plan.tasks)
    tasks = graph.tasks
    statuses, results = {number: "pending" for number in tasks}, {}
    try:
        saved = states.load_task_records(request.plan_id, plan.tasks)
    except StateRecordError as error:
        task = plan.tasks[0]
        return ExecutionReport((TaskResult(task.number, task.title, "failed", message=f"상태 기록 읽기 실패: {error}"),))

    if request.start_task_number is None:
        restore_succeeded_tasks(plan.tasks, saved, statuses, results)
    else:
        _restore_from_evidence(plan, request, store, states, statuses, results)
        _persist_blocked(graph, block_failed_dependents(graph, statuses, results), results, states, request.plan_id)

    ready = ready_task_numbers(tasks, statuses)
    submitted, running = set(ready), {}
    with ThreadPoolExecutor(max_workers=max_parallel_tasks) as executor:
        while ready or running:
            while ready and len(running) < max_parallel_tasks:
                number = heapq.heappop(ready)
                task = tasks[number]
                statuses[number] = "running"
                try:
                    states.update(request.plan_id, task, "running")
                except StateRecordError as error:
                    result = TaskResult(number, task.title, "failed", message=f"상태 기록 저장 실패: {error}")
                    results[number], statuses[number] = result, result.status
                    _persist_blocked(graph, block_failed_dependents(graph, statuses, results), results, states, request.plan_id)
                    continue
                fingerprint = revision_fingerprint(request.plan_id, task)
                try:
                    prior = store.load(request.plan_id, number, fingerprint)
                except EvidenceRecordError as error:
                    result = TaskResult(number, task.title, "failed", message=f"HUMAN_REVIEW_REQUIRED: {error}")
                    results[number], statuses[number] = result, result.status
                    try:
                        states.update(request.plan_id, task, "failed", reason=result.message)
                    except StateRecordError:
                        pass
                    _persist_blocked(graph, block_failed_dependents(graph, statuses, results), results, states, request.plan_id)
                    continue
                context = TaskExecutionContext(request.plan_id, fingerprint, "rerun" if prior else "new_or_changed", prior["tdd_evidence"] if prior else None)
                invocation = TaskInvocation(plan.common_prompt, request.additional_request, task, context)
                running[executor.submit(execute_task, task, invocation, call_worker, store)] = number
            if not running:
                break
            completed, _ = wait(running, return_when=FIRST_COMPLETED)
            for future in sorted(completed, key=lambda item: running[item]):
                number = running.pop(future)
                try:
                    result = future.result()
                except Exception as error:
                    result = TaskResult(number, tasks[number].title, "failed", message=str(error))
                results[number], statuses[number] = result, result.status
                try:
                    states.update(request.plan_id, tasks[number], "succeeded" if result.status == "succeeded" else "failed", reason=None if result.status == "succeeded" else result.message or "Worker 실행 실패")
                except StateRecordError as error:
                    result = replace(result, status="failed", message=f"상태 기록 저장 실패: {error}")
                    results[number], statuses[number] = result, result.status
            _persist_blocked(graph, block_failed_dependents(graph, statuses, results), results, states, request.plan_id)
            enqueue_ready_tasks(ready, submitted, tasks, statuses)

    for number, task in tasks.items():
        if statuses[number] == "pending":
            message = "선행 Task 조건을 충족하지 못해 차단했습니다."
            results[number] = TaskResult(number, task.title, "blocked", message=message)
            try:
                states.update(request.plan_id, task, "blocked", reason=message)
            except StateRecordError:
                pass
    return ExecutionReport(tuple(results[number] for number in sorted(results)))
