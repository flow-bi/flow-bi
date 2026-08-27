from __future__ import annotations

from pathlib import Path

from ..models import ParsedPlan
from .paths import active_plan_path, complete_plan_path
from .parser import parse_plan_text


def load_active_plan(
    plan_id: str,
) -> tuple[Path, ParsedPlan]:
    plan_path = active_plan_path(plan_id)
    
    text = plan_path.read_text(encoding="utf-8")

    return plan_path, parse_plan_text(text)


def complete_plan(
    plan_path: Path,
) -> Path:
    destination = complete_plan_path(plan_path)

    if destination.exists():
        raise FileExistsError(
            f"complete plan이 이미 존재합니다: {destination}"
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    plan_path.rename(destination)

    return destination
