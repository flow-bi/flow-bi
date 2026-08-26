from __future__ import annotations

from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
import json
import os
from pathlib import Path
import subprocess
import tempfile

from .worker_log import (
    invoke_worker_completion_hook,
    read_worker_log_tail,
    with_worker_log_tail,
)


SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]
WorkerLogger = Callable[[str, int, Path, Path, str], None]
WorkerCommandFactory = Callable[[Path], list[str]]


@dataclass(frozen=True)
class WorkerExecutionResult:
    returncode: int
    output: object | None
    output_error: str = ""

# Codex가 작성한 최종 출력 파일을 읽고 JSON으로 변환
def read_worker_output(output_path: Path) -> tuple[object | None, str]:
    def reject_non_json_constant(value: str) -> None:
        raise ValueError(f"invalid JSON numeric constant: {value}")

    try:
        return json.loads(output_path.read_text(encoding="utf-8"), parse_constant=reject_non_json_constant), ""
    except (OSError, UnicodeError, ValueError) as error:
        return None, str(error)

# Worker 실행 중 사용할 임시 파일 두 개를 만들고 실행이 끝나면 삭제 
@contextmanager
def _temporary_worker_artifacts(
    project_root: Path,
    run_id: str,
) -> Generator[tuple[Path, Path], None, None]:
    pending_directory = project_root / ".codex-logs" / ".pending"
    pending_directory.mkdir(parents=True, exist_ok=True)

    artifact_paths: list[Path] = []

    try:
        output_descriptor, raw_output_path = tempfile.mkstemp(
            prefix=f"task-runner-{run_id}-",
            suffix=".txt",
            dir=pending_directory,
        )
        os.close(output_descriptor)

        output_path = Path(raw_output_path)
        artifact_paths.append(output_path)

        log_descriptor, raw_log_path = tempfile.mkstemp(
            prefix=f"task-runner-{run_id}-",
            suffix=".log",
            dir=pending_directory,
        )
        os.close(log_descriptor)

        log_path = Path(raw_log_path)
        artifact_paths.append(log_path)

        yield output_path, log_path

    finally:
        for path in artifact_paths:
            try:
                path.unlink()
            except FileNotFoundError:
                pass


def _terminal_status(returncode: int, output: object | None, output_error: str) -> str:
    if returncode != 0 or output_error:
        return "failed"
    if isinstance(output, dict) and output.get("final_status") == "PASS":
        return "completed"
    return "failed"


def run_worker_process(
    *,
    run_id: str,
    command_factory: WorkerCommandFactory,
    prompt: str,
    environment: dict[str, str],
    project_root: Path,
    runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    timeout: int = 30 * 60,
) -> WorkerExecutionResult:
    completion_logger = logger or invoke_worker_completion_hook

    with _temporary_worker_artifacts(project_root, run_id) as (output_path, log_path):
        command = command_factory(output_path)

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
                    stderr=log_file
                )
            # Worker 실행 시간이 timeout을 넘는 경우
            except subprocess.TimeoutExpired as error:
                log_file.flush()
                log_tail = read_worker_log_tail(log_path)

                if log_tail:
                    error.stderr = with_worker_log_tail("", log_tail)
                completion_logger(run_id, 124, output_path, project_root, "timeout")
                raise

            # Timeout 외의 프로세스 실행 예외
            except Exception as error:
                log_file.flush()
                log_tail = read_worker_log_tail(log_path)

                if log_tail and hasattr(error, "add_note"):
                    error.add_note(with_worker_log_tail("", log_tail))
                completion_logger(run_id, 1, output_path, project_root, "failed")
                raise

            output, output_error = read_worker_output(output_path)
            completion_logger(
                run_id,
                result.returncode,
                output_path,
                project_root,
                _terminal_status(result.returncode, output, output_error),
            )

            if result.returncode != 0 or output_error:
                log_file.flush()
                output_error = with_worker_log_tail(output_error, read_worker_log_tail(log_path))
            return WorkerExecutionResult(result.returncode, output, output_error)
