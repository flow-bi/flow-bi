from __future__ import annotations

from pathlib import Path
from collections.abc import Callable
from dataclasses import dataclass
import json
import os
import shutil
import subprocess
import tempfile
from threading import Thread

from .codex import (
    DEFAULT_TIMEOUT_SECONDS,
    PROJECT_ROOT,
    build_codex_command,
    build_subprocess_environment,
    collect_worker_readable_paths,
    validate_task_number,
)
from .timing import CollectionService, EventSink, NodeEventSink, RunContext, determine_worker_area


SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]
WorkerLogger = Callable[[str, int, Path, Path, str], None]
WORKER_LOG_TAIL_BYTES = 16 * 1024
_TOOL_ITEM_TYPES = frozenset(("command_execution", "file_change", "mcp_tool_call", "web_search", "function_call"))


@dataclass(frozen=True)
class WorkerExecutionResult:
    returncode: int
    output: object | None
    output_error: str = ""
    timing_summary: object | None = None
    run_id: str = ""


def _read_worker_output(output_path: Path) -> tuple[object | None, str]:
    def reject_non_json_constant(value: str) -> None:
        raise ValueError(f"유효한 JSON 숫자가 아닙니다: {value}")

    try:
        return json.loads(
            output_path.read_text(encoding="utf-8"),
            parse_constant=reject_non_json_constant,
        ), ""
    except (OSError, UnicodeError, ValueError) as error:
        return None, str(error)


def _node_timing_summary(project_root: Path, run_id: str) -> object | None:
    """Read one completed Worker node from the Node-owned aggregate tree."""

    try:
        tree = json.loads(
            (project_root / ".codex-logs" / "user-prompt-detail-tree.json").read_text(
                encoding="utf-8"
            )
        )
    except FileNotFoundError:
        return None
    except (OSError, UnicodeError, ValueError):
        return {"run_id": run_id}

    pending = list(tree.get("roots", ())) + list(tree.get("unresolved", ())) if isinstance(tree, dict) else []
    while pending:
        node = pending.pop()
        if not isinstance(node, dict):
            continue
        pending.extend(node.get("children", ()) if isinstance(node.get("children"), list) else ())
        executor = node.get("executor")
        if node.get("run_id") != run_id or not isinstance(executor, dict) or executor.get("kind") != "task":
            continue
        return {
            "run_id": run_id,
            "task_number": executor.get("task_number"),
            "area": node.get("area"),
            "total_duration_ms": node.get("total_duration_ms"),
            "unattributed_duration_ms": node.get("unattributed_duration_ms"),
            "classification": node.get("classification"),
            "phases": node.get("phases"),
        }
    return None


def _read_worker_log_tail(
    log_path: Path,
    max_bytes: int = WORKER_LOG_TAIL_BYTES,
) -> str:
    """Worker 로그 전체를 메모리에 올리지 않고 마지막 구간만 읽는다."""

    try:
        with log_path.open("rb") as log_file:
            log_file.seek(0, os.SEEK_END)
            size = log_file.tell()
            start = max(0, size - max_bytes)
            log_file.seek(start)
            tail = log_file.read(max_bytes).decode("utf-8", errors="replace")
    except OSError:
        return ""

    if not tail.strip():
        return ""
    if start:
        return "[앞부분 생략: Worker 로그 tail만 표시]\n" + tail
    return tail


def _with_worker_log_tail(error: str, log_tail: str) -> str:
    if not log_tail:
        return error
    detail = f"Worker 로그 tail:\n{log_tail.rstrip()}"
    return f"{error}\n{detail}" if error else detail


def _jsonl_tool_events_for_line(
    line: str, open_items: dict[str, str],
) -> tuple[dict[str, str], ...]:
    try:
        payload = json.loads(line)
        item = payload.get("item", {})
        event_type = payload.get("type")
        item_id = item.get("id")
        item_type = item.get("type")
    except (AttributeError, TypeError, ValueError):
        return ()
    if not isinstance(item_id, str) or not isinstance(item_type, str) or item_type not in _TOOL_ITEM_TYPES:
        return ()
    # Keep only the stable id and enum-like item type: command text and
    # file/patch payloads never leave this parser.
    if event_type == "item.started" and item_id not in open_items:
        open_items[item_id] = item_type
        return ({"event_type": "tool_start", "tool_id": item_id, "tool_name": item_type, "classification": item_type},)
    if event_type == "item.completed" and item_id in open_items:
        tool_name = open_items.pop(item_id)
        return ({"event_type": "tool_end", "tool_id": item_id, "tool_name": tool_name, "classification": tool_name},)
    return ()


