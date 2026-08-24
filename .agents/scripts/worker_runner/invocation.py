from __future__ import annotations

import json
import sys
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

DISCOVERY_GUIDANCE = (
    "저장소 지침 파일은 `rg --files -g AGENTS.md`로 검색하고, "
    "build 및 Gradle 캐시 디렉터리를 재귀 탐색하지 마십시오."
)

TASK_WORKER_GUIDANCE = (
    "현재 세션은 이미 Harness Task Worker입니다. 전달된 Task를 허용 경로 안에서 "
    "직접 구현하고 검증하십시오. harness-exec, harness-plan 또는 다른 Harness "
    "Skill과 실행 스크립트를 재호출하지 마십시오. 또한  모든 timeout은 90분으로 설정해 확인합니다."
)

BROWSER_VERIFICATION_GUIDANCE = (
    "Cypress 브라우저 검증은 Worker에서 직접 실행하지 말고 "
    "부모가 전달한 `FLOW_BI_PYTHON_EXECUTABLE`로 "
    "`.agents/scripts/run-browser-verifier.py cypress`를 실행하십시오. "
    "macOS/Linux shell에서는 "
    "`\"$FLOW_BI_PYTHON_EXECUTABLE\" .agents/scripts/run-browser-verifier.py cypress`, "
    "Windows PowerShell에서는 "
    "`& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/run-browser-verifier.py cypress`를 "
    "사용하십시오. "
    "이 명령은 Harness 부모에서 `npm run test:e2e`를 실행하고 동일한 종료 코드와 "
    "로그를 반환합니다. 검증이 실패하면 로그를 분석해 허용 범위의 구현 또는 "
    "테스트를 수정한 뒤 같은 명령을 재실행하여 Green을 확인하십시오."
)

BACKEND_VERIFICATION_GUIDANCE = (
    "Backend Gradle 검증은 Worker에서 `gradlew`를 직접 실행하지 말고 부모가 전달한 "
    "`FLOW_BI_PYTHON_EXECUTABLE`로 "
    "`.agents/scripts/worker_runner/backend_verifier.py <Gradle 인자...>`를 실행하십시오. "
    "macOS/Linux shell에서는 "
    "`\"$FLOW_BI_PYTHON_EXECUTABLE\" .agents/scripts/worker_runner/backend_verifier.py test`, "
    "Windows PowerShell에서는 "
    "`& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/worker_runner/backend_verifier.py test`를 "
    "사용하십시오. 부모 서비스는 `test`, `spotlessCheck`, `build`, `assemble`, `compileJava`와 "
    "안전한 `--tests` 필터만 허용하며 출력과 종료 코드를 반환합니다. shell 도구가 이 Backend "
    "verifier 명령에 진행 중 상태 또는 실행 session을 반환하면 같은 verifier CLI를 새 shell 명령으로 "
    "시작하지 마십시오. 기존 실행을 wait/poll하여 최종 종료 코드와 출력을 확인하십시오. 동일 "
    "요청은 부모 verifier에서 single-flight로 결합됩니다. 이전 실행이 확정적으로 종료된 뒤에만, 실패 "
    "원인을 수정했거나 명시적인 재검증이 필요한 경우에 같은 명령을 재실행하십시오. HTTP 429 등 실행 "
    "중 충돌 응답만으로 필수 검증을 실패 처리하지 말고 기존 실행의 최종 결과를 먼저 확인하십시오. "
    "최종 JSON에는 완료된 최신 검증 결과만 반영하고, 나중에 도착한 완료 결과와 모순되는 "
    "`automated_verification` 또는 `decision`을 제출하지 마십시오. "
    "실패하면 로그를 분석해 허용 범위 구현 또는 테스트를 수정한 뒤 같은 명령을 재실행하여 Green을 "
    "확인하십시오."
)

BACKEND_FORMATTING_GUIDANCE = (
    "`spotlessCheck`가 실패한 경우 직접 `gradlew` 또는 저장소 전체에 적용되는 "
    "`spotlessApply`를 실행하지 마십시오. 현재 Task에서 수정 가능한 Backend Java 파일만 "
    "부모 formatter로 전달하려면 macOS/Linux shell에서 "
    "`\"$FLOW_BI_PYTHON_EXECUTABLE\" .agents/scripts/worker_runner/backend_verifier.py "
    "format-java backend/src/main/java/example/Example.java`를 실행하십시오. "
    "이 명령은 Task 경로 계약에 포함된 기존 일반 `.java` 파일만 임시 작업공간에서 "
    "포맷하고 성공한 결과만 반영합니다."
)

FRONTEND_VERIFICATION_GUIDANCE = (
    "Frontend npm 검증은 Worker에서 직접 `npm`으로 실행하지 말고 부모가 전달한 "
    "`FLOW_BI_PYTHON_EXECUTABLE`로 "
    "`.agents/scripts/worker_runner/frontend_verifier.py <npm 인자...>`를 실행하십시오. "
    "macOS/Linux shell에서는 "
    "`\"$FLOW_BI_PYTHON_EXECUTABLE\" .agents/scripts/worker_runner/frontend_verifier.py run test:unit`, "
    "Windows PowerShell에서는 "
    "`& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/worker_runner/frontend_verifier.py run test:unit`를 "
    "사용하십시오. 부모 서비스는 `npm ls`, `npm run test:unit`, `npm run typecheck`, "
    "`npm run check`만 허용하며 출력과 종료 코드를 반환합니다."
)


