from __future__ import annotations

import re

from .models import HarnessRequest, PlanValidationError


INVOCATION_PATTERN = re.compile(
    r"^\s*\$harness-exec\s+(?P<plan_id>\S+)(?P<remainder>[\s\S]*)$"
)
FROM_TASK_PATTERN = re.compile(r"^--from-task\s+(?P<number>\d+)(?:\s+|$)")


def parse_invocation(raw_request: str) -> HarnessRequest:
    match = INVOCATION_PATTERN.fullmatch(raw_request)
    if match is None:
        raise PlanValidationError(
            "호출 형식은 '$harness-exec <plan-id> [추가 요청]'입니다."
        )

    plan_id = match.group("plan_id")
    remainder = match.group("remainder").strip()
    from_task = FROM_TASK_PATTERN.match(remainder)
    if from_task is None:
        return HarnessRequest(plan_id, remainder)

    start_task_number = int(from_task.group("number"))
    if start_task_number < 1:
        raise PlanValidationError("--from-task에는 1 이상의 Task 번호가 필요합니다.")
    return HarnessRequest(
        plan_id,
        remainder[from_task.end() :].strip(),
        start_task_number,
    )
