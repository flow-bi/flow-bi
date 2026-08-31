from __future__ import annotations

from dataclasses import dataclass

from worker_runner import WorkerExecutor

from ..models.invocation import TaskInvocation
from ..models.plan import Task
from ..models.result import TaskResult
from ..preparation.task_invocations import PreparedWorkerTask
from ..results.evidence import EvidenceRecordError, ExecutionRecordStore
from ..results.worker_result import (
    completion_error,
    decision_correction,
    needs_decision_correction,
    return_code,
    task_result_from_worker,
)
from .worker_execution import build_worker_request, invoke_worker


@dataclass(frozen=True)
class WorkerAssessment:
    output: dict[str, object] | None
    return_code: int | None
    failure: TaskResult | None = None
    correction_required: bool = False


def assess_worker_result(
    task: Task,
    result: object,
    *,
    allow_decision_correction: bool,
) -> WorkerAssessment:
    """한 Worker 응답이 성공, 실패 또는 판정 교정 대상인지 판단한다."""
    raw_output = getattr(result, "output", None)
    output = raw_output if isinstance(raw_output, dict) else None
    code = return_code(result)
    if code:
        failure = task_result_from_worker(
            task,
            "failed",
            code,
            False,
            f"Worker 종료 코드 {code}",
            output,
        )
        return WorkerAssessment(output, code, failure)

    message = completion_error(task, result)
    correction_required = (
        allow_decision_correction
        and bool(message)
        and needs_decision_correction(task, result)
    )
    if message and not correction_required:
        failure = task_result_from_worker(
            task,
            "failed",
            code,
            False,
            message,
            output,
        )
        return WorkerAssessment(output, code, failure)
    return WorkerAssessment(output, code, correction_required=correction_required)


def save_worker_evidence(
    task: Task,
    invocation: TaskInvocation,
    output: dict[str, object] | None,
    code: int | None,
    store: ExecutionRecordStore,
) -> TaskResult:
    """유효한 Worker 결과를 증거 저장소에 기록한다."""
    if output is None:
        return task_result_from_worker(
            task,
            "failed",
            code,
            False,
            "Worker 결과 JSON이 유효하지 않습니다.",
            None,
        )

    context = invocation.execution_context
    if context is None:
        return task_result_from_worker(
            task,
            "failed",
            code,
            False,
            "Worker 실행 Context가 없습니다.",
            output,
        )

    try:
        store.save(context.plan_id, task, context.fingerprint, output)
    except (OSError, EvidenceRecordError) as error:
        return task_result_from_worker(
            task,
            "failed",
            code,
            False,
            f"실행 기록 저장 실패: {error}",
            output,
        )
    return task_result_from_worker(task, "succeeded", code, False, "", output)


def execute_task(
    task: Task,
    invocation: TaskInvocation,
    prepared_worker: PreparedWorkerTask,
    store: ExecutionRecordStore,
    worker_executor: WorkerExecutor,
) -> TaskResult:
    """Worker 호출, 필요 시 판정 교정, 증거 저장 순서를 조정한다."""
    attempt = invoke_worker(
        task,
        build_worker_request(prepared_worker, invocation),
        worker_executor,
    )
    if attempt.failure is not None:
        return attempt.failure

    assessment = assess_worker_result(
        task,
        attempt.result,
        allow_decision_correction=True,
    )
    if assessment.failure is not None:
        return assessment.failure

    if assessment.correction_required:
        corrected_invocation = decision_correction(invocation, attempt.result)
        attempt = invoke_worker(
            task,
            build_worker_request(prepared_worker, corrected_invocation),
            worker_executor,
            previous_output=assessment.output,
        )
        if attempt.failure is not None:
            return attempt.failure
        assessment = assess_worker_result(
            task,
            attempt.result,
            allow_decision_correction=False,
        )
        if assessment.failure is not None:
            return assessment.failure

    return save_worker_evidence(
        task,
        invocation,
        assessment.output,
        assessment.return_code,
        store,
    )
