from __future__ import annotations

from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
import json
from pathlib import Path
import subprocess
from threading import Thread

from .codex_cli import build_codex_command
from .worker_log import (
    invoke_worker_completion_hook,
    read_worker_log_tail,
    with_worker_log_tail,
)


SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]
WorkerLogger = Callable[[str, int, Path, Path, str], None]


@dataclass(frozen=True)
class WorkerExecutionResult:
    returncode: int
    output: object | None
    output_error: str = ""
    timing_summary: object | None = None
    run_id: str = ""


_TOOL_ITEM_TYPES = frozenset(
    (
        "command_execution",
        "file_change",
        "mcp_tool_call",
        "web_search",
        "function_call",
    )
)

def read_worker_output(output_path: Path) -> tuple[object | None, str]:
    def reject_non_json_constant(value: str) -> None:
        raise ValueError(f"invalid JSON numeric constant: {value}")

    try:
        return (
            json.loads(
                output_path.read_text(encoding="utf-8"),
                parse_constant=reject_non_json_constant,
            ),
            "",
        )
    except (OSError, UnicodeError, ValueError) as error:
        return None, str(error)


@contextmanager
def _temporary_worker_artifacts(
    project_root: Path,
    run_id: str,
) -> Generator[tuple[Path, Path, Path], None, None]:
    pending_directory = project_root / ".codex-logs" / ".pending"
    pending_directory.mkdir(parents=True, exist_ok=True)

    output_path = pending_directory / f"task-runner-{run_id}.json"
    log_path = pending_directory / f"task-runner-{run_id}.log"
    progress_path = pending_directory / f"task-runner-{run_id}.jsonl"

    try:
        output_path.touch(exist_ok=False)
        log_path.touch(exist_ok=False)
        progress_path.touch(exist_ok=False)
        yield output_path, log_path, progress_path
    finally:
        output_path.unlink(missing_ok=True)
        log_path.unlink(missing_ok=True)
        progress_path.unlink(missing_ok=True)


def _jsonl_tool_events_for_line(
    line: str,
    open_items: dict[str, str],
) -> tuple[dict[str, str], ...]:
    try:
        payload = json.loads(line)
        item = payload.get("item", {})
        event_type = payload.get("type")
        item_id = item.get("id")
        item_type = item.get("type")
    except (AttributeError, TypeError, ValueError):
        return ()
    if (
        not isinstance(item_id, str)
        or not isinstance(item_type, str)
        or item_type not in _TOOL_ITEM_TYPES
    ):
        return ()
    if event_type == "item.started" and item_id not in open_items:
        open_items[item_id] = item_type
        return ({
            "event_type": "tool_start",
            "tool_id": item_id,
            "tool_name": item_type,
            "classification": item_type,
        },)
    if event_type == "item.completed" and item_id in open_items:
        tool_name = open_items.pop(item_id)
        return ({
            "event_type": "tool_end",
            "tool_id": item_id,
            "tool_name": tool_name,
            "classification": tool_name,
        },)
    return ()


def _jsonl_tool_events(progress_path: Path) -> tuple[dict[str, str], ...]:
    try:
        lines = progress_path.read_text(
            encoding="utf-8", errors="replace"
        ).splitlines()
    except OSError:
        return ()
    open_items: dict[str, str] = {}
    events: list[dict[str, str]] = []
    for line in lines:
        events.extend(_jsonl_tool_events_for_line(line, open_items))
    return tuple(events)


def _run_worker_streaming(
    command: list[str],
    prompt: str,
    timeout: int,
    environment: dict[str, str],
    project_root: Path,
    progress_file: object,
    log_file: object,
    on_tool_event: Callable[[dict[str, str]], None],
) -> subprocess.CompletedProcess[str]:
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=log_file,
        text=True,
        encoding="utf-8",
        env=environment,
        cwd=project_root,
    )
    open_items: dict[str, str] = {}

    def consume() -> None:
        if process.stdout is None:
            return
        for line in process.stdout:
            progress_file.write(line)
            progress_file.flush()
            for event in _jsonl_tool_events_for_line(line, open_items):
                on_tool_event(event)

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


def _terminal_status(returncode: int, output: object | None, output_error: str) -> str:
    if returncode != 0 or output_error:
        return "failed"
    if isinstance(output, dict) and output.get("final_status") == "PASS":
        return "completed"
    return "failed"


def _notify_completion(
    logger: WorkerLogger,
    run_id: str,
    exit_code: int,
    output_path: Path,
    project_root: Path,
    status: str,
) -> None:
    try:
        logger(run_id, exit_code, output_path, project_root, status)
    except Exception:
        return


def run_worker_process(
    *,
    run_id: str,
    executable: str,
    config_overrides: tuple[str, ...],
    prompt: str,
    environment: dict[str, str],
    project_root: Path,
    runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    timeout: int = 90 * 60,
    on_tool_event: Callable[[dict[str, str]], None] | None = None,
) -> WorkerExecutionResult:
    completion_logger = logger or invoke_worker_completion_hook
    emit_tool_event = on_tool_event or (lambda _event: None)

    with _temporary_worker_artifacts(project_root, run_id) as (
        output_path,
        log_path,
        progress_path,
    ):
        command = build_codex_command(
            output_path=output_path,
            executable=executable,
            config_overrides=config_overrides,
        )

        with (
            progress_path.open("w", encoding="utf-8") as progress_file,
            log_path.open("w", encoding="utf-8") as log_file,
        ):
            try:
                if runner is subprocess.run:
                    result = _run_worker_streaming(
                        command,
                        prompt,
                        timeout,
                        environment,
                        project_root,
                        progress_file,
                        log_file,
                        emit_tool_event,
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
            except subprocess.TimeoutExpired as error:
                log_file.flush()
                log_tail = read_worker_log_tail(log_path)

                if log_tail:
                    error.stderr = with_worker_log_tail("", log_tail)
                _notify_completion(
                    completion_logger,
                    run_id,
                    124,
                    output_path,
                    project_root,
                    "timeout",
                )
                raise

            except Exception as error:
                log_file.flush()
                log_tail = read_worker_log_tail(log_path)

                if log_tail and hasattr(error, "add_note"):
                    error.add_note(with_worker_log_tail("", log_tail))
                _notify_completion(
                    completion_logger,
                    run_id,
                    1,
                    output_path,
                    project_root,
                    "failed",
                )
                raise

            progress_file.flush()
            if runner is not subprocess.run:
                for event in _jsonl_tool_events(progress_path):
                    emit_tool_event(event)

            output, output_error = read_worker_output(output_path)
            _notify_completion(
                completion_logger,
                run_id,
                result.returncode,
                output_path,
                project_root,
                _terminal_status(result.returncode, output, output_error),
            )

            if result.returncode != 0 or output_error:
                log_file.flush()
                output_error = with_worker_log_tail(
                    output_error,
                    read_worker_log_tail(log_path),
                )
            return WorkerExecutionResult(result.returncode, output, output_error)
