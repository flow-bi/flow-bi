from __future__ import annotations

from dataclasses import dataclass


DEFAULT_WORKER_ORDER = ("be-worker", "fe-worker")
ALLOWED_WORKER_ORDERS = (
    DEFAULT_WORKER_ORDER,
    tuple(reversed(DEFAULT_WORKER_ORDER)),
)


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
    worker_order: tuple[str, str] = DEFAULT_WORKER_ORDER
    additional_request: str = ""
    parallel: bool  = False


@dataclass(frozen=True)
class WorkerFailure:
    worker: str
    return_code: int | None = None
    timed_out: bool = False
    message: str = ""


@dataclass(frozen=True)
class ExecutionReport:
    workers: tuple[str, ...]
    failures: tuple[WorkerFailure, ...]

    @property
    def succeeded(self) -> bool:
        return not self.failures
