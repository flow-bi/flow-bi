from __future__ import annotations

from collections.abc import Callable
import subprocess

from .evidence import EvidenceRecordError, ExecutionRecordStore
from .models import Task, TaskInvocation, TaskResult
from .worker_result import completion_error, decision_correction, needs_decision_correction, return_code, task_result_from_worker


WorkerInvoker = Callable[[TaskInvocation], object]


def _worker_output(result: object) -> dict[str, object] | None:
    output = getattr(result, "output", None)
    return output if isinstance(output, dict) else None


def _record_failure(task: Task, code: int | None, output: dict[str, object] | None, error: Exception) -> TaskResult:
    message = f"\uc2e4\ud589 \uae30\ub85d \uc800\uc7a5 \uc2e4\ud328: {error}"
    return task_result_from_worker(task, "failed", code, False, message, output)


def execute_task(task: Task, invocation: TaskInvocation, call_worker: WorkerInvoker, store: ExecutionRecordStore) -> TaskResult:
    """Run one Worker invocation, correct its decision once, and persist PASS evidence."""
    try:
        result = call_worker(invocation)
    except subprocess.TimeoutExpired as error:
        return task_result_from_worker(task, "failed", 124, True, str(error), None)
    except subprocess.CalledProcessError as error:
        return task_result_from_worker(task, "failed", error.returncode, False, str(error), None)
    except Exception as error:
        return task_result_from_worker(task, "failed", None, False, str(error), None)

    output = _worker_output(result)
    code = return_code(result)
    if code:
        return task_result_from_worker(task, "failed", code, False, f"Worker \uc885\ub8cc \ucf54\ub4dc {code}", output)

    message = completion_error(task, result)
    if message and not needs_decision_correction(task, result):
        return task_result_from_worker(task, "failed", code, False, message, output)
    if message:
        try:
            result = call_worker(decision_correction(invocation, result))
        except subprocess.TimeoutExpired as error:
            return task_result_from_worker(task, "failed", 124, True, str(error), output)
        except subprocess.CalledProcessError as error:
            return task_result_from_worker(task, "failed", error.returncode, False, str(error), output)
        except Exception as error:
            return task_result_from_worker(task, "failed", None, False, str(error), output)
        output = _worker_output(result)
        code = return_code(result)
        if code:
            return task_result_from_worker(task, "failed", code, False, "\ud310\uc815 \uad50\uc815 \uc694\uccad Worker \ud638\ucd9c\uc774 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.", output)
        corrected_message = completion_error(task, result)
        if corrected_message:
            return task_result_from_worker(task, "failed", code, False, f"\ud310\uc815 \uad50\uc815 \ud6c4\uc5d0\ub3c4 \uc644\ub8cc \uacc4\uc57d\uc744 \ucda9\uc871\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4: {corrected_message}", output)

    if output is None:
        return task_result_from_worker(task, "failed", code, False, "Worker \uacb0\uacfc JSON\uc774 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.", None)
    try:
        store.save(invocation.execution_context.plan_id, task, invocation.execution_context.fingerprint, output)
    except (OSError, EvidenceRecordError) as error:
        return _record_failure(task, code, output, error)
    return task_result_from_worker(task, "succeeded", code, False, "", output)
