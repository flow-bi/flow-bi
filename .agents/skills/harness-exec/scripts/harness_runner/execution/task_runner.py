from __future__ import annotations

from collections.abc import Mapping
from dataclasses import replace
from pathlib import Path
import subprocess

from verifier_runtime import VerifierRuntime
from worker_runner import WorkerExecutionRequest, WorkerExecutionResult, execute_worker

from ..models.plan import Task
from ..models.request import HarnessRequest
from ..models.result import TaskResult, VerificationResult
from ..preparation.worker_settings import TaskWorkerSettings
from ..results.evidence import (
    EvidenceError,
    TaskEvidenceStore,
    task_contract_fingerprint,
)


MANDATORY_GATES = (
    "permission_security",
    "scope",
    "requirements",
    "tdd",
    "automated_verification",
    "contract_sync",
    "critical_findings",
)
EXPLICIT_FAILURE_DECISIONS = frozenset(
    ("RETRY", "HUMAN_REVIEW_REQUIRED", "FAILED", "BLOCKED")
)


def _non_empty_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _objective_completion_error(task: Task, worker_result: WorkerExecutionResult) -> str:
    output = worker_result.output
    if not isinstance(output, dict):
        detail = (
            worker_result.output_error
            if _non_empty_text(worker_result.output_error)
            else "JSON 객체 없음"
        )
        return f"Worker 결과 JSON이 유효하지 않습니다: {detail}"
    if not _non_empty_text(output.get("work_summary")):
        return "work_summary가 누락되었거나 비어 있습니다."
    remaining_issues = output.get("remaining_issues")
    if not isinstance(remaining_issues, list) or any(
        not _non_empty_text(issue) for issue in remaining_issues
    ):
        return "remaining_issues가 문자열 배열이 아닙니다."
    if output.get("final_status") not in {"PASS", "FAILED", "BLOCKED"}:
        return "final_status가 PASS, FAILED 또는 BLOCKED가 아닙니다."

    gates = output.get("mandatory_gates")
    if not isinstance(gates, dict):
        return "Mandatory Gate 결과가 누락되었습니다."
    for gate_name in MANDATORY_GATES:
        gate = gates.get(gate_name)
        if not isinstance(gate, dict):
            return f"Mandatory Gate {gate_name} 결과가 누락되었습니다."
        gate_result = gate.get("result")
        if gate_name == "tdd" and gate_result == "N/A":
            if not _non_empty_text(gate.get("reason")):
                return "TDD N/A에는 사유가 필요합니다."
        elif gate_result != "PASS":
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


def _worker_completion_error(task: Task, worker_result: WorkerExecutionResult) -> str:
    objective_error = _objective_completion_error(task, worker_result)
    if objective_error:
        return objective_error
    output = worker_result.output
    if output.get("decision") != "PASS":
        return f"Worker 판정이 PASS가 아닙니다: {output.get('decision')!r}."
    if output.get("final_status") != "PASS":
        return "Worker final_status가 PASS가 아닙니다."
    return ""


def _needs_decision_correction(task: Task, worker_result: WorkerExecutionResult) -> bool:
    if _objective_completion_error(task, worker_result):
        return False
    output = worker_result.output
    decision = output.get("decision") if isinstance(output, dict) else None
    return decision != "PASS" and decision not in EXPLICIT_FAILURE_DECISIONS


def _build_decision_correction(worker_result: WorkerExecutionResult) -> dict[str, object]:
    output = worker_result.output
    return {
        "prior_decision": output.get("decision"),
        "objective_evidence": {
            key: output.get(key)
            for key in (
                "work_summary",
                "mandatory_gates",
                "verification",
                "remaining_issues",
                "final_status",
                "quality_score",
            )
        },
    }


def _task_result_from_worker_output(
    task: Task,
    status: str,
    return_code: int | None,
    timed_out: bool,
    message: str,
    worker_output: dict[str, object] | None,
) -> TaskResult:
    verification = tuple(
        VerificationResult(item["item"], item["result"], item["evidence"])
        for item in (worker_output or {}).get("verification", [])
        if isinstance(item, dict)
        and all(
            isinstance(item.get(key), str)
            for key in ("item", "result", "evidence")
        )
    )
    raw_issues = (worker_output or {}).get("remaining_issues")
    remaining_issues = (
        tuple(
            issue
            for issue in raw_issues
            if isinstance(issue, str) and issue.strip()
        )
        if isinstance(raw_issues, list)
        else ()
    )
    if status != "succeeded" and message and message not in remaining_issues:
        remaining_issues = (*remaining_issues, message)
    quality_score = (worker_output or {}).get("quality_score")
    return TaskResult(
        task.number,
        task.title,
        status,
        return_code,
        timed_out,
        message,
        str((worker_output or {}).get("work_summary", "")),
        verification,
        quality_score if type(quality_score) is int else None,
        remaining_issues,
    )


