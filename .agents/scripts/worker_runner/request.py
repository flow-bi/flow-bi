from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WorkerExecutionRequest:
    task_number: int
    common_prompt: str
    additional_request: str
    title: str
    task_prompt: str
    task_execution_context: Mapping[str, object] | None
    decision_correction: Mapping[str, object] | None
    executable: str
    config_overrides: tuple[str, ...]
    environment: dict[str, str]
    project_root: Path
    verification_result_collection: Mapping[str, object] | None = None
    run_id: str | None = None
    verification_items: tuple[str, ...] = ()
