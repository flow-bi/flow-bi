from __future__ import annotations

from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]
WorkerLogger = Callable[[str, int, Path, Path, str], None]
WorkerCommandFactory = Callable[[Path], list[str]]
WORKER_LOG_TAIL_BYTES = 16 * 1024


@dataclass(frozen=True)
class WorkerExecutionResult:
    returncode: int
    output: object | None
    output_error: str = ""


def read_worker_output(output_path: Path) -> tuple[object | None, str]:
    def reject_non_json_constant(value: str) -> None:
        raise ValueError(f"invalid JSON numeric constant: {value}")

    try:
        return json.loads(output_path.read_text(encoding="utf-8"), parse_constant=reject_non_json_constant), ""
    except (OSError, UnicodeError, ValueError) as error:
        return None, str(error)


def read_worker_log_tail(log_path: Path, max_bytes: int = WORKER_LOG_TAIL_BYTES) -> str:
    """Read at most the final 16 KiB of an isolated Worker progress log."""
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
        return "[earlier output omitted: Worker log tail]\n" + tail
    return tail


def _with_worker_log_tail(error: str, log_tail: str) -> str:
    if not log_tail:
        return error
    detail = f"Worker log tail:\n{log_tail.rstrip()}"
    return f"{error}\n{detail}" if error else detail


def invoke_worker_logger(run_id: str, exit_code: int, output_path: Path, project_root: Path, status: str, runner: SubprocessRunner = subprocess.run) -> None:
    """Run the optional Worker completion hook without affecting the outcome."""
    node = shutil.which("node")
    logger = project_root / ".codex" / "hooks" / "log-prompt-detail.mjs"
    if not node or not logger.is_file():
        return
    try:
        runner([node, str(logger), "--worker-end", run_id, str(exit_code), str(output_path), status], cwd=project_root, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        # Hooks are observational. Preserve the Worker result if one fails.
        return


@contextmanager
def _temporary_worker_artifacts(project_root: Path, run_id: str) -> Generator[tuple[Path, Path], None, None]:
    pending_directory = project_root / ".codex-logs" / ".pending"
    pending_directory.mkdir(parents=True, exist_ok=True)
    descriptors: list[tuple[int, str]] = []
    try:
        descriptors.append(tempfile.mkstemp(prefix=f"task-runner-{run_id}-", suffix=".txt", dir=pending_directory))
        descriptors.append(tempfile.mkstemp(prefix=f"task-runner-{run_id}-", suffix=".log", dir=pending_directory))
        output_descriptor, raw_output_path = descriptors[0]
        log_descriptor, raw_log_path = descriptors[1]
        os.close(output_descriptor)
        os.close(log_descriptor)
        yield Path(raw_output_path), Path(raw_log_path)
    finally:
        for descriptor, raw_path in descriptors:
            try:
                os.close(descriptor)
            except OSError:
                pass
            try:
                Path(raw_path).unlink()
            except FileNotFoundError:
                pass


def _terminal_status(returncode: int, output: object | None, output_error: str) -> str:
    if returncode != 0 or output_error:
        return "failed"
    if isinstance(output, dict) and output.get("final_status") == "PASS":
        return "completed"
    return "failed"


def run_worker_process(*, run_id: str, command_factory: WorkerCommandFactory, prompt: str, environment: dict[str, str], project_root: Path, runner: SubprocessRunner = subprocess.run, logger: WorkerLogger = invoke_worker_logger, timeout: int = 30 * 60) -> WorkerExecutionResult:
    """Run one Worker process and keep artifacts isolated for its full lifetime."""
    with _temporary_worker_artifacts(project_root, run_id) as (output_path, log_path):
        command = command_factory(output_path)
        with log_path.open("w", encoding="utf-8") as log_file:
            try:
                result = runner(command, timeout=timeout, input=prompt, text=True, encoding="utf-8", env=environment, cwd=project_root, check=False, stdout=log_file, stderr=log_file)
            except subprocess.TimeoutExpired as error:
                log_file.flush()
                log_tail = read_worker_log_tail(log_path)
                if log_tail:
                    error.stderr = _with_worker_log_tail("", log_tail)
                logger(run_id, 124, output_path, project_root, "timeout")
                raise
            except Exception as error:
                log_file.flush()
                log_tail = read_worker_log_tail(log_path)
                if log_tail and hasattr(error, "add_note"):
                    error.add_note(_with_worker_log_tail("", log_tail))
                logger(run_id, 1, output_path, project_root, "failed")
                raise
            output, output_error = read_worker_output(output_path)
            logger(run_id, result.returncode, output_path, project_root, _terminal_status(result.returncode, output, output_error))
            if result.returncode != 0 or output_error:
                log_file.flush()
                output_error = _with_worker_log_tail(output_error, read_worker_log_tail(log_path))
            return WorkerExecutionResult(result.returncode, output, output_error)
