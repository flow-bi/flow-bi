#!/usr/bin/env python3

import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


REQUIRED_TOP_SECTIONS = [
    "## 1. 기본 정보",
    "## 2. 실행 Task",
    "## 3. 전체 완료 조건",
    "## 4. 전체 실패 조건",
]

REQUIRED_BASIC_SECTIONS = [
    "### 사용자 요청",
    "### 작업 목적",
    "### 작업 유형",
    "### 관련 설계 문서",
]

REQUIRED_TASK_SECTIONS = [
    "#### 선행 Task",
    "#### 작업 목적",
    "#### 수정 가능 경로",
    "#### 수정 금지 경로",
    "#### 구현 항목",
    "#### 검증 항목",
    "#### 완료 조건",
    "#### 실패 조건",
    "#### 제외 범위",
    "#### 작업 결과",
    "#### 남은 문제",
]

FORBIDDEN_PATTERNS = [
    r"^####\s*담당\s*Worker\s*$",
    r"^\s*-\s*worker\s*:",
    r"^\s*worker\s*:",
    r"\bfe-worker\b",
    r"\bbe-worker\b",
    r"\bfrontend-worker\b",
    r"\bbackend-worker\b",
    r"docs/plan/active",
    r"docs/plan/complete",
    r"docs/plans/complete",
]

PLACEHOLDER_PATTERN = re.compile(r"\{[^}\n]+\}")


def add_error(errors: List[str], message: str) -> None:
    errors.append(message)


def read_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"파일이 존재하지 않습니다: {path}")
    return path.read_text(encoding="utf-8")


def to_repo_relative_path(path: Path) -> str:
    normalized = path.as_posix()
    marker = "docs/plans/active/"

    marker_index = normalized.find(marker)
    if marker_index >= 0:
        return normalized[marker_index:]

    return normalized


def validate_file_name(path: Path, text: str, errors: List[str]) -> Tuple[Optional[str], Optional[str]]:
    repo_relative = to_repo_relative_path(path)

    match = re.fullmatch(
        r"docs/plans/active/([a-z0-9]+(?:-[a-z0-9]+)*)-(\d{2})\.md",
        repo_relative,
    )

    if not match:
        add_error(
            errors,
            "Plan 파일 경로는 docs/plans/active/{feature}-{NN}.md 형식이어야 합니다.",
        )
        return None, None

    feature = match.group(1)
    number = match.group(2)

    if number == "00":
        add_error(errors, "Plan 번호는 01부터 시작해야 합니다. 00은 사용할 수 없습니다.")

    expected_title = f"# 작업 계획: {feature}-{number}"
    first_heading = next(
        (line.strip() for line in text.splitlines() if line.startswith("# ")),
        "",
    )

    if first_heading != expected_title:
        add_error(
            errors,
            f"Plan 제목이 파일명과 일치해야 합니다. 기대값: {expected_title}",
        )

    return feature, number


def validate_top_sections(text: str, errors: List[str]) -> None:
    for section in REQUIRED_TOP_SECTIONS:
        if section not in text:
            add_error(errors, f"필수 최상위 섹션이 없습니다: {section}")

    for section in REQUIRED_BASIC_SECTIONS:
        if section not in text:
            add_error(errors, f"기본 정보 필수 섹션이 없습니다: {section}")

    before_tasks = text.split("## 2. 실행 Task")[0]

    if "### 수정 가능 경로" in before_tasks:
        add_error(
            errors,
            "최상단 기본 정보에 수정 가능 경로를 두면 안 됩니다. Task별로 작성해야 합니다.",
        )

    if "### 수정 금지 경로" in before_tasks:
        add_error(
            errors,
            "최상단 기본 정보에 수정 금지 경로를 두면 안 됩니다. Task별로 작성해야 합니다.",
        )


def validate_forbidden_patterns(text: str, errors: List[str]) -> None:
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, text, re.MULTILINE):
            add_error(errors, f"금지된 형식 또는 경로가 포함되어 있습니다: {pattern}")


def validate_placeholders(text: str, errors: List[str]) -> None:
    placeholders = sorted(set(PLACEHOLDER_PATTERN.findall(text)))

    if placeholders:
        add_error(
            errors,
            "생성된 activePlan에 placeholder가 남아 있습니다: "
            + ", ".join(placeholders),
        )


def extract_tasks(text: str) -> List[Dict[str, object]]:
    task_header_pattern = re.compile(r"^### Task\s+(\d+)\.\s+(.+?)\s*$", re.MULTILINE)
    matches = list(task_header_pattern.finditer(text))
    tasks: List[Dict[str, object]] = []

    overall_match = re.search(r"^## 3\. 전체 완료 조건", text, re.MULTILINE)
    overall_start = overall_match.start() if overall_match else len(text)

    for index, match in enumerate(matches):
        start = match.start()

        if index + 1 < len(matches):
            end = matches[index + 1].start()
        else:
            end = overall_start

        tasks.append(
            {
                "number": int(match.group(1)),
                "title": match.group(2).strip(),
                "body": text[start:end].strip(),
            }
        )

    return tasks


