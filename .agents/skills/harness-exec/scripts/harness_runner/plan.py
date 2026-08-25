from __future__ import annotations

from pathlib import Path
from .models import ParsedPlan
from .plan_parser import parse_plan_text


def repository_root() -> Path:
    current = Path(__file__).resolve().parent

    for directory in (current, *current.parents):
        if (directory / ".git").exists():
            return directory

    raise RuntimeError("저장소 루트를 찾을 수 없습니다.")

def load_active_plan(plan_id: str, project_root: Path) -> tuple[Path, ParsedPlan]:
    active_root = (project_root / "docs" / "plans" / "active").resolve()
    plan_path = (active_root / f"{plan_id}.md").resolve()
    text = plan_path.read_text(encoding="utf-8")
    return plan_path, parse_plan_text(text)


def _complete_path(plan_path: Path, project_root: Path) -> Path:
    return (project_root / "docs" / "plans" / "complete" / plan_path.name).resolve()


def complete_plan(plan_path: Path, project_root: Path) -> Path:
    destination = _complete_path(plan_path, project_root)
    if destination.exists():
        raise FileExistsError(f"complete plan이 이미 존재합니다: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    plan_path.rename(destination)
    return destination
