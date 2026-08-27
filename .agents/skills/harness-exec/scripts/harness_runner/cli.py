from __future__ import annotations
import sys

from collections.abc import Sequence

from .invocation import parse_cli_invocation
from .paths import PROJECT_ROOT

from .execution import execute_workers
from .models import PlanValidationError, TaskResult
from .notion import NotionPublicationError, publish_report
from .plan import complete_plan, load_active_plan
from .report import build_execution_report
from .worker_gateway import create_worker_gateway
from .worker_prompt import WorkerPromptTemplate

from worker_runner import prepare_worker_runtime

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

# 하네스 전체 흐름 담당
def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)

    try:
        request = parse_cli_invocation(arguments)
        plan_path, plan = load_active_plan(request.plan_id)

    except PlanValidationError as error:
        _print_console(f"검증 오류: {error}", file=sys.stderr)
        return 2
    
    except OSError as error:
        _print_console(f"plan 준비 실패: {error}", file=sys.stderr)
        return 1

    worker_executable: str | None = None
    with (
        BackendVerifier(PROJECT_ROOT) as backend_verifier,
        FrontendVerifier(PROJECT_ROOT) as frontend_verifier,
    ):
        gateway = create_worker_gateway(
            PROJECT_ROOT,
            runtime=prepare_worker_runtime(PROJECT_ROOT),
            prompt_template=WorkerPromptTemplate.load(),
        )
        worker_executable = gateway.runtime.executable

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
            return gateway.invoke_task(
                invocation,
                environment_overrides={
                    **backend_verifier.environment_for_task(
                        invocation.task.allowed_paths,
                        invocation.task.read_only_paths,
                    ),
                    **frontend_environment,
                },
            )

        report = execute_workers(plan, request, call_worker=worker_call)

    rendered_report = build_execution_report(request.plan_id, report)
    _print_console(rendered_report.body)
    try:
        published_page = publish_report(
            rendered_report.title,
            rendered_report.body,
            project_root=PROJECT_ROOT,
            executable=worker_executable,
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
