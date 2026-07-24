from __future__ import annotations

from pathlib import Path
import re

from .models import ParsedPlan, PlanValidationError, Task


PLAN_ID_PATTERN = re.compile(r"[a-zA-Z0-9]+(?:-[a-z0-9]+)*-(\d{2})")
TASK_SECTION_PATTERN = re.compile(r"^## 2\. 실행 Task[ \t]*$", re.MULTILINE)
OVERALL_SECTION_PATTERN = re.compile(r"^## 3\. 전체 완료 조건[ \t]*$", re.MULTILINE)
TASK_HEADING_PATTERN = re.compile(
    r"^### Task[ \t]+(\d+)\.[ \t]*(.*?)[ \t]*$",
    re.MULTILINE,
)
DETAIL_HEADING_PATTERN = re.compile(r"^####[ \t]+(.+?)[ \t]*$", re.MULTILINE)

CORE_SECTION_NAMES = ("선행 Task", "수정 가능 경로", "수정 금지 경로")
TASK_PROMPT_SECTION_NAMES = {
    "작업 목적",
    "구현 항목",
    "검증 항목",
    "완료 조건",
    "실패 조건",
    "제외 범위",
    "작업 결과",
    "남은 문제",
}


def repository_root() -> Path:
    current = Path(__file__).resolve().parent

    for directory in (current, *current.parents):
        if (directory / ".git").exists():
            return directory

    raise RuntimeError("저장소 루트를 찾을 수 없습니다.")

# task section의 영역 구함
def _task_region(text: str) -> tuple[int, int]:
    task_section = TASK_SECTION_PATTERN.search(text)
    overall_section = OVERALL_SECTION_PATTERN.search(text)
    start = task_section.end() if task_section else 0
    end = overall_section.start() if overall_section else len(text)
    return start, end

# 각 task에 공통으로 전달할 plan 내용 생성
def _common_prompt(text: str, task_region_start: int, task_region_end: int) -> str:
    task_section = TASK_SECTION_PATTERN.search(text)
    basic_end = task_section.start() if task_section else task_region_start
    basic_information = text[:basic_end].strip()
    # 전체 완료조건은 우선 넣지 않음
    #overall_conditions = text[task_region_end:].strip()
    return basic_information

# Task 본문에서 ####  단위의 세부 섹션들을 분리
def _detail_sections(task_body: str) -> list[tuple[str, str, str]]:
    headings = list(DETAIL_HEADING_PATTERN.finditer(task_body))
    sections: list[tuple[str, str, str]] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(task_body)
        raw_section = task_body[heading.start() : end].strip()
        body = task_body[heading.end() : end].strip()
        sections.append((heading.group(1).strip(), body, raw_section))
    return sections

# core섹션 존재하는 지 확인
def _required_section(
    sections: list[tuple[str, str, str]],
    task_number: int,
    section_name: str,
) -> str:
    matches = [body for name, body, _ in sections if name == section_name]
    if len(matches) != 1:
        raise PlanValidationError(
            f"Task {task_number}의 {section_name} 섹션은 정확히 한 번 있어야 합니다."
        )
    if not matches[0]:
        raise PlanValidationError(f"Task {task_number}의 {section_name} 섹션이 비어 있습니다.")
    return matches[0]


def _bullet_values(body: str) -> tuple[str, ...]:
    values: list[str] = []
    for line in body.splitlines():
        match = re.match(r"^[ \t]*-[ \t]+(.*?)[ \t]*$", line)
        if match:
            values.append(match.group(1).strip("` \t"))
    return tuple(values)


def _path_values(body: str, task_number: int, section_name: str) -> tuple[str, ...]:
    values = _bullet_values(body)
    if not values or any(not value for value in values):
        raise PlanValidationError(
            f"Task {task_number}의 {section_name} 섹션에는 비어 있지 않은 경로 bullet이 필요합니다."
        )
    return values


