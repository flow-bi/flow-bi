"""Harness 실행에 필요한 입력을 준비한다."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from ..models.plan import Task
from .codex import resolve_codex_executable
from .worker_settings import TaskWorkerSettings, prepare_task_worker_settings


@dataclass(frozen=True)
class PreparedExecution:
    worker_settings_by_task: dict[int, TaskWorkerSettings]
    codex_executable: str


def prepare_execution(
    tasks: Sequence[Task],
) -> PreparedExecution:
    executable = resolve_codex_executable()
    return PreparedExecution(
        worker_settings_by_task=prepare_task_worker_settings(tasks),
        codex_executable=executable,
    )
