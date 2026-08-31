from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import subprocess

from verifier_runtime import VerifierRuntime
from worker_runner import (
    WorkerExecutionRequest,
    WorkerExecutionResult,
    execute_worker,
)

from ..models.invocation import TaskInvocation
from ..models.plan import Task
from ..models.result import TaskResult
from ..preparation.worker_tasks import PreparedWorkerTask
from ..results.worker_result import task_result_from_worker


@dataclass(frozen=True)
class WorkerExecutionResources:
    executable: str
    project_root: Path
    verifier_runtime: VerifierRuntime


@dataclass(frozen=True)
class WorkerAttempt:
    result: WorkerExecutionResult | None = None
    failure: TaskResult | None = None


def build_worker_request(
    prepared_worker: PreparedWorkerTask,
    invocation: TaskInvocation,
    resources: WorkerExecutionResources,
) -> WorkerExecutionRequest:
    """Harness Task 입력을 worker_runner 공개 요청으로 변환한다."""
    context = invocation.execution_context
    return WorkerExecutionRequest(
        task_number=invocation.task.number,
        common_prompt=invocation.common_prompt,
        additional_request=invocation.additional_request,
        title=invocation.task.title,
        task_prompt=invocation.task.task_prompt,
        verification_items=invocation.task.verification_items,
        verification_paths=tuple(
            dict.fromkeys(
                (*invocation.task.allowed_paths, *invocation.task.read_only_paths)
            )
        ),
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
        executable=resources.executable,
        config_overrides=prepared_worker.config_overrides,
        environment={
            **prepared_worker.environment,
            **resources.verifier_runtime.environment_for(invocation.task.number),
        },
        project_root=resources.project_root,
    )


def invoke_worker(
    task: Task,
    request: WorkerExecutionRequest,
    *,
    previous_output: dict[str, object] | None = None,
) -> WorkerAttempt:
    """Worker 프로세스 예외를 Task 실패 결과로 변환한다."""
    try:
        return WorkerAttempt(result=execute_worker(request))
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
