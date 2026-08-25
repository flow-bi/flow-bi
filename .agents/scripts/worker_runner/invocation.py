from __future__ import annotations

import json
import re
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any


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

PROMPT_FILE = Path(__file__).with_name("worker-prompt.md")


@lru_cache(maxsize=None)
def _prompt_sections() -> dict[str, str]:
    """단일 Markdown 문서에서 Worker 안내 섹션을 읽는다."""
    content = PROMPT_FILE.read_text(encoding="utf-8")
    headings = tuple(re.finditer(r"^## ([a-z0-9-]+)\s*$", content, re.MULTILINE))
    sections: dict[str, str] = {}
    for index, heading in enumerate(headings):
        start = heading.end()
        end = headings[index + 1].start() if index + 1 < len(headings) else len(content)
        sections[heading.group(1)] = content[start:end].strip()
    return sections


def _prompt(name: str) -> str:
    return _prompt_sections()[name]


def _result_contract(
    number: int,
    verification_items: tuple[str, ...],
) -> str:
    verification = [
        {
            "item": item,
            "result": "PASS | FAIL | NOT_RUN",
            "evidence": "실행 명령, 출력 또는 확인 근거",
        }
        for item in verification_items
    ]
    return _prompt("result-contract").replace(
        "{{TASK_NUMBER}}",
        str(number),
    ).replace(
        "{{VERIFICATION_ITEMS}}",
        json.dumps(
            verification,
            ensure_ascii=False,
            indent=2,
        ),
    )


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


def _execution_guidance(context: ExecutionContext) -> str:
    mode = context["mode"]
    if mode == RERUN:
        return _prompt("execution-rerun")
    if mode == NEW_OR_CHANGED:
        return _prompt("execution-new-or-changed")
    return _prompt("execution-existing-without-evidence")


def _decision_correction_guidance(correction: object) -> str:
    if correction is None:
        return ""
    if not isinstance(correction, dict):
        raise ValueError("판정 교정 컨텍스트 형식이 유효하지 않습니다.")

    prior_decision = correction.get("prior_decision")
    evidence = correction.get("objective_evidence")
    if not isinstance(evidence, dict):
        raise ValueError("판정 교정에는 기존 검증 증거가 필요합니다.")
    return _prompt("decision-correction") + "\n" + json.dumps(
        {"prior_decision": prior_decision, "objective_evidence": evidence},
        ensure_ascii=False,
        indent=2,
    )


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
    decision_correction_guidance = _decision_correction_guidance(
        invocation.get("decision_correction")
    )

    prompt_parts = [
        common_prompt,
        _prompt("discovery-guidance"),
        _prompt("context-efficiency-guidance"),
        _prompt("task-worker-guidance"),
        _prompt("browser-verification-guidance"),
        _prompt("backend-verification-guidance"),
        _prompt("backend-formatting-guidance"),
        _prompt("frontend-verification-guidance"),
        _prompt("execution-context") + "\n"
        + json.dumps(execution_context, ensure_ascii=False, indent=2),
        _execution_guidance(execution_context),
    ]

    if decision_correction_guidance:
        prompt_parts.append(decision_correction_guidance)

    if additional_request:
        prompt_parts.append(additional_request)

    prompt_parts.extend(
        (
            title,
            task_prompt,
            _result_contract(number, verification_items),
        )
    )

    return (
        "\n\n".join(prompt_parts),
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
