from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HarnessRequest:
    plan_id: str
    additional_request: str = ""
    start_task_number: int | None = None
