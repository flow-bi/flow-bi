from __future__ import annotations

from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
import json
from pathlib import Path
import subprocess

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
) -> Generator[tuple[Path, Path], None, None]:
    pending_directory = project_root / ".codex-logs" / ".pending"
    pending_directory.mkdir(parents=True, exist_ok=True)

    output_path = pending_directory / f"task-runner-{run_id}.json"
    log_path = pending_directory / f"task-runner-{run_id}.log"

    try:
        output_path.touch(exist_ok=False)
        log_path.touch(exist_ok=False)
        yield output_path, log_path
    finally:
        output_path.unlink(missing_ok=True)
        log_path.unlink(missing_ok=True)


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
    timeout: int = 30 * 60,
) -> WorkerExecutionResult:
    completion_logger = logger or invoke_worker_completion_hook

    with _temporary_worker_artifacts(project_root, run_id) as (output_path, log_path):
        command = build_codex_command(
            output_path=output_path,
            executable=executable,
            config_overrides=config_overrides,
        )

        with log_path.open("w", encoding="utf-8") as log_file:
            try:
                result = runner(
                    command,
                    timeout=timeout,
                    input=prompt,
                    text=True,
                    encoding="utf-8",
                    env=environment,
                    cwd=project_root,
                    check=False,
                    stdout=log_file,
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
