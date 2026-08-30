from __future__ import annotations

from collections.abc import Iterator, Mapping, Sequence
from contextlib import ExitStack, contextmanager
from pathlib import Path

from .backend_service import BackendVerifier
from .frontend_service import FrontendVerifier


TaskPaths = tuple[Sequence[str], Sequence[str]]


def _uses_frontend(allowed_paths: Sequence[str]) -> bool:
    return any(
        path == "frontend" or path.startswith("frontend/")
        for path in allowed_paths
    )


@contextmanager
def prepare_verifier_environments(
    project_root: Path,
    task_paths: Mapping[int, TaskPaths],
) -> Iterator[dict[int, dict[str, str]]]:
    """Verifier를 실행하고 각 Task에 노출할 접속 환경을 준비한다."""
    with ExitStack() as resources:
        backend = resources.enter_context(BackendVerifier(project_root))
        frontend = resources.enter_context(FrontendVerifier(project_root))

        environments: dict[int, dict[str, str]] = {}
        for task_number, (allowed_paths, read_only_paths) in task_paths.items():
            environment = backend.environment_for_task(
                allowed_paths,
                read_only_paths,
            )
            if _uses_frontend(allowed_paths):
                environment.update(frontend.environment)
            environments[task_number] = environment

        yield environments
