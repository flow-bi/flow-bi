from __future__ import annotations

from collections.abc import Callable, Iterator, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from .prompt import WorkerPromptTemplate
from .runner import execute_worker
from .verifiers import prepare_verifier_environments


TaskPaths = Mapping[int, tuple[Sequence[str], Sequence[str]]]


@dataclass(frozen=True)
class WorkerExecutionRequest:
    task_number: int
    common_prompt: str
    additional_request: str
    title: str
    task_prompt: str
    verification_items: tuple[str, ...]
    execution_context: Mapping[str, object] | None
    decision_correction: Mapping[str, object] | None
    executable: str
    config_overrides: tuple[str, ...]
    environment: dict[str, str]


WorkerExecutor = Callable[[WorkerExecutionRequest], object]


@contextmanager
def open_worker_executor(
    project_root: Path,
    task_paths: TaskPaths,
) -> Iterator[WorkerExecutor]:
    """Verifier 생명주기 안에서 사용할 Worker 실행기를 제공한다."""
    prompt_template = WorkerPromptTemplate.load()

    with prepare_verifier_environments(
        project_root,
        task_paths,
    ) as verifier_environments:

        def execute(request: WorkerExecutionRequest) -> object:
            prepared_prompt = prompt_template.prepare_task(
                request.task_number,
                task_paths[request.task_number][0],
                request.verification_items,
            )
            return execute_worker(
                prompt=prompt_template.render(
                    prepared_prompt,
                    task_number=request.task_number,
                    common_prompt=request.common_prompt,
                    additional_request=request.additional_request,
                    title=request.title,
                    task_prompt=request.task_prompt,
                    execution_context=request.execution_context,
                    decision_correction=request.decision_correction,
                ),
                executable=request.executable,
                config_overrides=request.config_overrides,
                environment={
                    **request.environment,
                    **verifier_environments[request.task_number],
                },
                project_root=project_root,
            )

        yield execute
