from __future__ import annotations

import json
import sys
from typing import Any


InvocationResult = tuple[str, tuple[str, ...], tuple[str, ...]]

DISCOVERY_GUIDANCE = (
    "저장소 지침 파일은 `rg --files -g AGENTS.md`로 검색하고, "
    "build 및 Gradle 캐시 디렉터리를 재귀 탐색하지 마십시오."
)


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

    task = invocation["task"]

    common_prompt = invocation["common_prompt"]
    additional_request = invocation["additional_request"]

    number = task["number"]
    title = task["title"]
    task_prompt = task["task_prompt"]

    allowed_paths = tuple(task["allowed_paths"])
    forbidden_paths = tuple(task["forbidden_paths"])
    verification_items = tuple(task["verification_items"])

    prompt_parts = [common_prompt, DISCOVERY_GUIDANCE]

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
