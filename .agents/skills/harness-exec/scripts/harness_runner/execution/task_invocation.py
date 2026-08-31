from __future__ import annotations

from ..models.invocation import HarnessRequest, TaskExecutionContext, TaskInvocation
from ..models.plan import ParsedPlan, Task
from ..results.evidence import ExecutionRecordStore, revision_fingerprint


def prepare_task_invocation(
    plan: ParsedPlan,
    request: HarnessRequest,
    task: Task,
    record_store: ExecutionRecordStore,
) -> TaskInvocation:
    """현재 Task 증거를 조회해 한 번의 Worker 호출 입력을 만든다."""
    fingerprint = revision_fingerprint(request.plan_id, task)
    prior = record_store.load(request.plan_id, task.number, fingerprint)
    context = TaskExecutionContext(
        request.plan_id,
        fingerprint,
        "rerun" if prior else "new_or_changed",
        prior["tdd_evidence"] if prior else None,
    )
    return TaskInvocation(
        plan.common_prompt,
        request.additional_request,
        task,
        context,
    )