def extract_section_body(block: str, section_name: str) -> str:
    pattern = re.compile(
        rf"^{re.escape(section_name)}\s*$([\s\S]*?)(?=^#### |\Z)",
        re.MULTILINE,
    )
    match = pattern.search(block)

    if not match:
        return ""

    return match.group(1).strip()


def has_markdown_bullet(body: str) -> bool:
    return bool(re.search(r"^\s*-\s+", body, re.MULTILINE))


def has_checkbox(body: str) -> bool:
    return bool(re.search(r"^\s*-\s*\[[ xX]\]\s+", body, re.MULTILINE))


def normalize_path_value(value: str) -> str:
    value = value.strip()
    value = value.strip("`")
    value = value.strip()
    return value


def extract_bullet_values(body: str) -> List[str]:
    values: List[str] = []

    for line in body.splitlines():
        stripped = line.strip()
        if not stripped.startswith("- "):
            continue

        value = stripped[2:].strip()
        values.append(normalize_path_value(value))

    return values


def validate_path_section(
    task_number: int,
    section_label: str,
    body: str,
    errors: List[str],
) -> None:
    if not body:
        add_error(errors, f"Task {task_number}의 {section_label} 섹션이 비어 있습니다.")
        return

    if not has_markdown_bullet(body):
        add_error(errors, f"Task {task_number}의 {section_label}는 bullet list로 작성해야 합니다.")
        return

    values = extract_bullet_values(body)

    if not values:
        add_error(errors, f"Task {task_number}의 {section_label}에 경로 항목이 없습니다.")
        return

    for value in values:
        if not value:
            add_error(errors, f"Task {task_number}의 {section_label}에 빈 경로가 있습니다.")

        if PLACEHOLDER_PATTERN.search(value):
            add_error(
                errors,
                f"Task {task_number}의 {section_label}에 placeholder 경로가 남아 있습니다: {value}",
            )

        if value in {".", "/", "*", "./"}:
            add_error(
                errors,
                f"Task {task_number}의 {section_label}가 너무 넓습니다: {value}",
            )


def validate_task_required_sections(task: Dict[str, object], errors: List[str]) -> None:
    task_number = int(task["number"])
    task_body = str(task["body"])

    for section in REQUIRED_TASK_SECTIONS:
        if section not in task_body:
            add_error(errors, f"Task {task_number}에 필수 섹션이 없습니다: {section}")


def validate_task_contents(task: Dict[str, object], errors: List[str]) -> None:
    task_number = int(task["number"])
    task_body = str(task["body"])

    purpose = extract_section_body(task_body, "#### 작업 목적")
    allowed_paths = extract_section_body(task_body, "#### 수정 가능 경로")
    forbidden_paths = extract_section_body(task_body, "#### 수정 금지 경로")
    implementation = extract_section_body(task_body, "#### 구현 항목")
    verification = extract_section_body(task_body, "#### 검증 항목")
    completion = extract_section_body(task_body, "#### 완료 조건")
    failure = extract_section_body(task_body, "#### 실패 조건")
    excluded = extract_section_body(task_body, "#### 제외 범위")
    result = extract_section_body(task_body, "#### 작업 결과")
    remaining = extract_section_body(task_body, "#### 남은 문제")

    if not purpose:
        add_error(errors, f"Task {task_number}의 작업 목적이 비어 있습니다.")

    validate_path_section(task_number, "수정 가능 경로", allowed_paths, errors)
    validate_path_section(task_number, "수정 금지 경로", forbidden_paths, errors)

    if not implementation or not has_checkbox(implementation):
        add_error(errors, f"Task {task_number}의 구현 항목은 checkbox list로 작성해야 합니다.")

    if not verification or not has_checkbox(verification):
        add_error(errors, f"Task {task_number}의 검증 항목은 checkbox list로 작성해야 합니다.")

    if not completion:
        add_error(errors, f"Task {task_number}의 완료 조건이 비어 있습니다.")

    if not failure:
        add_error(errors, f"Task {task_number}의 실패 조건이 비어 있습니다.")

    if not excluded:
        add_error(errors, f"Task {task_number}의 제외 범위가 비어 있습니다.")

    if not result:
        add_error(errors, f"Task {task_number}의 작업 결과가 비어 있습니다.")

    if not remaining:
        add_error(errors, f"Task {task_number}의 남은 문제가 비어 있습니다.")

    if "quality_score" not in completion:
        add_error(errors, f"Task {task_number}의 완료 조건에 quality_score 기준이 없습니다.")

    if "quality_score" not in failure:
        add_error(errors, f"Task {task_number}의 실패 조건에 quality_score 기준 미달 조건이 없습니다.")


