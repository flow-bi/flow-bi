from .models import HarnessRequest, PlanValidationError
from .models import ParsedPlan, Task

import re

# $harness-exec <plan-id> [추가 요청]
INVOCATION_PATTERN = re.compile(
    r"^\s*\$harness-exec\s+(?P<plan_id>\S+)(?P<remainder>[\s\S]*)$"
)


def parse_invocation(raw_request: str) -> HarnessRequest:
    match = INVOCATION_PATTERN.fullmatch(raw_request)
    if match is None:
        raise PlanValidationError(
            "호출 형식은 '$harness-exec <plan-id> [추가 요청]'입니다."
        )

    plan_id = match.group("plan_id")
    return HarnessRequest(plan_id, match.group("remainder").strip())





################ plan-start ###############
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
        name = heading.group(1).strip()

        sections.append((name, body, raw_section))
    return sections

def _section_body(
        sections: list[tuple[str, str, str]],
        section_name: str,
    ) -> str:
    return next(
        (
            body
            for name, body, _ in sections
            if name == section_name
        ),
        "",
    )

def _bullet_values(body: str) -> tuple[str, ...]:
    values: list[str] = []

    for line in body.splitlines():
        match = re.match(r"^[ \t]*-[ \t]+(.*?)[ \t]*$", line)
        if match:
            value = re.sub(r"^\[[ xX]\][ \t]+", "", match.group(1))
            values.append(value.strip("` \t"))
    return tuple(values)


def _path_values(body: str) -> tuple[str, ...]:
    values = _bullet_values(body)
    return values


def _prerequisite_numbers(body: str) -> tuple[int, ...]:
    values = _bullet_values(body)

    if not values or "없음" in values:
        return ()

    numbers: list[int] = []

    for value in values:
        match = re.fullmatch(r"Task[ \t]+(\d+)", value)

        if match:
            numbers.append(int(match.group(1)))

    # 순서를 유지하면서 중복 제거
    return tuple(dict.fromkeys(numbers))


def _minimum_quality_score(body: str) -> int | None:
    match = re.search(
        r"`?quality_score`?[^0-9]*`?(\d+)`?[ \t]*이상",
        body,
    )
    return int(match.group(1)) if match else None

def parse_plan_text(text: str) -> ParsedPlan:
    """Active Plan 문자열을 ParsedPlan으로 변환"""

    region_start, region_end = _task_region(text)
    task_region = text[region_start:region_end]
    headings = list(TASK_HEADING_PATTERN.finditer(task_region))

    common_prompt = _common_prompt(text, region_start, region_end)

    tasks: list[Task] = []
    for index, heading in enumerate(headings):
        number = int(heading.group(1))
        title = heading.group(2).strip()

        end = headings[index + 1].start() if index + 1 < len(headings) else len(task_region)
        task_body = task_region[heading.end() : end]
        sections = _detail_sections(task_body)

        prerequisite_body = _section_body(
            sections,
            "선행 Task",
        )
        allowed_paths_body = _section_body(
            sections,
            "수정 가능 경로",
        )
        forbidden_paths_body = _section_body(
            sections,
            "수정 금지 경로",
        )
        implementation_body = _section_body(sections, "구현 항목")
        verification_body = _section_body(sections, "검증 항목")
        completion_body = _section_body(sections, "완료 조건")

        task_prompt = "\n\n".join(
            raw
            for name, _, raw in sections
            if name in TASK_PROMPT_SECTION_NAMES
        )
        tasks.append(
            Task(
                number=number,
                title=title,
                prerequisite_numbers=_prerequisite_numbers(
                    prerequisite_body
                ),
                allowed_paths=_path_values(
                    allowed_paths_body
                ),
                forbidden_paths=_path_values(
                    forbidden_paths_body
                ),
                task_prompt=task_prompt,
                implementation_items=_bullet_values(implementation_body),
                verification_items=_bullet_values(verification_body),
                minimum_quality_score=_minimum_quality_score(completion_body),
            )
        )

    return ParsedPlan(common_prompt=common_prompt, tasks=tuple(tasks))

################ plan-end ###############










