from __future__ import annotations

from collections.abc import Sequence
import re
import sys

from .execution import execute_workers
from .models import HarnessRequest, PlanValidationError, TaskResult
from .plan import complete_plan, load_active_plan, repository_root


# $harness-exec <plan-id> [추가 요청]
INVOCATION_PATTERN = re.compile(
    r"^\s*\$harness-exec\s+(?P<plan_id>\S+)(?P<remainder>[\s\S]*)$"
)


def parse_request(raw_request: str) -> HarnessRequest:
    match = INVOCATION_PATTERN.fullmatch(raw_request)
    if match is None:
        raise PlanValidationError(
            "호출 형식은 '$harness-exec <plan-id> [추가 요청]'입니다."
        )

    plan_id = match.group("plan_id")
    return HarnessRequest(plan_id, match.group("remainder").strip())


# 실패 알리기
def _print_failure(failure: TaskResult) -> None:
    if failure.status == "blocked":
        detail = failure.message or "선행 Task 실패로 차단"
        status = "차단"
    elif failure.timed_out:
        detail = "시간 초과"
        status = "실패"
    elif failure.return_code is not None:
        detail = f"종료 코드 {failure.return_code}"
        status = "실패"
    else:
        detail = "예외"
        status = "실패"
    if failure.message and failure.status != "blocked":
        detail = f"{detail}: {failure.message}"
    print(
        f"Task {failure.task_number} {status} - {failure.title}: {detail}",
        file=sys.stderr,
    )


def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if len(arguments) != 1:
        print("오류: 전체 요청을 하나의 인자로 전달해야 합니다.", file=sys.stderr)
        return 2

    try:
        request = parse_request(arguments[0])
        root = repository_root()
        plan_path, tasks = load_active_plan(request.plan_id, root)
    except PlanValidationError as error:
        print(f"검증 오류: {error}", file=sys.stderr)
        return 2
    except OSError as error:
        print(f"plan 준비 실패: {error}", file=sys.stderr)
        return 1

    # plan에서 읽은 작업 목록,  request, 현재 active plan경로, 저장소 루트
    report = execute_workers(tasks, request, plan_path, root)

    # worker가 실패하면 실패를 출력하고 종료코드 1반환 plan은 이동하지 않는다.
    if not report.succeeded:
        for failure in report.failures:
            _print_failure(failure)
        return 1

    try:
        destination = complete_plan(plan_path, root)
    except OSError as error:
        print(f"plan 실행은 완료했지만 plan 이동 실패: {error}", file=sys.stderr)
        return 1

    print(f"plan 완료: {destination.relative_to(root).as_posix()}")
    return 0
