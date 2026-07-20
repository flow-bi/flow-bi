from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
import re

from .models import DEFAULT_WORKER_ORDER, PlanValidationError, Task


PLAN_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{2}$")
TASK_HEADING_PATTERN = re.compile(r"^##[ \t]+Task:[ \t]*(.*?)[ \t]*$", re.MULTILINE)
ATTRIBUTE_PATTERNS = {
    "worker": re.compile(r"^[ \t]*-[ \t]*worker:[ \t]*(.*?)[ \t]*$", re.MULTILINE),
    "work_type": re.compile(r"^[ \t]*-[ \t]*작업 유형:[ \t]*(.*?)[ \t]*$", re.MULTILINE),
    "design_docs": re.compile(r"^[ \t]*-[ \t]*관련 설계 문서:[ \t]*(.*?)[ \t]*$", re.MULTILINE),
}


@dataclass(frozen=True)
class _ParsedTask:
    task_id: str
    attributes: dict[str, tuple[str, ...]]
    attribute_ends: tuple[int, ...]
    section: str


def repository_root() -> Path:
    return Path(__file__).resolve().parents[5]


def _parse_plan_text(text: str) -> list[_ParsedTask]:
    """Parse task sections without filesystem access."""

    headings = list(TASK_HEADING_PATTERN.finditer(text))
    if not headings:
        raise PlanValidationError("plan에 '## Task: <ID>' task가 없습니다.")

    parsed: list[_ParsedTask] = []
    for index, heading in enumerate(headings):
        section_end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        section = text[heading.end() : section_end]
        attributes: dict[str, tuple[str, ...]] = {}
        ends: list[int] = []
        for name, pattern in ATTRIBUTE_PATTERNS.items():
            matches = list(pattern.finditer(section))
            attributes[name] = tuple(match.group(1).strip() for match in matches)
            ends.extend(match.end() for match in matches)
        parsed.append(_ParsedTask(heading.group(1).strip(), attributes, tuple(ends), section))
    return parsed


def _required_attribute(parsed: _ParsedTask, name: str) -> str:
    values = parsed.attributes[name]
    if len(values) != 1:
        raise PlanValidationError(
            f"task '{parsed.task_id}'의 필수 속성 '{name}'은 정확히 한 번 있어야 합니다."
        )
    if not values[0]:
        raise PlanValidationError(f"task '{parsed.task_id}'의 속성 '{name}'이 비어 있습니다.")
    return values[0]


def _validate_design_docs(raw_value: str, task_id: str, project_root: Path) -> tuple[str, ...]:
    if raw_value == "없음":
        return ()

    values = tuple(value.strip() for value in raw_value.split(","))
    if not values or any(not value for value in values):
        raise PlanValidationError(f"task '{task_id}'의 관련 설계 문서 목록이 잘못되었습니다.")

    root = project_root.resolve()
    for value in values:
        relative_path = Path(value)
        if relative_path.is_absolute():
            raise PlanValidationError(
                f"task '{task_id}'의 설계 문서는 저장소 상대 경로여야 합니다: {value}"
            )
        resolved = (root / relative_path).resolve()
        try:
            resolved.relative_to(root)
        except ValueError as error:
            raise PlanValidationError(
                f"task '{task_id}'의 설계 문서가 저장소 밖을 가리킵니다: {value}"
            ) from error
        if not resolved.is_file():
            raise PlanValidationError(f"task '{task_id}'의 설계 문서 파일이 없습니다: {value}")
    return values


def _validate_tasks(parsed_tasks: Sequence[_ParsedTask], project_root: Path) -> list[Task]:
    tasks: list[Task] = []
    seen_ids: set[str] = set()
    for parsed in parsed_tasks:
        if not parsed.task_id:
            raise PlanValidationError("task ID가 비어 있습니다.")
        if parsed.task_id in seen_ids:
            raise PlanValidationError(f"중복 task ID입니다: {parsed.task_id}")
        seen_ids.add(parsed.task_id)

        worker = _required_attribute(parsed, "worker")
        work_type = _required_attribute(parsed, "work_type")
        design_docs_value = _required_attribute(parsed, "design_docs")
        if worker not in DEFAULT_WORKER_ORDER:
            raise PlanValidationError(
                f"task '{parsed.task_id}'의 worker는 be-worker 또는 fe-worker여야 합니다: {worker}"
            )
        design_docs = _validate_design_docs(design_docs_value, parsed.task_id, project_root)
        body = parsed.section[max(parsed.attribute_ends, default=0) :].strip()
        if not body:
            raise PlanValidationError(
                f"task '{parsed.task_id}'의 작업 내용과 완료 조건이 비어 있습니다."
            )
        tasks.append(Task(parsed.task_id, worker, work_type, design_docs, body))
    return tasks


def load_active_plan(plan_id: str, project_root: Path) -> tuple[Path, list[Task]]:
    if not PLAN_ID_PATTERN.fullmatch(plan_id):
        raise PlanValidationError(
            "plan ID는 소문자 kebab-case와 두 자리 번호 형식이어야 합니다 (예: dashboard-01)."
        )

    active_root = (project_root / "docs" / "plan" / "active").resolve()
    plan_path = (active_root / f"{plan_id}.md").resolve()
    try:
        plan_path.relative_to(active_root)
    except ValueError as error:
        raise PlanValidationError("plan 경로가 docs/plan/active 밖을 가리킬 수 없습니다.") from error
    if not plan_path.is_file():
        raise PlanValidationError(f"active plan이 없습니다: docs/plan/active/{plan_id}.md")

    complete_path = _complete_path(plan_path, project_root)
    if complete_path.exists():
        raise FileExistsError(
            f"complete plan이 이미 존재합니다: docs/plan/complete/{plan_path.name}"
        )
    text = plan_path.read_text(encoding="utf-8")
    return plan_path, _validate_tasks(_parse_plan_text(text), project_root)


def _complete_path(plan_path: Path, project_root: Path) -> Path:
    return (project_root / "docs" / "plan" / "complete" / plan_path.name).resolve()


def complete_plan(plan_path: Path, project_root: Path) -> Path:
    destination = _complete_path(plan_path, project_root)
    if destination.exists():
        raise FileExistsError(f"complete plan이 이미 존재합니다: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    plan_path.rename(destination)
    return destination
