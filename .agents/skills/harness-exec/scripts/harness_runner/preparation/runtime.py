from __future__ import annotations

from collections.abc import Iterator, Mapping, Sequence
from contextlib import ExitStack
from dataclasses import dataclass, field
from pathlib import Path
import subprocess
import sys
import uuid


WORKER_SCRIPTS = Path(__file__).resolve().parents[5] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner import execute_prepared_worker
from worker_runner.backend_verifier import BackendVerifier
from worker_runner.frontend_verifier import FrontendVerifier
from worker_runner.worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
)

from ..models import Task, TaskInvocation
from ..planning.paths import PROJECT_ROOT
from .config import build_config_overrides, load_worker_config_template
from .environment import (
    build_task_verifier_environment,
    build_worker_task_environment,
    prepare_common_worker_environment,
)
from .prompt import PreparedWorkerPrompt, WorkerPromptTemplate


DEFAULT_TIMEOUT_SECONDS = 30 * 60


def _validate_task_number(task_number: object) -> str:
    if (
        isinstance(task_number, bool)
        or not isinstance(task_number, int)
        or task_number <= 0
    ):
        raise ValueError("Task number must be a positive integer.")
    return str(task_number)


@dataclass(frozen=True)
class WorkerRuntime:
    project_root: Path
    executable: str
    base_environment: dict[str, str] = field(repr=False)
    config_template: dict[str, object] = field(repr=False)
    toolchain_readable_paths: tuple[str, ...]
    timeout: int = DEFAULT_TIMEOUT_SECONDS
    process_runner: SubprocessRunner = field(
        default=subprocess.run,
        repr=False,
        compare=False,
    )
    logger: WorkerLogger | None = field(default=None, repr=False, compare=False)

    def bind_task(
        self,
        task_number: object,
        writable_paths: tuple[str, ...],
        read_only_paths: tuple[str, ...],
        verifier_environment: dict[str, str] | None = None,
    ) -> WorkerTaskRuntime:
        task_number_text = _validate_task_number(task_number)
        config_overrides = tuple(
            build_config_overrides(
                writable_paths,
                read_only_paths,
                self.toolchain_readable_paths,
                template=self.config_template,
            )
        )
        return WorkerTaskRuntime(
            self,
            task_number_text,
            dict(verifier_environment or {}),
            config_overrides,
        )


@dataclass(frozen=True)
class WorkerTaskRuntime:
    runtime: WorkerRuntime = field(repr=False)
    task_number: str
    verifier_environment: dict[str, str] = field(repr=False)
    config_overrides: tuple[str, ...] = field(repr=False)

    def environment_for_run(self, run_id: str) -> dict[str, str]:
        return build_worker_task_environment(
            self.runtime.base_environment,
            run_id=run_id,
            task_number=self.task_number,
            overrides=self.verifier_environment,
        )

    def execute(self, prompt: str) -> WorkerExecutionResult:
        runtime = self.runtime
        run_id = str(uuid.uuid4())
        return execute_prepared_worker(
            prompt=prompt,
            run_id=run_id,
            executable=runtime.executable,
            config_overrides=self.config_overrides,
            environment=self.environment_for_run(run_id),
            project_root=runtime.project_root,
            process_runner=runtime.process_runner,
            logger=runtime.logger,
            timeout=runtime.timeout,
        )


@dataclass(frozen=True)
class PreparedWorkerTask:
    prompt: PreparedWorkerPrompt
    runtime: WorkerTaskRuntime
    prompt_template: WorkerPromptTemplate = field(repr=False)

    def execute(self, invocation: TaskInvocation) -> WorkerExecutionResult:
        return self.runtime.execute(
            self.prompt_template.render(invocation, self.prompt)
        )


@dataclass
class PreparedWorkers(Mapping[int, PreparedWorkerTask]):
    tasks: dict[int, PreparedWorkerTask]
    _resources: ExitStack = field(repr=False)

    def __getitem__(self, task_number: int) -> PreparedWorkerTask:
        return self.tasks[task_number]

    def __iter__(self) -> Iterator[int]:
        return iter(self.tasks)

    def __len__(self) -> int:
        return len(self.tasks)

    def close(self) -> None:
        self._resources.close()


def prepare_worker_tasks(
    tasks: Sequence[Task],
    *,
    common_runtime: WorkerRuntime,
    prompt_template: WorkerPromptTemplate,
) -> PreparedWorkers:
    resources = ExitStack()

    root = common_runtime.project_root
    try:
        backend_verifier = resources.enter_context(
            BackendVerifier(root)
        )
        frontend_verifier = resources.enter_context(
            FrontendVerifier(root)
        )
        tasks_by_number = {
            task.number: PreparedWorkerTask(
                prompt=prompt_template.prepare_task(task),
                runtime=common_runtime.bind_task(
                    task.number,
                    task.allowed_paths,
                    task.read_only_paths,
                    build_task_verifier_environment(
                        task,
                        backend_verifier=backend_verifier,
                        frontend_verifier=frontend_verifier,
                    ),
                ),
                prompt_template=prompt_template,
            )
            for task in tasks
        }
    except Exception:
        resources.close()
        raise

    return PreparedWorkers(tasks_by_number, resources)


# 프로젝트 전체 공통 실행 환경 준비
def prepare_common_worker_runtime(
    project_root: Path = PROJECT_ROOT,
    *,
    base_environment: dict[str, str] | None = None,
    timeout: int = DEFAULT_TIMEOUT_SECONDS,
    process_runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    executable: str | None = None,
) -> WorkerRuntime:
    root = project_root.resolve()
    environment = prepare_common_worker_environment(
        base_environment=base_environment,
        project_root=root,
        executable=executable,
    )
    return WorkerRuntime(
        project_root=root,
        executable=environment.executable,
        base_environment=environment.process_environment,
        config_template=load_worker_config_template(),
        toolchain_readable_paths=environment.toolchain_readable_paths,
        timeout=timeout,
        process_runner=process_runner,
        logger=logger,
    )