def validate_task_sequence(tasks: List[Dict[str, object]], errors: List[str]) -> None:
    if not tasks:
        add_error(errors, "Task가 하나 이상 있어야 합니다.")
        return

    task_numbers = [int(task["number"]) for task in tasks]
    task_number_set = set(task_numbers)

    for expected_number, actual_number in enumerate(task_numbers, start=1):
        if actual_number != expected_number:
            add_error(
                errors,
                f"Task 번호는 1부터 순서대로 작성해야 합니다. 현재 번호: Task {actual_number}",
            )


    for task in tasks:
        task_number = int(task["number"])
        task_body = str(task["body"])
        prereq = extract_section_body(task_body, "#### 선행 Task")

        if not prereq:
            add_error(errors, f"Task {task_number}의 선행 Task가 비어 있습니다.")
            continue

        if "없음" in prereq:
            if task_number != 1:
                add_error(
                    errors,
                    f"Task {task_number}는 첫 번째 Task가 아니므로 선행 Task가 필요합니다.",
                )
            continue

        refs = [int(value) for value in re.findall(r"Task\s+(\d+)", prereq)]

        if not refs:
            add_error(
                errors,
                f"Task {task_number}의 선행 Task 형식이 올바르지 않습니다. 예: `Task 1`",
            )
            continue

        for ref in refs:
            if ref not in task_number_set:
                add_error(
                    errors,
                    f"Task {task_number}가 존재하지 않는 선행 Task를 참조합니다: Task {ref}",
                )

            if ref >= task_number:
                add_error(
                    errors,
                    f"Task {task_number}의 선행 Task는 현재 Task보다 앞선 번호여야 합니다: Task {ref}",
                )


def validate_task_chain_verification(tasks: List[Dict[str, object]], errors: List[str]) -> None:
    for task in tasks:
        task_number = int(task["number"])
        task_body = str(task["body"])
        prereq = extract_section_body(task_body, "#### 선행 Task")
        verification = extract_section_body(task_body, "#### 검증 항목")

        if task_number == 1 or "없음" in prereq:
            continue

        chain_keywords = ["선행 Task", "충돌", "회귀", "통합", "기존 기능"]

        if not any(keyword in verification for keyword in chain_keywords):
            add_error(
                errors,
                f"Task {task_number}의 검증 항목에 선행 Task 결과와의 충돌 또는 회귀 검증이 없습니다.",
            )


def validate_integration_task(tasks: List[Dict[str, object]], errors: List[str]) -> None:
    if len(tasks) < 2:
        return

    last_task = tasks[-1]
    last_title = str(last_task["title"])

    valid_keywords = ["통합 검증", "최종 검증", "전체 검증"]

    if not any(keyword in last_title for keyword in valid_keywords):
        add_error(
            errors,
            "Task가 2개 이상이면 마지막 Task는 통합 검증 Task여야 합니다. "
            "예: `### Task N. 통합 검증`",
        )


def validate_overall_sections(text: str, errors: List[str]) -> None:
    completion_section = extract_top_level_section(text, "## 3. 전체 완료 조건")
    failure_section = extract_top_level_section(text, "## 4. 전체 실패 조건")

    if "quality_score" not in completion_section:
        add_error(errors, "전체 완료 조건에 전체 quality_score 기준이 없습니다.")

    if "Product Spec" not in failure_section and "Design Doc" not in failure_section:
        add_error(
            errors,
            "전체 실패 조건에 Product Spec 또는 Design Doc 충돌 조건이 필요합니다.",
        )

    required_completion_keywords = [
        "모든 Task",
        "검증 항목",
        "수정 가능 경로",
        "수정 금지 경로",
    ]

    for keyword in required_completion_keywords:
        if keyword not in completion_section:
            add_error(errors, f"전체 완료 조건에 필수 기준이 부족합니다: {keyword}")


def extract_top_level_section(text: str, section_name: str) -> str:
    pattern = re.compile(
        rf"^{re.escape(section_name)}\s*$([\s\S]*?)(?=^## |\Z)",
        re.MULTILINE,
    )
    match = pattern.search(text)

    if not match:
        return ""

    return match.group(1).strip()


def validate_plan(path: Path) -> List[str]:
    errors: List[str] = []
    text = read_text(path)

    validate_file_name(path, text, errors)
    validate_top_sections(text, errors)
    validate_forbidden_patterns(text, errors)
    validate_placeholders(text, errors)

    tasks = extract_tasks(text)

    validate_task_sequence(tasks, errors)

    for task in tasks:
        validate_task_required_sections(task, errors)
        validate_task_contents(task, errors)

    validate_task_chain_verification(tasks, errors)
    validate_integration_task(tasks, errors)
    validate_overall_sections(text, errors)

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("사용법: python harness/scripts/validate_plan.py docs/plans/active/{feature}-{NN}.md")
        return 2

    path = Path(sys.argv[1])

    try:
        errors = validate_plan(path)
    except Exception as exc:
        print("Plan 검증 실패")
        print(f"- 원인: {exc}")
        return 1

    if errors:
        print("Plan 검증 실패")
        for index, error in enumerate(errors, start=1):
            print(f"{index}. {error}")
        return 1

    text = read_text(path)
    tasks = extract_tasks(text)

    print("Plan 검증 통과")
    print(f"- 파일: {to_repo_relative_path(path)}")
    print(f"- Task 수: {len(tasks)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())