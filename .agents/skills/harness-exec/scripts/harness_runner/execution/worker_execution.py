from __future__ import annotations

from dataclasses import dataclass
import subprocess

from worker_runner import WorkerExecutionRequest, WorkerExecutor

from ..models.invocation import TaskInvocation
from ..models.plan import Task
from ..models.result import TaskResult
from ..preparation.task_invocations import PreparedWorkerTask
from ..results.worker_result import task_result_from_worker


@dataclass(frozen=True)
class WorkerAttempt:
    result: object | None = None
    failure: TaskResult | None = None


def build_worker_request(
    prepared_worker: PreparedWorkerTask,
    invocation: TaskInvocation,
) -> WorkerExecutionRequest:
    """Harness Task 입력을 worker_runner 공개 요청으로 변환한다."""
    context = invocation.execution_context
    return WorkerExecutionRequest(
        task_number=prepared_worker.task_number,
        common_prompt=invocation.common_prompt,
        additional_request=invocation.additional_request,
        title=prepared_worker.title,
        task_prompt=prepared_worker.task_prompt,
        verification_items=prepared_worker.verification_items,
        execution_context=(
            {
                "plan_id": context.plan_id,
                "fingerprint": context.fingerprint,
                "mode": context.mode,
                "prior_tdd_evidence": context.prior_tdd_evidence,
            }
            if context is not None
            else None
        ),
        decision_correction=invocation.decision_correction,
        executable=prepared_worker.executable,
        config_overrides=prepared_worker.config_overrides,
        environment=prepared_worker.environment,
    )


def invoke_worker(
    task: Task,
    request: WorkerExecutionRequest,
    worker_executor: WorkerExecutor,
    *,
    previous_output: dict[str, object] | None = None,
) -> WorkerAttempt:
    """Worker 프로세스 예외를 Task 실패 결과로 변환한다."""
    try:
        return WorkerAttempt(result=worker_executor(request))
    except subprocess.TimeoutExpired as error:
        message = (
            "Worker 실행 시간이 제한을 초과"
            f"제한 시간 : {error.timeout}초, 상세 오류 : {error}"
        )
        failure = task_result_from_worker(
            task,
            "failed",
            124,
            True,
            message,
            previous_output,
        )
    except subprocess.CalledProcessError as error:
        failure = task_result_from_worker(
            task,
            "failed",
            error.returncode,
            False,
            str(error),
            previous_output,
        )
    except Exception as error:
        failure = task_result_from_worker(
            task,
            "failed",
            None,
            False,
            str(error),
            previous_output,
        )
    return WorkerAttempt(failure=failure)
