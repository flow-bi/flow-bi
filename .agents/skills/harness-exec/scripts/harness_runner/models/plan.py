from __future__ import annotations

from dataclasses import dataclass


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


@dataclass(frozen=True)
class ParsedPlan:
    common_prompt: str
    tasks: tuple[Task, ...]