def _result_contract(
    number: int,
    verification_items: tuple[str, ...],
) -> str:
    contract = {
        "task_id": f"Task {number}",
        "work_summary": "수행한 변경을 간결하게 요약",
        "mandatory_gates": {
            "permission_security": {"result": "PASS | FAIL", "evidence": "근거"},
            "scope": {"result": "PASS | FAIL", "evidence": "근거"},
            "requirements": {"result": "PASS | FAIL", "evidence": "근거"},
            "tdd": {
                "result": "PASS | FAIL | N/A",
                "evidence": "근거",
                "reason": "N/A인 경우 필수 사유",
                "reused_evidence": {
                    "record_id": "재사용한 실행 기록 ID 또는 null",
                    "fingerprint": "재사용한 Task 계약 fingerprint 또는 null",
                },
                "current_verification_evidence": (
                    "이번 실행에서 확인한 Green 및 회귀 검증 근거"
                ),
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
        "remaining_issues": ["남은 문제 또는 후속 작업; 없으면 빈 배열"],
        "decision": (
            "PASS | PASS_WITH_FOLLOW_UP | RETRY | "
            "HUMAN_REVIEW_REQUIRED | FAILED | BLOCKED"
        ),
        "final_status": "PASS | FAILED | BLOCKED",
        "quality_score": 0,
    }
    return (
        "최종 응답 계약:\n"
        "docs/quality/quality-model.md의 의미를 유지하여 아래 구조의 유효한 "
        "JSON 객체 하나만 최종 출력하십시오. Markdown 코드 펜스, 설명, "
        "머리말을 추가하지 마십시오. 모든 검증 item은 아래 문자열을 그대로 "
        "사용하고 각각 실제 결과와 비어 있지 않은 evidence를 기록하십시오. "
        "결과 JSON 외에는 아무 내용도 출력하지 마십시오. 모든 객관적 성공 조건을 "
        "충족한 경우 성공 판정은 정확히 `PASS`만 사용하십시오. "
        "`PASS_WITH_FOLLOW_UP`, `HUMAN_REVIEW_REQUIRED` 또는 임의 판정으로 "
        "성공을 대체하지 마십시오.\n"
        + json.dumps(contract, ensure_ascii=False, indent=2)
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
        return (
            "동일 Task 계약 fingerprint 재실행입니다. 제공된 `prior_tdd_evidence`와 `prior_evidence_id`는 "
            "실행기가 검증한 과거 TDD 증거입니다. 새로운 Red 실패를 인위적으로 만들지 마십시오. "
            "대신 현재 Green 및 회귀 검증을 실행하고, 최종 JSON의 `tdd.reused_evidence`에 "
            "해당 식별자와 fingerprint를, `tdd.current_verification_evidence`에 이번 실행의 "
            "검증 근거를 각각 기록하십시오. 현재 검증이 실패하거나 근거가 없으면 TDD PASS나 "
            "PASS 판정을 보고하지 마십시오."
        )
    if mode == NEW_OR_CHANGED:
        return (
            "신규 또는 변경된 Task 계약 fingerprint입니다. 이 계약에는 과거 TDD 증거를 재사용하지 마십시오. "
            "현재 리비전에 대해 Red → Green → Refactor를 수행하고 각 단계와 현재 검증 근거를 "
            "최종 JSON에 기록하십시오."
        )
    return (
        "검증된 과거 TDD 증거가 없는 기존 구현입니다. 인위적인 Red 실패를 만들지 마십시오. "
        "TDD `PASS`로 보고하지 마십시오. TDD Gate를 FAIL로 기록한 뒤 decision을 "
        "HUMAN_REVIEW_REQUIRED로 반환하십시오. 사람 검토 없이 성공으로 위장하지 마십시오."
    )


def _decision_correction_guidance(correction: object) -> str:
    if correction is None:
        return ""
    if not isinstance(correction, dict):
        raise ValueError("판정 교정 컨텍스트 형식이 유효하지 않습니다.")

    prior_decision = correction.get("prior_decision")
    evidence = correction.get("objective_evidence")
    if not isinstance(evidence, dict):
        raise ValueError("판정 교정에는 기존 검증 증거가 필요합니다.")
    return (
        "판정 교정 요청입니다. 기존 Worker 결과의 Mandatory Gate, 검증 항목과 "
        "quality_score는 실행기가 이미 아래와 같이 확인했습니다. 제품 구현, 테스트, "
        "검증을 다시 수행하거나 변경하지 마십시오. 기존 증거를 바꾸지 말고 최종 결과 "
        "계약만 바로잡아 유효한 JSON 객체 하나를 반환하십시오. 객관적 성공 조건을 "
        "충족하면 성공 판정은 정확히 `PASS`만 허용합니다. "
        "`PASS_WITH_FOLLOW_UP` 등 후속 조치 판정은 성공을 대체할 수 없습니다. "
        "성공 조건과 모순되는 실제 실패 근거가 있다면 해당 Gate 또는 검증 항목을 FAIL로 "
        "기록하고 실패 판정을 반환하십시오.\n"
        + json.dumps(
            {"prior_decision": prior_decision, "objective_evidence": evidence},
            ensure_ascii=False,
            indent=2,
        )
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
        DISCOVERY_GUIDANCE,
        TASK_WORKER_GUIDANCE,
        BROWSER_VERIFICATION_GUIDANCE,
        BACKEND_VERIFICATION_GUIDANCE,
        BACKEND_FORMATTING_GUIDANCE,
        FRONTEND_VERIFICATION_GUIDANCE,
        "실행 컨텍스트 (실행기가 검증함):\n"
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
