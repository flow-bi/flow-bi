"""Harness 실행에 필요한 입력을 준비한다."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from ..models.plan import Task
from .codex import resolve_codex_executable
from .task_invocations import PreparedWorkerTask, prepare_task_invocations


@dataclass(frozen=True)
class PreparedExecution:
    task_invocations: dict[int, PreparedWorkerTask]
    codex_executable: str


def prepare_execution(
    tasks: Sequence[Task],
) -> PreparedExecution:
    executable = resolve_codex_executable()
    return PreparedExecution(
        task_invocations=prepare_task_invocations(
            tasks,
            executable=executable,
        ),
        codex_executable=executable,
    )
