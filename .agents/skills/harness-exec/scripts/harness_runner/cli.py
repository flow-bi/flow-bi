from __future__ import annotations

from collections.abc import Sequence
import re
import sys

from .execution import execute_workers
from .models import ALLOWED_WORKER_ORDERS, HarnessRequest, PlanValidationError, WorkerFailure
from .plan import complete_plan, load_active_plan, repository_root


INVOCATION_PATTERN = re.compile(
    r"^\s*\$harness-exec\s+(?P<plan_id>\S+)(?P<remainder>[\s\S]*)$"
)


def parse_request(raw_request: str) -> HarnessRequest:
    match = INVOCATION_PATTERN.fullmatch(raw_request)
    if match is None:
        raise PlanValidationError(
            "호출 형식은 '$harness-exec <plan-id> [--order <worker-order>] [추가 요청]'입니다."
        )

    remainder = match.group("remainder").lstrip()
    worker_order = ALLOWED_WORKER_ORDERS[0]
    if re.match(r"^--order(?:\s|$)", remainder):
        option_parts = remainder.split(maxsplit=2)
        if len(option_parts) < 2:
            raise PlanValidationError("--order 뒤에 worker 순서를 지정해야 합니다.")
        worker_order = tuple(option_parts[1].split(","))
        if worker_order not in ALLOWED_WORKER_ORDERS:
            allowed = " 또는 ".join(",".join(order) for order in ALLOWED_WORKER_ORDERS)
            raise PlanValidationError(f"worker 순서는 {allowed}만 허용합니다.")
        remainder = option_parts[2] if len(option_parts) == 3 else ""

    return HarnessRequest(match.group("plan_id"), worker_order, remainder.strip())


def _print_failure(failure: WorkerFailure) -> None:
    if failure.timed_out:
        detail = "시간 초과"
    elif failure.return_code is not None:
        detail = f"종료 코드 {failure.return_code}"
    else:
        detail = "예외"
    if failure.message:
        detail = f"{detail}: {failure.message}"
    print(f"worker 실패 - {failure.worker}: {detail}", file=sys.stderr)


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
        print(f"plan 이동 실패: {error}", file=sys.stderr)
        return 1

    report = execute_workers(tasks, request, plan_path, root)
    if not report.succeeded:
        for failure in report.failures:
            _print_failure(failure)
        return 1

    try:
        destination = complete_plan(plan_path, root)
    except OSError as error:
        print(f"plan 이동 실패: {error}", file=sys.stderr)
        return 1

    print(f"plan 완료: {destination.relative_to(root).as_posix()}")
    return 0
