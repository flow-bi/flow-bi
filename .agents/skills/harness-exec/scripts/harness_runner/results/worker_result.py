from __future__ import annotations

from dataclasses import replace

from ..models import Task, TaskInvocation, TaskResult, VerificationResult


MANDATORY_GATES = (
    "permission_security", "scope", "requirements", "tdd",
    "automated_verification", "contract_sync", "critical_findings",
)
EXPLICIT_FAILURE_DECISIONS = frozenset((
    "RETRY", "HUMAN_REVIEW_REQUIRED", "FAILED", "BLOCKED",
))


def return_code(result: object) -> int:
    if type(result) is int:
        return result
    value = getattr(result, "returncode", 0)
    return value if type(value) is int else 0


def _non_empty_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _report_contract_error(worker_result: object) -> str:
    output = getattr(worker_result, "output", None)
    if not isinstance(output, dict):
        return ""
    if not _non_empty_text(output.get("work_summary")):
        return "work_summary가 누락되었거나 비어 있습니다."
    remaining_issues = output.get("remaining_issues")
    if not isinstance(remaining_issues, list) or any(
        not _non_empty_text(issue) for issue in remaining_issues
    ):
        return "remaining_issues가 문자열 배열이 아닙니다."
    if output.get("final_status") not in {"PASS", "FAILED", "BLOCKED"}:
        return "final_status가 PASS, FAILED 또는 BLOCKED가 아닙니다."
    return ""


def objective_completion_error(task: Task, worker_result: object) -> str:
    output = getattr(worker_result, "output", None)
    output_error = getattr(worker_result, "output_error", "")
    if not isinstance(output, dict):
        detail = output_error if _non_empty_text(output_error) else "JSON 객체 없음"
        return f"Worker 결과 JSON이 유효하지 않습니다: {detail}"
    report_error = _report_contract_error(worker_result)
    if report_error:
        return report_error
    gates = output.get("mandatory_gates")
    if not isinstance(gates, dict):
        return "Mandatory Gate 결과가 누락되었습니다."
    for gate_name in MANDATORY_GATES:
        gate = gates.get(gate_name)
        if not isinstance(gate, dict):
            return f"Mandatory Gate {gate_name} 결과가 누락되었습니다."
        result = gate.get("result")
        if gate_name == "tdd" and result == "N/A":
            if not _non_empty_text(gate.get("reason")):
                return "TDD N/A에는 사유가 필요합니다."
        elif result != "PASS":
            return f"Mandatory Gate {gate_name}가 PASS가 아닙니다."
        if not _non_empty_text(gate.get("evidence")):
            return f"Mandatory Gate {gate_name}의 증거가 누락되었습니다."
    expected_verification = task.verification_items
    if not expected_verification:
        return "Plan의 검증 항목이 비어 있습니다."
    verification = output.get("verification")
    if not isinstance(verification, list):
        return "검증 결과가 누락되었습니다."
    if len(verification) != len(expected_verification):
        return "Plan의 모든 검증 항목과 Worker 검증 결과가 대응하지 않습니다."
    results_by_item: dict[str, dict[object, object]] = {}
    for item in verification:
        if not isinstance(item, dict) or not isinstance(item.get("item"), str):
            return "검증 결과 형식이 유효하지 않습니다."
        item_name = item["item"]
        if item_name in results_by_item:
            return f"검증 결과가 중복되었습니다: {item_name}"
        results_by_item[item_name] = item
    if set(results_by_item) != set(expected_verification):
        return "Plan의 모든 검증 항목과 Worker 검증 결과가 대응하지 않습니다."
    for item_name in expected_verification:
        verification_result = results_by_item[item_name]
        if verification_result.get("result") != "PASS":
            return f"검증 항목이 PASS가 아닙니다: {item_name}"
        if not _non_empty_text(verification_result.get("evidence")):
            return f"검증 증거가 누락되었습니다: {item_name}"
    quality_score = output.get("quality_score")
    if type(quality_score) is not int:
        return "quality_score가 누락되었거나 정수가 아닙니다."
    if task.minimum_quality_score is not None and quality_score < task.minimum_quality_score:
        return f"quality_score가 최소 기준 {task.minimum_quality_score}점 미만입니다."
    return ""


def completion_error(task: Task, worker_result: object) -> str:
    objective_error = objective_completion_error(task, worker_result)
    if objective_error:
        return objective_error
    output = worker_result.output
    decision = output.get("decision")
    if decision != "PASS":
        return f"Worker 판정이 PASS가 아닙니다: {decision!r}."
    if output.get("final_status") != "PASS":
        return "Worker final_status가 PASS가 아닙니다."
    return ""


def needs_decision_correction(task: Task, worker_result: object) -> bool:
    if objective_completion_error(task, worker_result):
        return False
    output = getattr(worker_result, "output", None)
    decision = output.get("decision") if isinstance(output, dict) else None
    return decision != "PASS" and decision not in EXPLICIT_FAILURE_DECISIONS


def decision_correction(invocation: TaskInvocation, worker_result: object) -> TaskInvocation:
    output = getattr(worker_result, "output")
    return replace(invocation, decision_correction={
        "prior_decision": output.get("decision"),
        "objective_evidence": {
            key: output.get(key)
            for key in ("work_summary", "mandatory_gates", "verification", "remaining_issues", "final_status", "quality_score")
        },
    })


def task_result_from_worker(
    task: Task, status: str, return_code_value: int | None, timed_out: bool,
    message: str, worker_output: dict[str, object] | None,
) -> TaskResult:
    verification = tuple(
        VerificationResult(item["item"], item["result"], item["evidence"])
        for item in (worker_output or {}).get("verification", [])
        if isinstance(item, dict) and all(isinstance(item.get(key), str) for key in ("item", "result", "evidence"))
    )
    raw_issues = (worker_output or {}).get("remaining_issues")
    remaining_issues = tuple(issue for issue in raw_issues if isinstance(issue, str) and issue.strip()) if isinstance(raw_issues, list) else ()
    if status != "succeeded" and message and message not in remaining_issues:
        remaining_issues = (*remaining_issues, message)
    return TaskResult(
        task.number, task.title, status, return_code_value, timed_out, message,
        str((worker_output or {}).get("work_summary", "")), verification,
        (worker_output or {}).get("quality_score") if type((worker_output or {}).get("quality_score")) is int else None,
        remaining_issues,
    )
