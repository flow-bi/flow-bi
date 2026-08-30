from __future__ import annotations

from dataclasses import dataclass

from .plan import Task


@dataclass(frozen=True)
class HarnessRequest:
    plan_id: str
    additional_request: str = ""
    start_task_number: int | None = None


@dataclass(frozen=True)
class TaskExecutionContext:
    plan_id: str
    fingerprint: str
    mode: str
    prior_tdd_evidence: dict[str, object] | None = None


@dataclass(frozen=True)
class TaskInvocation:
    common_prompt: str
    additional_request: str
    task: Task
    execution_context: TaskExecutionContext | None = None
    decision_correction: dict[str, object] | None = None