def _jsonl_tool_events(progress_path: Path) -> tuple[dict[str, str], ...]:
    try:
        lines = progress_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ()
    open_items: dict[str, str] = {}
    events: list[dict[str, str]] = []
    for line in lines:
        events.extend(_jsonl_tool_events_for_line(line, open_items))
    return tuple(events)


def _run_worker_streaming(
    command: list[str], prompt: str, timeout: int, environment: dict[str, str], project_root: Path,
    progress_file: object, log_file: object, on_tool_event: Callable[[dict[str, str]], None],
) -> subprocess.CompletedProcess[str]:
    """Consume JSONL as it is emitted, keeping progress and stderr isolated."""

    process = subprocess.Popen(
        command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log_file,
        text=True, encoding="utf-8", env=environment, cwd=project_root,
    )
    open_items: dict[str, str] = {}

    def consume() -> None:
        if process.stdout is None:
            return
        for line in process.stdout:
            progress_file.write(line)
            progress_file.flush()
            for tool_event in _jsonl_tool_events_for_line(line, open_items):
                on_tool_event(tool_event)

    reader = Thread(target=consume, daemon=True)
    reader.start()
    try:
        if process.stdin is not None:
            process.stdin.write(prompt)
            process.stdin.close()
        returncode = process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
        raise
    finally:
        reader.join(timeout=5)
    return subprocess.CompletedProcess(command, returncode)


