from __future__ import annotations

import json
import sys

from .execution_context import build_execution_context
from .prompt import build_worker_prompt, load_prompt_sections


InvocationResult = tuple[str, tuple[str, ...], tuple[str, ...]]

def parse_invocation(raw_invocation: str) -> InvocationResult:
    """단일 TaskInvocation JSON을 실행 Prompt와 경로 계약으로 변환한다."""
    try:
        invocation = json.loads(raw_invocation)
    except (json.JSONDecodeError, TypeError) as error:
        raise ValueError("TaskInvocation은 유효한 JSON이어야 합니다.") from error

    task = invocation["task"]

    common_prompt = invocation["common_prompt"]
    additional_request = invocation["additional_request"]

    number = task["number"]
    title = task["title"]
    task_prompt = task["task_prompt"]

    allowed_paths = tuple(task["allowed_paths"])
    forbidden_paths = tuple(task["forbidden_paths"])
    verification_items = tuple(task["verification_items"])
    execution_context = build_execution_context(invocation, number)
    return (
        build_worker_prompt(
            sections=load_prompt_sections(),
            common_prompt=common_prompt,
            additional_request=additional_request,
            title=title,
            task_prompt=task_prompt,
            number=number,
            verification_items=verification_items,
            execution_context=execution_context,
            decision_correction=invocation.get("decision_correction"),
        ),
        allowed_paths,
        forbidden_paths,
    )


def read_invocation(arguments: list[str] | None = None) -> InvocationResult:
    """명령줄에서 정확히 하나의 TaskInvocation JSON 인자를 읽는다."""
    values = sys.argv[1:] if arguments is None else arguments
    if len(values) != 1:
        raise ValueError(
            "TaskInvocation JSON은 명령줄 인자 하나로 전달해야 합니다."
        )
    return parse_invocation(values[0])
