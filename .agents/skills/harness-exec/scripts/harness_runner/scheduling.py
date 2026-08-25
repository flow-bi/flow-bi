from __future__ import annotations

import heapq

from .models import Task, TaskResult
from .state import PlanStateStore, StateRecordError


def restore_succeeded_tasks(tasks: tuple[Task, ...], records: dict[str, object], statuses: dict[int, str], results: dict[int, TaskResult]) -> None:
    for task in tasks:
        record = records.get(f"task{task.number}")
        if isinstance(record, dict) and record.get("status") == "succeeded":
            statuses[task.number] = "succeeded"
            results[task.number] = TaskResult(task.number, task.title, "succeeded", message="이전 실행의 완료 상태를 복원했습니다.", restored=True)


def block_failed_dependents(tasks: dict[int, Task], statuses: dict[int, str], results: dict[int, TaskResult], states: PlanStateStore, plan_id: str) -> None:
    changed = True
    while changed:
        changed = False
        for number, task in sorted(tasks.items()):
            failed = tuple(dependency for dependency in task.prerequisite_numbers if statuses.get(dependency) in {"failed", "blocked"})
            if statuses[number] != "pending" or not failed:
                continue
            message = "실패하거나 차단된 선행 Task: " + ", ".join(f"Task {dependency}" for dependency in failed)
            statuses[number] = "blocked"
            try:
                states.update(plan_id, task, "blocked", reason=message)
            except StateRecordError as error:
                message = f"{message}; 상태 기록 저장 실패: {error}"
            results[number] = TaskResult(number, task.title, "blocked", message=message)
            changed = True


def ready_task_numbers(tasks: dict[int, Task], statuses: dict[int, str]) -> list[int]:
    ready = [number for number, task in tasks.items() if statuses[number] == "pending" and all(statuses.get(dependency) == "succeeded" for dependency in task.prerequisite_numbers)]
    heapq.heapify(ready)
    return ready


def enqueue_ready_tasks(ready: list[int], submitted: set[int], tasks: dict[int, Task], statuses: dict[int, str]) -> None:
    for number in ready_task_numbers(tasks, statuses):
        if number not in submitted:
            heapq.heappush(ready, number)
            submitted.add(number)
