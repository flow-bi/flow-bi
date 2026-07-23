from __future__ import annotations

from collections.abc import Sequence
import re
import sys

from .execution import execute_workers
from .models import ALLOWED_WORKER_ORDERS, HarnessRequest, PlanValidationError, WorkerFailure
from .plan import complete_plan, load_active_plan, repository_root


# $harness-exec  <plan-id> [--order <worker-order> | --parallel] [추가요청]
INVOCATION_PATTERN = re.compile(
    r"^\s*\$harness-exec\s+(?P<plan_id>\S+)(?P<remainder>[\s\S]*)$"
)


def parse_request(raw_request: str) -> HarnessRequest:
    match = INVOCATION_PATTERN.fullmatch(raw_request)
    if match is None:
        raise PlanValidationError(
            "호출 형식은 '$harness-exec <plan-id> [--order <worker-order> | --parallel] [추가 요청]'입니다."
        )

    # 나머지 요청 앞 공백제거 후 
    remainder = match.group("remainder").lstrip()
    worker_order = ALLOWED_WORKER_ORDERS[0]
    parallel = False

    if re.match(r"^--parallel(?:\s|$)", remainder):
        parallel = True
        option_parts = remainder.split(maxsplit=1)
        remainder = option_parts[1] if len(option_parts) == 2 else ""


    # --order가 적혀있을때만 쉼표 사이에 공백을 두지 않아야함
    elif re.match(r"^--order(?:\s|$)", remainder):
        option_parts = remainder.split(maxsplit=2)

        # worker 순서 지정 확인
        if len(option_parts) < 2:
            raise PlanValidationError("--order 뒤에 worker 순서를 지정해야 합니다.")
        worker_order = tuple(option_parts[1].split(","))
        
        # 잘못된 경우 적성 방법 가이드
        if worker_order not in ALLOWED_WORKER_ORDERS:
            allowed = " 또는 ".join(",".join(order) for order in ALLOWED_WORKER_ORDERS)
            raise PlanValidationError(f"worker 순서는 {allowed}만 허용합니다.")
        remainder = option_parts[2] if len(option_parts) == 3 else ""

    ## plan id와 워커가 일하는 순서 그리고 추가 요청을 반환
    return HarnessRequest(match.group("plan_id"), worker_order, remainder.strip(),parallel)


# 실패 알리기
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
