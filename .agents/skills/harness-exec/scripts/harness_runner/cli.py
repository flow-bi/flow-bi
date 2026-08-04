from __future__ import annotations

from collections.abc import Sequence
import sys

from .parse import parse_invocation
from .execution import execute_workers
from .models import PlanValidationError, TaskResult
from .notion import NotionPublicationError, publish_report
from .plan import complete_plan, load_active_plan, repository_root
from .report import build_execution_report
from .worker_gateway import invoke_task

from worker_runner.browser_verifier import BrowserVerifier
from worker_runner.backend_verifier import BackendVerifier
from worker_runner.frontend_verifier import FrontendVerifier


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


def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if len(arguments) != 1:
        _print_console("오류: 전체 요청을 하나의 인자로 전달해야 합니다.", file=sys.stderr)
        return 2

    try:
        request = parse_invocation(arguments[0])
        root = repository_root()
        plan_path, tasks = load_active_plan(request.plan_id, root)
    except PlanValidationError as error:
        _print_console(f"검증 오류: {error}", file=sys.stderr)
        return 2
    except OSError as error:
        _print_console(f"plan 준비 실패: {error}", file=sys.stderr)
        return 1

    # 브라우저 프로세스는 부모에서 실행하고 Worker에는 제한된 호출 정보만 전달한다.
    with (
        BrowserVerifier(root) as browser_verifier,
        BackendVerifier(root) as backend_verifier,
        FrontendVerifier(root) as frontend_verifier,
    ):
        def worker_call(invocation):
            allowed_paths = invocation.task.allowed_paths
            frontend_environment = (
                frontend_verifier.environment
                if isinstance(allowed_paths, tuple) and any(
                    path == "frontend" or path.startswith("frontend/")
                    for path in allowed_paths
                )
                else {}
            )
            return invoke_task(
                invocation,
                environment_overrides={
                    **browser_verifier.environment,
                    **backend_verifier.environment_for_task(
                        invocation.task.allowed_paths,
                        invocation.task.forbidden_paths,
                    ),
                    **frontend_environment,
                },
            )
        report = execute_workers(tasks, request, call_worker=worker_call)

    rendered_report = build_execution_report(request.plan_id, report)
    _print_console(rendered_report.body)
    try:
        published_page = publish_report(
            rendered_report.title,
            rendered_report.body,
            project_root=root,
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
        destination = complete_plan(plan_path, root)
    except OSError as error:
        _print_console(f"plan 실행은 완료했지만 plan 이동 실패: {error}", file=sys.stderr)
        return 1

    _print_console(f"plan 완료: {destination.relative_to(root).as_posix()}")
    return 0