def invoke_worker_logger(
    run_id: str,
    exit_code: int,
    output_path: Path,
    project_root: Path,
    status: str,
    runner: SubprocessRunner = subprocess.run,
) -> None:
    """"Worker 종료 후 prompt-detail Hook을 실행"""

    # Node 실행 파일 찾기
    node = shutil.which("node")
    # Hook 스크립트 위치
    logger = project_root / ".codex" / "hooks" / "log-prompt-detail.mjs"
    
    # Node 또는 Hook이 없으면 아무 작업도 하지 않는다.
    if not node or not logger.is_file():
        return
    try:
        runner(
            [node, str(logger), "--worker-end", run_id, str(exit_code), str(output_path), status],
            cwd=project_root,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return


def _terminal_status(returncode: int, output: object | None, output_error: str) -> str:
    if returncode != 0 or output_error:
        return "failed"
    if isinstance(output, dict) and output.get("final_status") == "PASS":
        return "completed"
    return "failed"


def _submit_terminal_event(
    service: CollectionService,
    context: RunContext,
    status: str,
    exit_code: int,
    summary: object,
    diagnostic: str,
) -> None:
    try:
        service.submit({
            "event_type": "end",
            "run_id": context.run_id,
            "token": context.token,
            "status": status,
            "exit_code": exit_code,
            "summary": str(summary)[:4096],
        })
    except Exception:
        service.diagnostics.append(diagnostic)


def _resolved_timing_summary(
    service: CollectionService, project_root: Path, run_id: str,
) -> object | None:
    if service.timing_summary is not None:
        return service.timing_summary
    return _node_timing_summary(project_root, run_id)


def execute_worker(
    prompt: str,
    allowed_paths: tuple[str, ...],
    forbidden_paths: tuple[str, ...],
    task_number: object,
    project_root: Path = PROJECT_ROOT,
    executable: str | None = None,
    base_environment: dict[str, str] | None = None,
    runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    event_sink: EventSink | None = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> WorkerExecutionResult:
    """"Worker 하나를 실행하고 종료 결과를 반환한다."""

    validate_task_number(task_number)

    # Worker 실행을 식별하기 위한 고유 ID와 인증 토큰은 매 실행 새로 만든다.
    area = determine_worker_area(allowed_paths)
    context = RunContext.create(
        task_number=task_number,
        area=area,
        parent_session_id=(base_environment or os.environ).get("CODEX_THREAD_ID"),
    )
    run_id = context.run_id
    service = CollectionService(context, event_sink or NodeEventSink(project_root))
    service.start()

    # Worker 출력 임시파일 저장 위치
    pending_directory = project_root / ".codex-logs" / ".pending"
    pending_directory.mkdir(parents=True, exist_ok=True)

    # Codex 출력 파일 생성
    descriptor, raw_output_path = tempfile.mkstemp(
        prefix=f"task-runner-{run_id}-", suffix=".txt", dir=pending_directory
    )
    os.close(descriptor)
    output_path = Path(raw_output_path)

    log_descriptor, raw_log_path = tempfile.mkstemp(
        prefix=f"task-runner-{run_id}-", suffix=".log", dir=pending_directory
    )
    os.close(log_descriptor)
    log_path = Path(raw_log_path)

    progress_descriptor, raw_progress_path = tempfile.mkstemp(
        prefix=f"task-runner-{run_id}-", suffix=".jsonl", dir=pending_directory
    )
    os.close(progress_descriptor)
    progress_path = Path(raw_progress_path)

    # Worker 실행 환경 구성
    environment = build_subprocess_environment(
        run_id,
        task_number=task_number,
        base_environment=base_environment,
        project_root=project_root,
    )
    readable_paths = collect_worker_readable_paths(
        environment,
        project_root=project_root,
    )
    environment = service.worker_environment(environment)
    worker_temp = Path(environment["TMPDIR"])
    
    # codex exec 명령 생성
    command = build_codex_command(
        allowed_paths,
        forbidden_paths,
        output_path,
        executable,
        readable_paths=readable_paths,
        writable_directories=(str(worker_temp),),
    )

    try:
        try:
            service.submit({"event_type": "start", "run_id": run_id, "token": context.token})
        except Exception:
            # Observability failures remain diagnostic and never affect Worker results.
            service.diagnostics.append("start event failed")
        with progress_path.open("w", encoding="utf-8") as progress_file, log_path.open("w", encoding="utf-8") as log_file:
            try:
                # Worker 진행 출력은 부모 콘솔이 아닌 Worker별 임시 로그로 격리한다.
                def submit_tool(tool_event: dict[str, str]) -> None:
                    try:
                        service.submit({**tool_event, "run_id": run_id, "token": context.token})
                    except Exception:
                        service.diagnostics.append("tool event failed")

                if runner is subprocess.run:
                    result = _run_worker_streaming(
                        command, prompt, timeout, environment, project_root,
                        progress_file, log_file, submit_tool,
                    )
                else:
                    result = runner(
                        command,
                        timeout=timeout,
                        input=prompt,
                        text=True,
                        encoding="utf-8",
                        env=environment,
                        cwd=project_root,
                        check=False,
                        stdout=progress_file,
                        stderr=log_file,
                    )

            # 실행 시간 초과
            except subprocess.TimeoutExpired as error:
                log_file.flush()
                log_tail = _read_worker_log_tail(log_path)
                if log_tail:
                    error.stderr = _with_worker_log_tail("", log_tail)
                _submit_terminal_event(
                    service, context, "timeout", 124, "Worker timed out.",
                    "timeout event failed",
                )
                error.timing_summary = _resolved_timing_summary(service, project_root, run_id)
                error.run_id = run_id
                if logger is not None:
                    logger(run_id, 124, output_path, project_root, "timeout")
                raise

            # 기타 실행 오류
            except Exception as error:
                log_file.flush()
                log_tail = _read_worker_log_tail(log_path)
                if log_tail and hasattr(error, "add_note"):
                    error.add_note(_with_worker_log_tail("", log_tail))
                _submit_terminal_event(
                    service, context, "failed", 1, "Worker subprocess failed.",
                    "failure event failed",
                )
                error.timing_summary = _resolved_timing_summary(service, project_root, run_id)
                error.run_id = run_id
                if logger is not None:
                    logger(run_id, 1, output_path, project_root, "failed")
                raise

            # Test runners write the isolated JSONL fixture synchronously;
            # production consumes the same stream while the process runs.
            progress_file.flush()
            if runner is not subprocess.run:
                for tool_event in _jsonl_tool_events(progress_path):
                    submit_tool(tool_event)

            # 종료 결과 기록
            output, output_error = _read_worker_output(output_path)
            status = _terminal_status(result.returncode, output, output_error)
            summary = output.get("work_summary", "") if isinstance(output, dict) else ""
            _submit_terminal_event(
                service, context, status, result.returncode, summary,
                "terminal event failed",
            )
            if logger is not None:
                logger(run_id, result.returncode, output_path, project_root, status)
            if result.returncode != 0 or output_error:
                log_file.flush()
                output_error = _with_worker_log_tail(
                    output_error,
                    _read_worker_log_tail(log_path),
                )
            return WorkerExecutionResult(
                returncode=result.returncode,
                output=output,
                output_error=output_error,
                timing_summary=_resolved_timing_summary(service, project_root, run_id),
                run_id=run_id,
            )
    finally:
        service.close()
        # 최종 출력, 진행 로그와 Worker별 임시 공간은 성공·실패·timeout
        # 모두 부모 프로세스에서 정리한다.
        for temporary_path in (output_path, log_path, progress_path):
            try:
                temporary_path.unlink()
            except FileNotFoundError:
                pass
        try:
            shutil.rmtree(worker_temp)
        except FileNotFoundError:
            pass
        try:
            worker_temp.parent.rmdir()
        except (FileNotFoundError, OSError):
            # 병렬 Worker가 같은 상위 디렉터리를 사용 중일 수 있다.
            pass
