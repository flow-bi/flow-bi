from __future__ import annotations

from dataclasses import dataclass


class PlanValidationError(ValueError):
    """Raised when an invocation or active plan is invalid."""


@dataclass(frozen=True)
class Task:
    number: int
    title: str
    prerequisite_numbers: tuple[int, ...]
    allowed_paths: tuple[str, ...]
    forbidden_paths: tuple[str, ...]
    task_prompt: str


@dataclass(frozen=True)
class ParsedPlan:
    common_prompt: str
    tasks: tuple[Task, ...]


@dataclass(frozen=True)
class HarnessRequest:
    plan_id: str
    additional_request: str = ""


@dataclass(frozen=True)
class TaskInvocation:
    common_prompt: str
    additional_request: str
    task: Task


@dataclass(frozen=True)
class WorkerFailure:
    worker: str
    return_code: int | None = None
    timed_out: bool = False
    message: str = ""


@dataclass(frozen=True)
class TaskResult:
    task_number: int
    title: str
    status: str
    return_code: int | None = None
    timed_out: bool = False
    message: str = ""


@dataclass(frozen=True)
class ExecutionReport:
    results: tuple[TaskResult, ...]

    @property
    def succeeded(self) -> bool:
        return all(result.status == "succeeded" for result in self.results)

    @property
    def failures(self) -> tuple[TaskResult, ...]:
        return tuple(
            result
            for result in self.results
            if result.status in {"failed", "blocked"}
        )
