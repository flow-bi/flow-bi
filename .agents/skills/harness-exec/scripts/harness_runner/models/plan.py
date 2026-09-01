from __future__ import annotations

from dataclasses import dataclass


DECLARED_TDD_POLICIES = frozenset(
    ("REQUIRED", "REGRESSION_ONLY", "NOT_APPLICABLE")
)
REUSE_ALLOWED = "REUSE_ALLOWED"


@dataclass(frozen=True)
class Task:
    number: int
    title: str
    prerequisite_numbers: tuple[int, ...]
    allowed_paths: tuple[str, ...]
    read_only_paths: tuple[str, ...]
    task_prompt: str
    implementation_items: tuple[str, ...] = ()
    verification_items: tuple[str, ...] = ()
    minimum_quality_score: int | None = None
    tdd_policy: str = "REQUIRED"


@dataclass(frozen=True)
class ParsedPlan:
    common_prompt: str
    tasks: tuple[Task, ...]
