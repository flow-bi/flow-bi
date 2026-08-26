from __future__ import annotations

import json
import sys
from typing import Any

from .prompt import build_worker_prompt, load_prompt_sections


InvocationResult = tuple[str, tuple[str, ...], tuple[str, ...]]
ExecutionContext = dict[str, object]

NEW_OR_CHANGED = "new_or_changed"
RERUN = "rerun"
EXISTING_WITHOUT_EVIDENCE = "existing_without_evidence"
EXECUTION_MODES = frozenset((
    NEW_OR_CHANGED,
    RERUN,
    EXISTING_WITHOUT_EVIDENCE,
))

def _record_id(plan_id: str, number: int, fingerprint: str) -> str:
    return f"plan:{plan_id}:task:{number}:fingerprint:{fingerprint}"


def _valid_prior_tdd_evidence(value: object) -> bool:
    return (
        isinstance(value, dict)
        and value.get("result") == "PASS"
        and isinstance(value.get("evidence"), str)
        and bool(value["evidence"].strip())
    )


def _execution_context(invocation: dict[str, Any], number: int) -> ExecutionContext:
    raw_context = invocation.get("execution_context")
    if raw_context is None:
        # Older callers cannot prove that a completed implementation has TDD
        # evidence. Keep the conservative behaviour until they send a context.
        return {
            "plan_id": "unknown",
            "fingerprint": "unknown",
            "mode": EXISTING_WITHOUT_EVIDENCE,
            "prior_tdd_evidence": None,
        }
    if not isinstance(raw_context, dict):
        raise ValueError("실행 컨텍스트 형식이 유효하지 않습니다.")

    plan_id = raw_context.get("plan_id")
    fingerprint = raw_context.get("fingerprint")
    mode = raw_context.get("mode")
    prior_evidence = raw_context.get("prior_tdd_evidence")
    if not isinstance(plan_id, str) or not plan_id.strip():
        raise ValueError("실행 컨텍스트의 plan_id가 유효하지 않습니다.")
    if not isinstance(fingerprint, str) or not fingerprint.strip():
        raise ValueError("실행 컨텍스트의 fingerprint가 유효하지 않습니다.")
    if mode not in EXECUTION_MODES:
        raise ValueError("실행 컨텍스트의 mode가 유효하지 않습니다.")
    if mode == RERUN:
        if not _valid_prior_tdd_evidence(prior_evidence):
            raise ValueError("동일 리비전 재실행에는 검증된 선행 TDD 증거가 필요합니다.")
    elif prior_evidence is not None:
        raise ValueError("변경되었거나 증거 없는 리비전에는 선행 TDD 증거를 재사용할 수 없습니다.")

    return {
        "plan_id": plan_id,
        "fingerprint": fingerprint,
        "mode": mode,
        "prior_tdd_evidence": prior_evidence,
        "prior_evidence_id": (
            _record_id(plan_id, number, fingerprint) if mode == RERUN else None
        ),
    }


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
    execution_context = _execution_context(invocation, number)
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
