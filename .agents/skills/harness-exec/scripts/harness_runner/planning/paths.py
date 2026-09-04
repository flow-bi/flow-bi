from __future__ import annotations

"""저장소와 Active Plan의 물리 경로를 계산한다."""

from pathlib import Path

from ..paths import find_repository_root

PROJECT_ROOT = find_repository_root()

ACTIVE_PLANS_ROOT = (
    PROJECT_ROOT
    / "docs"
    / "plans"
    / "active"
).resolve()

COMPLETE_PLANS_ROOT = (
    PROJECT_ROOT
    / "docs"
    / "plans"
    / "complete"
).resolve()


def active_plan_path(plan_id: str) -> Path:
    return (ACTIVE_PLANS_ROOT / f"{plan_id}.md").resolve()


def complete_plan_path(plan_path: Path) -> Path:
    return (COMPLETE_PLANS_ROOT / plan_path.name).resolve()
