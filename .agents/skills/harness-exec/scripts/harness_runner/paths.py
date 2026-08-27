from __future__ import annotations

from pathlib import Path


def find_repository_root() -> Path:
    current = Path(__file__).resolve().parent

    for directory in (current, *current.parents):
        if (directory / ".git").exists():
            return directory

    raise RuntimeError("저장소 루트를 찾을 수 없습니다.")


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