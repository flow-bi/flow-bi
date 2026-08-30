from __future__ import annotations

import subprocess

from ..models.invocation import TaskInvocation
from ..models.plan import Task
from ..models.result import TaskResult
from ..preparation.runtime import PreparedWorkerTask
from ..results.evidence import EvidenceRecordError, ExecutionRecordStore
from ..results.worker_result import completion_error, decision_correction, needs_decision_correction, return_code, task_result_from_worker


def _worker_output(result: object) -> dict[str, object] | None:
    output = getattr(result, "output", None)
    return output if isinstance(output, dict) else None


def _record_failure(task: Task, code: int | None, output: dict[str, object] | None, error: Exception) -> TaskResult:
    message = f"실행 기록 저장 실패: {error}"
    return task_result_from_worker(task, "failed", code, False, message, output)


def execute_task(
    task: Task,
    invocation: TaskInvocation,
    prepared_worker: PreparedWorkerTask,
    store: ExecutionRecordStore,
) -> TaskResult:

    """Run one Worker invocation, correct its decision once, and persist PASS evidence."""
    try:
        result = prepared_worker.execute(invocation)

    except subprocess.TimeoutExpired as error:
        message = (
            "Worker 실행 시간이 제한을 초과"
            f"제한 시간 : {error.timeout}초, 상세 오류 : {error}"
        )
        return task_result_from_worker(task, "failed", 124, True, message, None)

    except subprocess.CalledProcessError as error:
        message = (
            "Worker 프로세스가 비정상 종료되었습니다. "
            f"종료 코드: {error.returncode}, 상세 오류: {error}"
        )
        return task_result_from_worker(task, "failed", error.returncode, False, str(error), None)

    except Exception as error:
        message = (
            "Worker 실행 중 예상하지 못한 예외가 발생했습니다. "
            f"예외 종류: {type(error).__name__}, 상세 오류: {error}"
        )
        return task_result_from_worker(task, "failed", None, False, str(error), None)

    output = _worker_output(result)
    code = return_code(result)

    if code:
        return task_result_from_worker(task, "failed", code, False, f"Worker 종료 코드 {code}", output)

    message = completion_error(task, result)

    if message and not needs_decision_correction(task, result):
        return task_result_from_worker(task, "failed", code, False, message, output)

    if message:
        try:
            result = prepared_worker.execute(decision_correction(invocation, result))
        except subprocess.TimeoutExpired as error:
            return task_result_from_worker(task, "failed", 124, True, str(error), output)
        except subprocess.CalledProcessError as error:
            return task_result_from_worker(task, "failed", error.returncode, False, str(error), output)
        except Exception as error:
            return task_result_from_worker(task, "failed", None, False, str(error), output)

        output = _worker_output(result)
        code = return_code(result)

        if code:
            return task_result_from_worker(task, "failed", code, False, "재시도 Worker 호출이 실패했습니다..", output)
        corrected_message = completion_error(task, result)
        if corrected_message:
            return task_result_from_worker(task, "failed", code, False, f"재시도 후에도 완료되지 못했습니다.: {corrected_message}", output)

    if output is None:
        return task_result_from_worker(task, "failed", code, False, "Worker 결과 JSON이 유효하지 않습니다.", None)
    try:
        store.save(
            invocation.execution_context.plan_id,
            task,
            invocation.execution_context.fingerprint,
            output,
        )
    except (OSError, EvidenceRecordError) as error:
        return _record_failure(task, code, output, error)
    return task_result_from_worker(task, "succeeded", code, False, "", output)
