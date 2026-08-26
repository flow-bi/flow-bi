from __future__ import annotations

from typing import Any


ExecutionContext = dict[str, object]

NEW_OR_CHANGED = "new_or_changed"
RERUN = "rerun"
EXISTING_WITHOUT_EVIDENCE = "existing_without_evidence"

EXECUTION_MODES = frozenset((NEW_OR_CHANGED, RERUN, EXISTING_WITHOUT_EVIDENCE))


# 특정 Task 리비전의 실행 기록 ID 생성
def _record_id(plan_id: str, number: int, fingerprint: str) -> str:
    return f"plan:{plan_id}:task:{number}:fingerprint:{fingerprint}"


# 이전 TDD 증거가 재사용 가능한 PASS 기록인지 검사
def _valid_prior_tdd_evidence(value: object) -> bool:
    return (
        isinstance(value, dict)
        and value.get("result") == "PASS"
        and isinstance(value.get("evidence"), str)
        and bool(value["evidence"].strip())
    )


# 실행 컨텍스트를 검증하고 Worker Prompt용 형태로 변환
def build_execution_context(
    invocation: dict[str, Any],
    number: int,
) -> ExecutionContext:
    raw_context = invocation.get("execution_context")

    # 실행 컨텍스트를 전달하지 않는 이전 호출자는
    # 검증된 TDD 증거가 없는 기존 Task로 처리한다.
    if raw_context is None:
        return {
            "plan_id": "unknown",
            "fingerprint": "unknown",
            "mode": EXISTING_WITHOUT_EVIDENCE,
            "prior_tdd_evidence": None,
            "prior_evidence_id": None,
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
            _record_id(plan_id, number, fingerprint)
            if mode == RERUN
            else None
        ),
    }