class TaskRunner:
    def __init__(
        self,
        *,
        common_prompt: str,
        request: HarnessRequest,
        worker_settings_by_task: Mapping[int, TaskWorkerSettings],
        codex_executable: str,
        project_root: Path,
        verifier_runtime: VerifierRuntime,
        evidence_store: TaskEvidenceStore,
    ) -> None:
        self.common_prompt = common_prompt
        self.request = request
        self.worker_settings_by_task = worker_settings_by_task
        self.codex_executable = codex_executable
        self.project_root = project_root
        self.verifier_runtime = verifier_runtime
        self.evidence_store = evidence_store

    def run(self, task: Task) -> TaskResult:
        task_fingerprint = task_contract_fingerprint(self.request.plan_id, task)
        try:
            prior_evidence = self.evidence_store.load_valid_evidence(
                self.request.plan_id,
                task.number,
                task_fingerprint,
            )
        except EvidenceError as error:
            return TaskResult(
                task.number,
                task.title,
                "failed",
                message=f"HUMAN_REVIEW_REQUIRED: {error}",
            )

        task_execution_context = {
            "plan_id": self.request.plan_id,
            "fingerprint": task_fingerprint,
            "mode": "rerun" if prior_evidence else "new_or_changed",
            "prior_tdd_evidence": (
                prior_evidence["tdd_evidence"] if prior_evidence else None
            ),
        }
        worker_settings = self.worker_settings_by_task[task.number]
        initial_request = WorkerExecutionRequest(
            task_number=task.number,
            common_prompt=self.common_prompt,
            additional_request=self.request.additional_request,
            title=task.title,
            task_prompt=task.task_prompt,
            task_execution_context=task_execution_context,
            decision_correction=None,
            executable=self.codex_executable,
            config_overrides=worker_settings.config_overrides,
            environment={
                **worker_settings.environment,
                **self.verifier_runtime.environment_for(task.number),
            },
            project_root=self.project_root,
        )

        worker_result = self._execute_worker_once(task, initial_request)
        if isinstance(worker_result, TaskResult):
            return worker_result
        task_result = self._evaluate_worker_result(task, worker_result)
        if task_result is not None:
            if not _needs_decision_correction(task, worker_result):
                return task_result
            corrected_request = replace(
                initial_request,
                decision_correction=_build_decision_correction(worker_result),
            )
            previous_output = (
                worker_result.output if isinstance(worker_result.output, dict) else None
            )
            worker_result = self._execute_worker_once(
                task,
                corrected_request,
                previous_output=previous_output,
            )
            if isinstance(worker_result, TaskResult):
                return worker_result
            task_result = self._evaluate_worker_result(task, worker_result)
            if task_result is not None:
                return task_result

        output = worker_result.output
        if not isinstance(output, dict):
            return _task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                "Worker 결과 JSON이 유효하지 않습니다.",
                None,
            )
        try:
            self.evidence_store.save_success_evidence(
                self.request.plan_id,
                task,
                task_fingerprint,
                output,
            )
        except (OSError, EvidenceError) as error:
            return _task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                f"실행 기록 저장 실패: {error}",
                output,
            )
        return _task_result_from_worker_output(
            task,
            "succeeded",
            worker_result.returncode,
            False,
            "",
            output,
        )

    def _execute_worker_once(
        self,
        task: Task,
        worker_request: WorkerExecutionRequest,
        *,
        previous_output: dict[str, object] | None = None,
    ) -> WorkerExecutionResult | TaskResult:
        try:
            return execute_worker(worker_request)
        except subprocess.TimeoutExpired as error:
            message = (
                "Worker 실행 시간이 제한을 초과했습니다. "
                f"제한 시간: {error.timeout}초, 상세 오류: {error}"
            )
            return _task_result_from_worker_output(
                task, "failed", 124, True, message, previous_output
            )
        except subprocess.CalledProcessError as error:
            return _task_result_from_worker_output(
                task,
                "failed",
                error.returncode,
                False,
                str(error),
                previous_output,
            )
        except Exception as error:
            return _task_result_from_worker_output(
                task, "failed", None, False, str(error), previous_output
            )

    @staticmethod
    def _evaluate_worker_result(
        task: Task,
        worker_result: WorkerExecutionResult,
    ) -> TaskResult | None:
        output = worker_result.output if isinstance(worker_result.output, dict) else None
        if worker_result.returncode:
            return _task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                f"Worker 종료 코드 {worker_result.returncode}",
                output,
            )
        completion_error = _worker_completion_error(task, worker_result)
        if completion_error:
            return _task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                completion_error,
                output,
            )
        return None
