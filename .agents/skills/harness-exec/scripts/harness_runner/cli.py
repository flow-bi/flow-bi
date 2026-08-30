from __future__ import annotations
import sys

from collections.abc import Sequence

from .paths import PROJECT_ROOT

from .planning.errors import PlanValidationError
from .planning import complete_plan, load_requested_plan

from .models.result import TaskResult


from .preparation import prepare_execution

from .execution.coordinator import execute_workers

from .results.notion import NotionPublicationError, publish_report
from .results.report import build_execution_report

def _print_console(message: object, *, file=None) -> None:
    stream = sys.stdout if file is None else file
    text = str(message)
    encoding = getattr(stream, "encoding", None)
    if encoding:
        text = text.encode(encoding, errors="backslashreplace").decode(encoding)
    print(text, file=stream)


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
    _print_console(
        f"Task {failure.task_number} {status} - {failure.title}: {detail}",
        file=sys.stderr,
    )

# 하네스 전체 흐름 담당
def main(argv: Sequence[str] | None = None) -> int:

    # plan 준비
    try:
        request, plan_path, plan = load_requested_plan(argv)

    except PlanValidationError as error:
        _print_console(f"검증 오류: {error}", file=sys.stderr)
        return 2
    
    except OSError as error:
        _print_console(f"plan 준비 실패: {error}", file=sys.stderr)
        return 1

    prepared = prepare_execution(plan.tasks)

    report = execute_workers(
        plan,
        request,
        prepared_workers=prepared.task_invocations,
        project_root=PROJECT_ROOT
    )

    rendered_report = build_execution_report(request.plan_id, report)
    _print_console(rendered_report.body)

    try:
        published_page = publish_report(
            rendered_report.title,
            rendered_report.body,
            project_root=PROJECT_ROOT,
            executable=prepared.codex_executable,
        )
    except NotionPublicationError as error:
        for failure in report.failures:
            _print_failure(failure)
        _print_console(f"Notion Report 게시 실패: {error}", file=sys.stderr)
        return 1

    _print_console(f"Notion Report: {published_page.page_url}")

    # worker가 실패하면 Report 게시 후 실패를 출력하고 plan은 이동하지 않는다.
    if not report.succeeded:
        for failure in report.failures:
            _print_failure(failure)
        return 1

    try:
        destination = complete_plan(plan_path)
    except OSError as error:
        _print_console(f"plan 실행은 완료했지만 plan 이동 실패: {error}", file=sys.stderr)
        return 1

    _print_console(f"plan 완료: {destination.relative_to(PROJECT_ROOT).as_posix()}")
    return 0
