from __future__ import annotations

import argparse
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path
import re
import subprocess
import sys


PLAN_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{2}$")
TASK_HEADING_PATTERN = re.compile(r"^##[ \t]+Task:[ \t]*(.*?)[ \t]*$", re.MULTILINE)
ALLOWED_WORKERS = ("be-worker", "fe-worker")
ATTRIBUTE_PATTERNS = {
    "worker": re.compile(r"^[ \t]*-[ \t]*worker:[ \t]*(.*?)[ \t]*$", re.MULTILINE),
    "work_type": re.compile(r"^[ \t]*-[ \t]*작업 유형:[ \t]*(.*?)[ \t]*$", re.MULTILINE),
    "design_docs": re.compile(r"^[ \t]*-[ \t]*관련 설계 문서:[ \t]*(.*?)[ \t]*$", re.MULTILINE),
}


class PlanValidationError(ValueError):
    """Raised when an invocation or active plan is invalid."""


@dataclass(frozen=True)
class Task:
    task_id: str
    worker: str
    work_type: str
    design_docs: tuple[str, ...]
    body: str


WorkerInvoker = Callable[[str, str], None]


def repository_root() -> Path:
    return Path(__file__).resolve().parents[4]


def resolve_active_plan(plan_id: str, project_root: Path) -> Path:
    active_root = (project_root / "docs" / "plan" / "active").resolve()
    candidate = (active_root / f"{plan_id}.md").resolve()
    try:
        candidate.relative_to(active_root)
    except ValueError as error:
        raise PlanValidationError("plan 경로가 docs/plan/active 밖을 가리킬 수 없습니다.") from error
    if not PLAN_ID_PATTERN.fullmatch(plan_id):
        raise PlanValidationError(
            "plan ID는 소문자 kebab-case와 두 자리 번호 형식이어야 합니다 (예: dashboard-01)."
        )
    if not candidate.is_file():
        raise PlanValidationError(f"active plan이 없습니다: docs/plan/active/{plan_id}.md")
    return candidate


def _required_attribute(section: str, name: str, task_id: str) -> tuple[str, int]:
    matches = list(ATTRIBUTE_PATTERNS[name].finditer(section))
    if len(matches) != 1:
        raise PlanValidationError(
            f"task '{task_id}'의 필수 속성 '{name}'은 정확히 한 번 있어야 합니다."
        )
    value = matches[0].group(1).strip()
    if not value:
        raise PlanValidationError(f"task '{task_id}'의 속성 '{name}'이 비어 있습니다.")
    return value, matches[0].end()


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
            raise PlanValidationError(
                f"task '{task_id}'의 설계 문서 파일이 없습니다: {value}"
            )
    return values


def parse_plan_text(text: str, project_root: Path) -> list[Task]:
    # TODO: 회의 후 task 문서 형식이 확정되면 이 임시 파서를 함께 갱신한다.
    headings = list(TASK_HEADING_PATTERN.finditer(text))
    if not headings:
        raise PlanValidationError("plan에 '## Task: <ID>' task가 없습니다.")
    tasks: list[Task] = []
    seen_ids: set[str] = set()
    for index, heading in enumerate(headings):
        task_id = heading.group(1).strip()
        if not task_id:
            raise PlanValidationError("task ID가 비어 있습니다.")
        if task_id in seen_ids:
            raise PlanValidationError(f"중복 task ID입니다: {task_id}")
        seen_ids.add(task_id)
        section_end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        section = text[heading.end() : section_end]
        worker, worker_end = _required_attribute(section, "worker", task_id)
        work_type, work_type_end = _required_attribute(section, "work_type", task_id)
        design_docs_value, design_docs_end = _required_attribute(section, "design_docs", task_id)
        if worker not in ALLOWED_WORKERS:
            raise PlanValidationError(
                f"task '{task_id}'의 worker는 be-worker 또는 fe-worker여야 합니다: {worker}"
            )
        design_docs = _validate_design_docs(design_docs_value, task_id, project_root)
        body = section[max(worker_end, work_type_end, design_docs_end) :].strip()
        if not body:
            raise PlanValidationError(f"task '{task_id}'의 작업 내용과 완료 조건이 비어 있습니다.")
        tasks.append(Task(task_id, worker, work_type, design_docs, body))
    return tasks


def parse_plan(plan_path: Path, project_root: Path) -> list[Task]:
    return parse_plan_text(plan_path.read_text(encoding="utf-8"), project_root)


def _display_design_docs(task: Task) -> str:
    return ", ".join(task.design_docs) if task.design_docs else "없음"


def build_worker_prompt(
    worker: str,
    tasks: Sequence[Task],
    plan_path: Path,
    project_root: Path,
    additional_request: str,
) -> str:
    relative_plan = plan_path.resolve().relative_to(project_root.resolve()).as_posix()
    parts = [
        f"${worker} 다음 active plan의 배정된 task를 문서 순서대로 모두 수행하세요.",
        f"plan 경로: {relative_plan}",
        f"추가 사용자 요청: {additional_request.strip() or '없음'}",
    ]
    for task in tasks:
        parts.extend([
            "",
            f"## Task: {task.task_id}",
            f"- 작업 유형: {task.work_type}",
            f"- 관련 설계 문서: {_display_design_docs(task)}",
            "",
            task.body,
        ])
    return "\n".join(parts)


def invoke_worker(worker: str, prompt: str, project_root: Path | None = None) -> None:
    root = (project_root or repository_root()).resolve()
    build_prompt = root / ".agents" / "scripts" / "build-prompt.py"
    subprocess.run([sys.executable, str(build_prompt), prompt], cwd=root, check=True)


def execute_grouped(
    tasks: Sequence[Task],
    plan_path: Path,
    project_root: Path,
    additional_request: str = "",
    invoker: WorkerInvoker | None = None,
) -> None:
    call_worker = invoker or (lambda worker, prompt: invoke_worker(worker, prompt, project_root))
    for worker in ALLOWED_WORKERS:
        worker_tasks = [task for task in tasks if task.worker == worker]
        if not worker_tasks:
            continue
        prompt = build_worker_prompt(worker, worker_tasks, plan_path, project_root, additional_request)
        call_worker(worker, prompt)


def execute_per_task(
    tasks: Sequence[Task],
    plan_path: Path,
    project_root: Path,
    additional_request: str = "",
    invoker: WorkerInvoker | None = None,
) -> None:
    call_worker = invoker or (lambda worker, prompt: invoke_worker(worker, prompt, project_root))
    for worker in ALLOWED_WORKERS:
        for task in (task for task in tasks if task.worker == worker):
            prompt = build_worker_prompt(worker, [task], plan_path, project_root, additional_request)
            call_worker(worker, prompt)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and execute an active harness plan.")
    parser.add_argument("plan_id")
    parser.add_argument("additional_request", nargs="*")
    arguments = parser.parse_args(argv)
    root = repository_root()
    try:
        plan_path = resolve_active_plan(arguments.plan_id, root)
        tasks = parse_plan(plan_path, root)
        execute_grouped(tasks, plan_path, root, " ".join(arguments.additional_request))
        # TODO: task별 실행이 필요해지면 위 호출을 끄고 다음 호출로 전환한다.
        # execute_per_task(tasks, plan_path, root, " ".join(arguments.additional_request))
    except PlanValidationError as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
