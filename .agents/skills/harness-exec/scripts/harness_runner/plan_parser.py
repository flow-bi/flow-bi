from __future__ import annotations

import re

from .models import ParsedPlan, Task


TASK_SECTION_PATTERN = re.compile(r"^## 2\. 실행 Task[ \t]*$", re.MULTILINE)
OVERALL_SECTION_PATTERN = re.compile(r"^## 3\. 전체 완료 조건[ \t]*$", re.MULTILINE)
TASK_HEADING_PATTERN = re.compile(
    r"^### Task[ \t]+(\d+)\.[ \t]*(.*?)[ \t]*$", re.MULTILINE
)
DETAIL_HEADING_PATTERN = re.compile(r"^####[ \t]+(.+?)[ \t]*$", re.MULTILINE)
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


def _task_region(text: str) -> tuple[int, int]:
    task_section = TASK_SECTION_PATTERN.search(text)
    overall_section = OVERALL_SECTION_PATTERN.search(text)
    start = task_section.end() if task_section else 0
    end = overall_section.start() if overall_section else len(text)
    return start, end


def _common_prompt(text: str, task_region_start: int) -> str:
    task_section = TASK_SECTION_PATTERN.search(text)
    basic_end = task_section.start() if task_section else task_region_start
    return text[:basic_end].strip()


def _detail_sections(task_body: str) -> list[tuple[str, str, str]]:
    headings = list(DETAIL_HEADING_PATTERN.finditer(task_body))
    sections: list[tuple[str, str, str]] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(task_body)
        sections.append(
            (
                heading.group(1).strip(),
                task_body[heading.end() : end].strip(),
                task_body[heading.start() : end].strip(),
            )
        )
    return sections


def _section_body(sections: list[tuple[str, str, str]], section_name: str) -> str:
    return next((body for name, body, _ in sections if name == section_name), "")


def _bullet_values(body: str) -> tuple[str, ...]:
    values: list[str] = []
    for line in body.splitlines():
        match = re.match(r"^[ \t]*-[ \t]+(.*?)[ \t]*$", line)
        if match:
            value = re.sub(r"^\[[ xX]\][ \t]+", "", match.group(1))
            values.append(value.strip("` \t"))
    return tuple(values)


def _prerequisite_numbers(body: str) -> tuple[int, ...]:
    values = _bullet_values(body)
    if not values or "없음" in values:
        return ()
    numbers: list[int] = []
    for value in values:
        match = re.fullmatch(r"Task[ \t]+(\d+)", value)
        if match:
            numbers.append(int(match.group(1)))
    return tuple(dict.fromkeys(numbers))


def _minimum_quality_score(body: str) -> int | None:
    match = re.search(r"`?quality_score`?[^0-9]*`?(\d+)`?[ \t]*이상", body)
    return int(match.group(1)) if match else None


def parse_plan_text(text: str) -> ParsedPlan:
    region_start, region_end = _task_region(text)
    task_region = text[region_start:region_end]
    headings = list(TASK_HEADING_PATTERN.finditer(task_region))
    tasks: list[Task] = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(task_region)
        sections = _detail_sections(task_region[heading.end() : end])
        prerequisite_body = _section_body(sections, "선행 Task")
        allowed_paths_body = _section_body(sections, "수정 가능 경로")
        read_only_paths_body = _section_body(sections, "수정 금지 경로")
        implementation_body = _section_body(sections, "구현 항목")
        verification_body = _section_body(sections, "검증 항목")
        completion_body = _section_body(sections, "완료 조건")
        task_prompt = "\n\n".join(
            raw for name, _, raw in sections if name in TASK_PROMPT_SECTION_NAMES
        )
        tasks.append(
            Task(
                number=int(heading.group(1)),
                title=heading.group(2).strip(),
                prerequisite_numbers=_prerequisite_numbers(prerequisite_body),
                allowed_paths=_bullet_values(allowed_paths_body),
                read_only_paths=_bullet_values(read_only_paths_body),
                task_prompt=task_prompt,
                implementation_items=_bullet_values(implementation_body),
                verification_items=_bullet_values(verification_body),
                minimum_quality_score=_minimum_quality_score(completion_body),
            )
        )
    return ParsedPlan(
        common_prompt=_common_prompt(text, region_start), tasks=tuple(tasks)
    )
