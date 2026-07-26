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


def _integer_field(value: dict[str, Any], field: str, location: str) -> int:
    field_value = _required_field(value, field, location)
    if not isinstance(field_value, int) or isinstance(field_value, bool):
        raise ValueError(f"{location}.{field} 필드는 정수여야 합니다.")
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


def _result_contract(
    number: int,
    verification_items: tuple[str, ...],
) -> str:
    contract = {
        "task_id": f"Task {number}",
        "mandatory_gates": {
            "permission_security": {"result": "PASS | FAIL", "evidence": "근거"},
            "scope": {"result": "PASS | FAIL", "evidence": "근거"},
            "requirements": {"result": "PASS | FAIL", "evidence": "근거"},
            "tdd": {
                "result": "PASS | FAIL | N/A",
                "evidence": "근거",
                "reason": "N/A인 경우 필수 사유",
            },
            "automated_verification": {
                "result": "PASS | FAIL",
                "evidence": "근거",
            },
            "contract_sync": {"result": "PASS | FAIL", "evidence": "근거"},
            "critical_findings": {"result": "PASS | FAIL", "evidence": "근거"},
        },
        "verification": [
            {
                "item": item,
                "result": "PASS | FAIL | NOT_RUN",
                "evidence": "실행 명령, 출력 또는 확인 근거",
            }
            for item in verification_items
        ],
        "remaining_issues": [],
        "decision": (
            "PASS | PASS_WITH_FOLLOW_UP | RETRY | "
            "HUMAN_REVIEW_REQUIRED | FAILED | BLOCKED"
        ),
        "quality_score": 0,
    }
    return (
        "최종 응답 계약:\n"
        "docs/quality/quality-model.md의 의미를 유지하여 아래 구조의 유효한 "
        "JSON 객체 하나만 최종 출력하십시오. Markdown 코드 펜스, 설명, "
        "머리말을 추가하지 마십시오. 모든 검증 item은 아래 문자열을 그대로 "
        "사용하고 각각 실제 결과와 비어 있지 않은 evidence를 기록하십시오. "
        "결과 JSON 외에는 아무 내용도 출력하지 마십시오.\n"
        + json.dumps(contract, ensure_ascii=False, indent=2)
    )


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

    number = _integer_field(task, "number", "TaskInvocation.task")
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
    _string_tuple_field(task, "implementation_items", "TaskInvocation.task")
    verification_items = _string_tuple_field(
        task,
        "verification_items",
        "TaskInvocation.task",
    )
    _integer_field(task, "minimum_quality_score", "TaskInvocation.task")

    prompt_parts = [common_prompt]
    if additional_request:
        prompt_parts.append(additional_request)
    prompt_parts.extend(
        (
            _task_heading(number, title, prerequisite_numbers),
            task_prompt,
            _result_contract(number, verification_items),
        )
    )
    return "\n\n".join(prompt_parts), allowed_paths, forbidden_paths


def read_invocation(arguments: list[str] | None = None) -> InvocationResult:
    """명령줄에서 정확히 하나의 TaskInvocation JSON 인자를 읽는다."""
    values = sys.argv[1:] if arguments is None else arguments
    if len(values) != 1:
        raise ValueError(
            "TaskInvocation JSON은 명령줄 인자 하나로 전달해야 합니다."
        )
    return parse_invocation(values[0])
