from __future__ import annotations

from collections.abc import Iterator, Sequence
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass
from pathlib import Path

from .backend_service import BackendVerifier
from .frontend_service import FrontendVerifier


class VerifierRuntimeError(RuntimeError):
    """Verifier Runtime을 안전하게 준비하거나 사용할 수 없다."""


@dataclass(frozen=True)
class TaskVerifierScope:
    task_number: int
    allowed_paths: tuple[str, ...]
    read_only_paths: tuple[str, ...]


def _uses_directory(scope: TaskVerifierScope, directory: str) -> bool:
    return any(
        path == directory or path.startswith(f"{directory}/")
        for path in (*scope.allowed_paths, *scope.read_only_paths)
    )


class VerifierRuntime:
    def __init__(self, environments: dict[int, dict[str, str]]) -> None:
        self._environments = environments

    def environment_for(self, task_number: int) -> dict[str, str]:
        try:
            return self._environments[task_number].copy()
        except KeyError as error:
            raise VerifierRuntimeError(
                f"알 수 없는 Task의 Verifier 환경 요청: {task_number}"
            ) from error


@contextmanager
def open_verifier_runtime(
    project_root: Path,
    scopes: Sequence[TaskVerifierScope],
) -> Iterator[VerifierRuntime]:
    """Plan scope에 필요한 Verifier만 시작하고 Task별 환경을 제공한다."""
    scope_by_number: dict[int, TaskVerifierScope] = {}
    for scope in scopes:
        if scope.task_number in scope_by_number:
            raise VerifierRuntimeError(
                f"Verifier scope의 Task 번호가 중복되었습니다: {scope.task_number}"
            )
        scope_by_number[scope.task_number] = scope

    backend_required = any(_uses_directory(scope, "backend") for scope in scopes)
    frontend_required = any(_uses_directory(scope, "frontend") for scope in scopes)

    with ExitStack() as resources:
        try:
            backend = (
                resources.enter_context(BackendVerifier(project_root))
                if backend_required
                else None
            )
            frontend = (
                resources.enter_context(FrontendVerifier(project_root))
                if frontend_required
                else None
            )
            environments: dict[int, dict[str, str]] = {}
            for task_number, scope in scope_by_number.items():
                environment: dict[str, str] = {}
                if backend is not None and _uses_directory(scope, "backend"):
                    environment.update(
                        backend.environment_for_task(
                            scope.allowed_paths,
                            scope.read_only_paths,
                        )
                    )
                if frontend is not None and _uses_directory(scope, "frontend"):
                    environment.update(frontend.environment)
                environments[task_number] = environment
        except Exception as error:
            raise VerifierRuntimeError(
                f"Verifier Runtime 시작 실패: {error}"
            ) from error

        yield VerifierRuntime(environments)
