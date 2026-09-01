from __future__ import annotations

from collections.abc import Callable
import os
from pathlib import Path
import shutil
import subprocess

WORKER_LOG_TAIL_BYTES = 16 * 1024
SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]


# Worker 로그 파일의 마지막 부분 읽기
def read_worker_log_tail(
    log_path: Path,
    max_bytes: int = WORKER_LOG_TAIL_BYTES,
) -> str:
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

# 기존 오류 메시지와 Worker 로그 마지막 부분 합치기
def with_worker_log_tail(error: str, log_tail: str) -> str:
    if not log_tail:
        return error
    detail = f"Worker log tail:\n{log_tail.rstrip()}"
    return f"{error}\n{detail}" if error else detail

# Worker 실행이 끝나면 Hook을 호출해 실행 기록 남기기
def invoke_worker_completion_hook(
    run_id: str,
    exit_code: int,
    output_path: Path,
    project_root: Path,
    status: str,
    runner: SubprocessRunner = subprocess.run,
) -> None:
    """Run the optional Worker completion hook without affecting the outcome."""
    node = shutil.which("node")
    logger = project_root / ".codex" / "hooks" / "log-prompt-detail.mjs"
    if not node or not logger.is_file():
        return
    try:
        runner(
            [
                node,
                str(logger),
                "--worker-end",
                run_id,
                str(exit_code),
                str(output_path),
                status,
            ],
            cwd=project_root,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        # Hooks are observational. Preserve the Worker result if one fails.
        return
