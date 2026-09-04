from __future__ import annotations

from collections.abc import Mapping
from dataclasses import replace
from pathlib import Path
import subprocess

from verifier_runtime import VerifierRuntime
from worker_runner import WorkerExecutionRequest, WorkerExecutionResult, execute_worker

from ..models.plan import REUSE_ALLOWED, Task
from ..models.request import HarnessRequest
from ..models.result import TaskResult, VerificationResult, WorkerRunTiming
from ..preparation.worker_settings import TaskWorkerSettings
from ..results.evidence import (
    EvidenceError,
    TaskEvidenceStore,
    task_contract_fingerprint,
)
from ..results.timing import timing_from_observation


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
MAX_VERIFICATION_RESULT_COLLECTION_ATTEMPTS = 3
IN_PROGRESS_EVIDENCE_MARKERS = (
    "session",
    "진행 중",
    "in progress",
    "running",
)


def _non_empty_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _tdd_contract_error(
    task: Task,
    execution_context: Mapping[str, object],
    gate: object,
) -> str:
    if not isinstance(gate, dict):
        return "TDD 정책 실행 결과가 누락되었습니다."
    policy = execution_context.get("effective_tdd_policy")
    if policy != task.tdd_policy and not (
        policy == REUSE_ALLOWED and task.tdd_policy == "REQUIRED"
    ):
        return "선언 TDD 정책과 유효 정책이 모순됩니다."
    if gate.get("effective_policy") != policy:
        return "Worker TDD 유효 정책이 실행 컨텍스트와 일치하지 않습니다."
    if not _non_empty_text(gate.get("evidence")) or not _non_empty_text(
        gate.get("current_verification_evidence")
    ):
        return f"{policy} TDD에는 현재 검증 증거가 필요합니다."
    if policy == "NOT_APPLICABLE":
        if gate.get("result") != "N/A" or not _non_empty_text(gate.get("reason")):
            return "NOT_APPLICABLE TDD에는 N/A 결과와 적용 제외 사유가 필요합니다."
    elif gate.get("result") != "PASS":
        return f"{policy} TDD Gate는 PASS여야 합니다."
    reused = gate.get("reused_evidence")
    if policy == REUSE_ALLOWED:
        if (
            not isinstance(reused, dict)
            or reused.get("record_id") != execution_context.get("prior_evidence_id")
            or reused.get("fingerprint") != execution_context.get("fingerprint")
        ):
            return "REUSE_ALLOWED TDD에는 동일 fingerprint의 선행 증거 식별자가 필요합니다."
    elif reused not in (None, {"record_id": None, "fingerprint": None}):
        return "재사용이 아닌 TDD 정책에는 선행 증거를 지정할 수 없습니다."
    return ""


def _objective_completion_error(
    task: Task,
    worker_result: WorkerExecutionResult,
    execution_context: Mapping[str, object],
) -> str:
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
        if gate_name == "tdd":
            tdd_error = _tdd_contract_error(task, execution_context, gate)
            if tdd_error:
                return tdd_error
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


def _worker_completion_error(
    task: Task,
    worker_result: WorkerExecutionResult,
    execution_context: Mapping[str, object],
) -> str:
    objective_error = _objective_completion_error(
        task, worker_result, execution_context
    )
    if objective_error:
        return objective_error
    output = worker_result.output
    if output.get("decision") != "PASS":
        return f"Worker 판정이 PASS가 아닙니다: {output.get('decision')!r}."
    if output.get("final_status") != "PASS":
        return "Worker final_status가 PASS가 아닙니다."
    return ""


def _needs_decision_correction(
    task: Task,
    worker_result: WorkerExecutionResult,
    execution_context: Mapping[str, object],
) -> bool:
    if _objective_completion_error(task, worker_result, execution_context):
        return False
    output = worker_result.output
    decision = output.get("decision") if isinstance(output, dict) else None
    return decision != "PASS" and decision not in EXPLICIT_FAILURE_DECISIONS


