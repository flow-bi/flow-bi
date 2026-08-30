from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import TypeVar

from .prompt import WorkerPromptTemplate
from .runner import execute_worker
from .verifiers import prepare_verifier_environments


Result = TypeVar("Result")
WorkerExecutor = Callable[..., object]
TaskPaths = Mapping[int, tuple[Sequence[str], Sequence[str]]]


def run_worker_cohort(
    project_root: Path,
    task_paths: TaskPaths,
    action: Callable[[WorkerExecutor], Result],
) -> Result:
    """Verifier 생명주기를 소유하며 Harness의 실행 제어를 수행한다."""
    prompt_template = WorkerPromptTemplate.load()

    with prepare_verifier_environments(
        project_root,
        task_paths,
    ) as verifier_environments:

        def execute(
            task_number: int,
            *,
            common_prompt: str,
            additional_request: str,
            title: str,
            task_prompt: str,
            verification_items: Sequence[str],
            execution_context: Mapping[str, object] | None,
            decision_correction: Mapping[str, object] | None,
            executable: str,
            config_overrides: tuple[str, ...],
            environment: dict[str, str],
        ) -> object:
            prepared_prompt = prompt_template.prepare_task(
                task_number,
                task_paths[task_number][0],
                verification_items,
            )
            return execute_worker(
                prompt=prompt_template.render(
                    prepared_prompt,
                    task_number=task_number,
                    common_prompt=common_prompt,
                    additional_request=additional_request,
                    title=title,
                    task_prompt=task_prompt,
                    execution_context=execution_context,
                    decision_correction=decision_correction,
                ),
                executable=executable,
                config_overrides=config_overrides,
                environment={
                    **environment,
                    **verifier_environments[task_number],
                },
                project_root=project_root,
            )

        return action(execute)
