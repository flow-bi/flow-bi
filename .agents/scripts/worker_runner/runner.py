from __future__ import annotations

from pathlib import Path
from collections.abc import Callable
from dataclasses import dataclass
import json
import os
import shutil
import subprocess
import tempfile
import uuid

from .codex import (
    DEFAULT_TIMEOUT_SECONDS,
    PROJECT_ROOT,
    build_codex_command,
    build_subprocess_environment,
    classify_worker_area,
    collect_worker_readable_paths,
    validate_task_number,
)


SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]
WorkerLogger = Callable[[str, int, Path, Path, str], None]
WORKER_LOG_TAIL_BYTES = 16 * 1024


@dataclass(frozen=True)
class WorkerExecutionResult:
    returncode: int
    output: object | None
    output_error: str = ""


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


def execute_worker(
    prompt: str,
    allowed_paths: tuple[str, ...],
    forbidden_paths: tuple[str, ...],
    task_number: object,
    project_root: Path = PROJECT_ROOT,
    executable: str | None = None,
    base_environment: dict[str, str] | None = None,
    runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger = invoke_worker_logger,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> WorkerExecutionResult:
    """"Worker 하나를 실행하고 종료 결과를 반환한다."""

    validate_task_number(task_number)

    # Worker 실행을 식별하기 위한 고유 ID
    run_id = str(uuid.uuid4())

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

    # Worker 실행 환경 구성
    environment = build_subprocess_environment(
        run_id,
        task_number=task_number,
        worker_area=classify_worker_area(allowed_paths),
        base_environment=base_environment,
        project_root=project_root,
    )
    worker_temp = Path(environment["TMPDIR"])
    
    # codex exec 명령 생성
    command = build_codex_command(
        allowed_paths,
        forbidden_paths,
        output_path,
        executable,
        readable_paths=collect_worker_readable_paths(
            environment,
            project_root=project_root,
        ),
        writable_directories=(str(worker_temp),),
    )

    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            try:
                # Worker 진행 출력은 부모 콘솔이 아닌 Worker별 임시 로그로 격리한다.
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

            # 실행 시간 초과
            except subprocess.TimeoutExpired as error:
                log_file.flush()
                log_tail = _read_worker_log_tail(log_path)
                if log_tail:
                    error.stderr = _with_worker_log_tail("", log_tail)
                logger(run_id, 124, output_path, project_root, "timeout")
                raise

            # 기타 실행 오류
            except Exception as error:
                log_file.flush()
                log_tail = _read_worker_log_tail(log_path)
                if log_tail and hasattr(error, "add_note"):
                    error.add_note(_with_worker_log_tail("", log_tail))
                logger(run_id, 1, output_path, project_root, "failed")
                raise

            # 종료 결과 기록
            output, output_error = _read_worker_output(output_path)
            logger(
                run_id,
                result.returncode,
                output_path,
                project_root,
                _terminal_status(result.returncode, output, output_error),
            )
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
            )
    finally:
        # 최종 출력, 진행 로그와 Worker별 임시 공간은 성공·실패·timeout
        # 모두 부모 프로세스에서 정리한다.
        for temporary_path in (output_path, log_path):
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