def _in_progress_not_run_verification(
    worker_result: WorkerExecutionResult,
) -> list[dict[str, object]]:
    output = worker_result.output
    if not isinstance(output, dict) or not isinstance(output.get("verification"), list):
        return []
    pending: list[dict[str, object]] = []
    for item in output["verification"]:
        if not isinstance(item, dict):
            return []
        result = item.get("result")
        if result == "PASS":
            continue
        if result != "NOT_RUN" or not _non_empty_text(item.get("evidence")):
            return []
        evidence = item["evidence"].lower()
        if not any(marker in evidence for marker in IN_PROGRESS_EVIDENCE_MARKERS):
            return []
        pending.append(item)
    return pending


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
    *,
    worker_observation: object | None = None,
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
    timing, timing_observation_error = timing_from_observation(
        getattr(worker_observation, "timing_summary", None),
        task.number,
        getattr(worker_observation, "run_id", None) or None,
    )
    return TaskResult(
        task_number=task.number,
        title=task.title,
        status=status,
        return_code=return_code,
        timed_out=timed_out,
        message=message,
        work_summary=str((worker_output or {}).get("work_summary", "")),
        verification=verification,
        quality_score=quality_score if type(quality_score) is int else None,
        remaining_issues=remaining_issues,
        timing=timing,
        timing_observation_error=timing_observation_error,
    )


def _run_timing(
    request: WorkerExecutionRequest,
    observation: object | None,
) -> WorkerRunTiming:
    """Convert one attempted Worker run without affecting its task outcome."""

    timing, observation_error = timing_from_observation(
        getattr(observation, "timing_summary", None),
        request.task_number,
        getattr(observation, "run_id", None) or request.run_id or None,
    )
    return WorkerRunTiming(
        purpose=request.run_purpose,
        attempt=request.attempt,
        timing=timing,
        observation_error=observation_error,
    )


