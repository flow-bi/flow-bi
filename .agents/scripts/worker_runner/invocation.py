from __future__ import annotations

import json
import sys
from typing import Any


InvocationResult = tuple[str, tuple[str, ...], tuple[str, ...]]


def _required_field(value: dict[str, Any], field: str, location: str) -> Any:
    if field not in value:
        raise ValueError(f"{location}.{field} 필드가 필요합니다.")
    return value[field]


def _string_field(value: dict[str, Any], field: str, location: str) -> str:
    field_value = _required_field(value, field, location)
    if not isinstance(field_value, str):
        raise ValueError(f"{location}.{field} 필드는 문자열이어야 합니다.")
    return field_value


def _integer_tuple_field(
    value: dict[str, Any],
    field: str,
    location: str,
) -> tuple[int, ...]:
    field_value = _required_field(value, field, location)
    if not isinstance(field_value, list) or any(
        not isinstance(item, int) or isinstance(item, bool)
        for item in field_value
    ):
        raise ValueError(f"{location}.{field} 필드는 정수 배열이어야 합니다.")
    return tuple(field_value)


def _string_tuple_field(
    value: dict[str, Any],
    field: str,
    location: str,
) -> tuple[str, ...]:
    field_value = _required_field(value, field, location)
    if not isinstance(field_value, list) or any(
        not isinstance(item, str) for item in field_value
    ):
        raise ValueError(f"{location}.{field} 필드는 문자열 배열이어야 합니다.")
    return tuple(field_value)


def _task_heading(
    number: int,
    title: str,
    prerequisite_numbers: tuple[int, ...],
) -> str:
    prerequisites = (
        ", ".join(f"Task {value}" for value in prerequisite_numbers)
        if prerequisite_numbers
        else "없음"
    )
    return f"Task {number}. {title}\n\n선행 Task: {prerequisites}"


def parse_invocation(raw_invocation: str) -> InvocationResult:
    """단일 TaskInvocation JSON을 실행 Prompt와 경로 계약으로 변환한다."""
    try:
        invocation = json.loads(raw_invocation)
    except (json.JSONDecodeError, TypeError) as error:
        raise ValueError("TaskInvocation은 유효한 JSON이어야 합니다.") from error

    if not isinstance(invocation, dict):
        raise ValueError("TaskInvocation JSON의 최상위 값은 객체여야 합니다.")

    common_prompt = _string_field(invocation, "common_prompt", "TaskInvocation")
    additional_request = _string_field(
        invocation,
        "additional_request",
        "TaskInvocation",
    )
    task = _required_field(invocation, "task", "TaskInvocation")
    if not isinstance(task, dict):
        raise ValueError("TaskInvocation.task 필드는 객체여야 합니다.")

    number = _required_field(task, "number", "TaskInvocation.task")
    if not isinstance(number, int) or isinstance(number, bool):
        raise ValueError("TaskInvocation.task.number 필드는 정수여야 합니다.")

    title = _string_field(task, "title", "TaskInvocation.task")
    prerequisite_numbers = _integer_tuple_field(
        task,
        "prerequisite_numbers",
        "TaskInvocation.task",
    )
    allowed_paths = _string_tuple_field(
        task,
        "allowed_paths",
        "TaskInvocation.task",
    )
    forbidden_paths = _string_tuple_field(
        task,
        "forbidden_paths",
        "TaskInvocation.task",
    )
    task_prompt = _string_field(task, "task_prompt", "TaskInvocation.task")

    prompt_parts = [common_prompt]
    if additional_request:
        prompt_parts.append(additional_request)
    prompt_parts.extend(
        (
            _task_heading(number, title, prerequisite_numbers),
            task_prompt,
        )
    )
    prompt = "\n\n".join(prompt_parts)
    return prompt, allowed_paths, forbidden_paths


def read_invocation(arguments: list[str] | None = None) -> InvocationResult:
    """명령줄에서 정확히 하나의 TaskInvocation JSON 인자를 읽는다."""
    values = sys.argv[1:] if arguments is None else arguments
    if len(values) != 1:
        raise ValueError(
            "TaskInvocation JSON은 명령줄 인자 하나로 전달해야 합니다."
        )
    return parse_invocation(values[0])
