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
)


SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]
WorkerLogger = Callable[[str, int, Path, Path], None]


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


def invoke_worker_logger(
    run_id: str,
    exit_code: int,
    output_path: Path,
    project_root: Path,
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
            [node, str(logger), "--worker-end", run_id, str(exit_code), str(output_path)],
            cwd=project_root,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return


def execute_worker(
    prompt: str,
    allowed_paths: tuple[str, ...],
    forbidden_paths: tuple[str, ...],
    project_root: Path = PROJECT_ROOT,
    executable: str | None = None,
    base_environment: dict[str, str] | None = None,
    runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger = invoke_worker_logger,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
) -> WorkerExecutionResult:
    """"Worker 하나를 실행하고 종료 결과를 반환한다."""

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

    # Worker 실행 환경 구성
    environment = build_subprocess_environment(run_id, base_environment)
    
    # codex exec 명령 생성
    command = build_codex_command(
        allowed_paths, forbidden_paths, output_path, executable
    )

    try:
        try:
            # Worker 실행
            result = runner(
                command,
                timeout=timeout,
                input=prompt,
                text=True,
                encoding="utf-8",
                env=environment,
                cwd=project_root,
                check=False,
            )

        # 실행 시간 초과
        except subprocess.TimeoutExpired:
            logger(run_id, 124, output_path, project_root)
            raise

        # 기타 실행 오류
        except Exception:
            logger(run_id, 1, output_path, project_root)
            raise
        
        # 종료 결과 기록
        logger(run_id, result.returncode, output_path, project_root)
        
        output, output_error = _read_worker_output(output_path)
        return WorkerExecutionResult(
            returncode=result.returncode,
            output=output,
            output_error=output_error,
        )
    finally:
        
        # 임시 출력 파일 삭제
        try:
            output_path.unlink()
        except FileNotFoundError:
            pass