def _prerequisite_numbers(body: str, task_number: int) -> tuple[int, ...]:
    values = _bullet_values(body)
    if not values or any(not value for value in values):
        raise PlanValidationError(
            f"Task {task_number}의 선행 Task 섹션에는 비어 있지 않은 항목이 필요합니다."
        )
    if values == ("없음",):
        return ()
    if "없음" in values:
        raise PlanValidationError(
            f"Task {task_number}의 선행 Task에서 없음과 Task 번호를 함께 사용할 수 없습니다."
        )

    numbers: list[int] = []
    for value in values:
        match = re.fullmatch(r"Task[ \t]+(\d+)", value)
        if not match:
            raise PlanValidationError(
                f"Task {task_number}의 선행 Task 형식이 올바르지 않습니다: {value}"
            )
        numbers.append(int(match.group(1)))

    if len(numbers) != len(set(numbers)):
        raise PlanValidationError(f"Task {task_number}의 선행 Task에 중복 참조가 있습니다.")
    if any(number >= task_number or number < 1 for number in numbers):
        raise PlanValidationError(
            f"Task {task_number}의 선행 Task는 이미 등장한 앞선 Task만 참조해야 합니다."
        )
    return tuple(numbers)

# md 파일 받은 문자열 받기
def parse_plan_text(text: str) -> ParsedPlan:
    """Parse an Active Plan and its Task objects without filesystem access."""

    region_start, region_end = _task_region(text)
    task_region = text[region_start:region_end]
    headings = list(TASK_HEADING_PATTERN.finditer(task_region))
    if not headings:
        raise PlanValidationError("Task가 하나 이상 있어야 합니다.")

    common_prompt = _common_prompt(text, region_start, region_end)
    tasks: list[Task] = []
    for index, heading in enumerate(headings):
        number = int(heading.group(1))
        expected_number = index + 1
        if number != expected_number:
            raise PlanValidationError(
                "Task 번호는 1부터 시작하는 연속 번호여야 합니다. "
                f"기대값: Task {expected_number}, 현재값: Task {number}"
            )

        title = heading.group(2).strip()
        if not title:
            raise PlanValidationError(f"Task {number}의 제목이 비어 있습니다.")

        end = headings[index + 1].start() if index + 1 < len(headings) else len(task_region)
        task_body = task_region[heading.end() : end]
        sections = _detail_sections(task_body)
        required = {
            name: _required_section(sections, number, name)
            for name in CORE_SECTION_NAMES
        }
        prerequisites = _prerequisite_numbers(required["선행 Task"], number)

        task_prompt = "\n\n".join(
            raw
            for name, _, raw in sections
            if name in TASK_PROMPT_SECTION_NAMES
        )
        tasks.append(
            Task(
                number=number,
                title=title,
                prerequisite_numbers=prerequisites,
                allowed_paths=_path_values(
                    required["수정 가능 경로"], number, "수정 가능 경로"
                ),
                forbidden_paths=_path_values(
                    required["수정 금지 경로"], number, "수정 금지 경로"
                ),
                task_prompt=task_prompt,
            )
        )
    return ParsedPlan(common_prompt=common_prompt, tasks=tuple(tasks))


def load_active_plan(plan_id: str, project_root: Path) -> tuple[Path, ParsedPlan]:
    match = PLAN_ID_PATTERN.fullmatch(plan_id)
    if not match or match.group(1) == "00":
        raise PlanValidationError(
            "Plan ID는 kebab-case 이름과 01 이상의 2자리 번호로 작성해야 합니다."
        )

    active_root = (project_root / "docs" / "plans" / "active").resolve()
    plan_path = (active_root / f"{plan_id}.md").resolve()
    try:
        plan_path.relative_to(active_root)
    except ValueError as error:
        raise PlanValidationError("Plan ID가 active plan 경로 밖을 가리킵니다.") from error
    if not plan_path.is_file():
        raise FileNotFoundError(f"Active Plan 파일이 없습니다: {plan_path}")
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
