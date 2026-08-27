from __future__ import annotations

from dataclasses import dataclass
import heapq

from .models import Task, TaskResult


@dataclass(frozen=True)
class TaskGraph:
    tasks: dict[int, Task]
    dependents: dict[int, tuple[int, ...]]


def build_task_graph(tasks: tuple[Task, ...]) -> TaskGraph:
    indexed = {task.number: task for task in tasks}
    dependents: dict[int, list[int]] = {number: [] for number in indexed}
    for task in tasks:
        for prerequisite in task.prerequisite_numbers:
            dependents.setdefault(prerequisite, []).append(task.number)
    return TaskGraph(indexed, {number: tuple(values) for number, values in dependents.items()})


def restore_succeeded_tasks(tasks: tuple[Task, ...], records: dict[str, object], statuses: dict[int, str], results: dict[int, TaskResult]) -> None:
    for task in tasks:
        record = records.get(f"task{task.number}")
        if isinstance(record, dict) and record.get("status") == "succeeded":
            statuses[task.number] = "succeeded"
            results[task.number] = TaskResult(task.number, task.title, "succeeded", message="이전 실행의 완료 상태를 복원했습니다.", restored=True)


def block_failed_dependents(graph: TaskGraph, statuses: dict[int, str], results: dict[int, TaskResult]) -> tuple[int, ...]:
    """Block only descendants of failed nodes using the cohort reverse index."""
    pending = [number for number, status in statuses.items() if status in {"failed", "blocked"}]
    visited: set[int] = set()
    blocked: list[int] = []
    while pending:
        failed = pending.pop(0)
        for number in graph.dependents.get(failed, ()):
            if number in visited or statuses.get(number) != "pending":
                continue
            visited.add(number)
            task = graph.tasks[number]
            failed_prerequisites = tuple(dependency for dependency in task.prerequisite_numbers if statuses.get(dependency) in {"failed", "blocked"})
            if not failed_prerequisites:
                continue
            statuses[number] = "blocked"
            results[number] = TaskResult(number, task.title, "blocked", message="실패하거나 차단된 선행 Task: " + ", ".join(f"Task {dependency}" for dependency in failed_prerequisites))
            blocked.append(number)
            pending.append(number)
    return tuple(blocked)


def ready_task_numbers(tasks: dict[int, Task], statuses: dict[int, str]) -> list[int]:
    ready = [number for number, task in tasks.items() if statuses[number] == "pending" and all(statuses.get(dependency) == "succeeded" for dependency in task.prerequisite_numbers)]
    heapq.heapify(ready)
    return ready


def enqueue_ready_tasks(ready: list[int], submitted: set[int], tasks: dict[int, Task], statuses: dict[int, str]) -> None:
    for number in ready_task_numbers(tasks, statuses):
        if number not in submitted:
            heapq.heappush(ready, number)
            submitted.add(number)