def _with_run_timings(
    result: TaskResult,
    run_timings: list[WorkerRunTiming],
) -> TaskResult:
    """Keep the legacy final timing while exposing every run in execution order."""

    return replace(result, run_timings=tuple(run_timings))


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
        run_timings: list[WorkerRunTiming] = []

        def finish(result: TaskResult) -> TaskResult:
            return _with_run_timings(result, run_timings)

        task_fingerprint = task_contract_fingerprint(self.request.plan_id, task)
        try:
            prior_evidence = self.evidence_store.load_valid_evidence(
                self.request.plan_id,
                task.number,
                task_fingerprint,
            )
        except EvidenceError as error:
            return finish(TaskResult(
                task.number,
                task.title,
                "failed",
                message=f"HUMAN_REVIEW_REQUIRED: {error}",
            ))

        task_execution_context = {
            "plan_id": self.request.plan_id,
            "fingerprint": task_fingerprint,
            "mode": "rerun" if prior_evidence else "new_or_changed",
            "prior_tdd_evidence": (
                prior_evidence["tdd_evidence"] if prior_evidence else None
            ),
            "prior_evidence_id": (
                f"plan:{self.request.plan_id}:task:{task.number}:"
                f"fingerprint:{task_fingerprint}"
                if prior_evidence
                else None
            ),
            "effective_tdd_policy": (
                REUSE_ALLOWED
                if prior_evidence and task.tdd_policy == "REQUIRED"
                else task.tdd_policy
            ),
        }
        worker_settings = self.worker_settings_by_task[task.number]
        initial_request = WorkerExecutionRequest(
            task_number=task.number,
            common_prompt=self.common_prompt,
            additional_request=self.request.additional_request,
            title=task.title,
            task_prompt=task.task_prompt,
            verification_items=task.verification_items,
            task_execution_context=task_execution_context,
            decision_correction=None,
            verification_result_collection=None,
            executable=self.codex_executable,
            config_overrides=worker_settings.config_overrides,
            environment={
                **worker_settings.environment,
                **self.verifier_runtime.environment_for(task.number),
            },
            project_root=self.project_root,
            worker_area=(
                "fe-worker"
                if any(
                    path == "frontend" or path.startswith("frontend/")
                    for path in task.allowed_paths
                )
                else "be-worker"
            ),
            run_purpose="task_execution",
            attempt=1,
        )

        worker_result = self._execute_worker_once(task, initial_request, run_timings)
        if isinstance(worker_result, TaskResult):
            return finish(worker_result)
        collection_attempts = 1
        pending_verification = _in_progress_not_run_verification(worker_result)
        while pending_verification:
            if collection_attempts >= MAX_VERIFICATION_RESULT_COLLECTION_ATTEMPTS:
                return finish(_task_result_from_worker_output(
                    task,
                    "failed",
                    worker_result.returncode,
                    False,
                    "진행 중 verifier 결과 수집이 3회 후에도 완료되지 않았습니다: "
                    + "; ".join(
                        str(item["evidence"]) for item in pending_verification
                    ),
                    worker_result.output,
                    worker_observation=worker_result,
                ))
            collection_attempts += 1
            collection_request = replace(
                initial_request,
                run_purpose="verification_result_collection",
                attempt=collection_attempts,
                verification_result_collection={
                    "attempt": collection_attempts,
                    "verification": pending_verification,
                },
            )
            worker_result = self._execute_worker_once(
                task,
                collection_request,
                run_timings,
                previous_output=(
                    worker_result.output
                    if isinstance(worker_result.output, dict)
                    else None
                ),
            )
            if isinstance(worker_result, TaskResult):
                return finish(worker_result)
            if worker_result.returncode:
                break
            pending_verification = _in_progress_not_run_verification(worker_result)

        task_result = self._evaluate_worker_result(
            task, worker_result, task_execution_context
        )
        if task_result is not None:
            if not _needs_decision_correction(
                task, worker_result, task_execution_context
            ):
                return finish(task_result)
            corrected_request = replace(
                initial_request,
                run_purpose="decision_correction",
                attempt=collection_attempts + 1,
                decision_correction=_build_decision_correction(worker_result),
            )
            previous_output = (
                worker_result.output if isinstance(worker_result.output, dict) else None
            )
            worker_result = self._execute_worker_once(
                task,
                corrected_request,
                run_timings,
                previous_output=previous_output,
            )
            if isinstance(worker_result, TaskResult):
                return finish(worker_result)
            task_result = self._evaluate_worker_result(
                task, worker_result, task_execution_context
            )
            if task_result is not None:
                return finish(task_result)

        output = worker_result.output
        if not isinstance(output, dict):
            return finish(_task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                "Worker 결과 JSON이 유효하지 않습니다.",
                None,
                worker_observation=worker_result,
            ))
        try:
            self.evidence_store.save_success_evidence(
                self.request.plan_id,
                task,
                task_fingerprint,
                output,
            )
        except (OSError, EvidenceError) as error:
            return finish(_task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                f"실행 기록 저장 실패: {error}",
                output,
                worker_observation=worker_result,
            ))
        return finish(_task_result_from_worker_output(
            task,
            "succeeded",
            worker_result.returncode,
            False,
            "",
            output,
            worker_observation=worker_result,
        ))

    def _execute_worker_once(
        self,
        task: Task,
        worker_request: WorkerExecutionRequest,
        run_timings: list[WorkerRunTiming],
        *,
        previous_output: dict[str, object] | None = None,
    ) -> WorkerExecutionResult | TaskResult:
        try:
            worker_settings = self.worker_settings_by_task[task.number]
            with worker_settings.prepare_run() as (
                run_id,
                environment,
                config_overrides,
            ):
                effective_request = replace(
                    worker_request,
                    run_id=run_id,
                    environment={
                        **worker_request.environment,
                        **environment,
                    },
                    config_overrides=config_overrides,
                )
                result = execute_worker(
                    effective_request
                )
                run_timings.append(_run_timing(effective_request, result))
                return result
        except subprocess.TimeoutExpired as error:
            run_timings.append(_run_timing(worker_request, error))
            message = (
                "Worker 실행 시간이 제한을 초과했습니다. "
                f"제한 시간: {error.timeout}초, 상세 오류: {error}"
            )
            return _task_result_from_worker_output(
                task,
                "failed",
                124,
                True,
                message,
                previous_output,
                worker_observation=error,
            )
        except subprocess.CalledProcessError as error:
            run_timings.append(_run_timing(worker_request, error))
            return _task_result_from_worker_output(
                task,
                "failed",
                error.returncode,
                False,
                str(error),
                previous_output,
                worker_observation=error,
            )
        except Exception as error:
            run_timings.append(_run_timing(worker_request, error))
            return _task_result_from_worker_output(
                task,
                "failed",
                None,
                False,
                str(error),
                previous_output,
                worker_observation=error,
            )

    @staticmethod
    def _evaluate_worker_result(
        task: Task,
        worker_result: WorkerExecutionResult,
        execution_context: Mapping[str, object],
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
                worker_observation=worker_result,
            )
        completion_error = _worker_completion_error(
            task, worker_result, execution_context
        )
        if completion_error:
            return _task_result_from_worker_output(
                task,
                "failed",
                worker_result.returncode,
                False,
                completion_error,
                output,
                worker_observation=worker_result,
            )
        return None
