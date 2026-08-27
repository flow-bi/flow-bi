from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import os
import sys

from .models import TaskInvocation
from .worker_prompt import PreparedWorkerPrompt, WorkerPromptTemplate


WORKER_SCRIPTS = Path(__file__).resolve().parents[4] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner import WorkerRuntime, WorkerTaskRuntime, prepare_worker_runtime


@dataclass(frozen=True)
class TaskWorkerContext:
    prompt: PreparedWorkerPrompt
    runtime: WorkerTaskRuntime


@dataclass
class WorkerGateway:
    project_root: Path
    runtime: WorkerRuntime
    prompt_template: WorkerPromptTemplate
    _contexts: dict[int, TaskWorkerContext] = field(default_factory=dict)

    def prepare_task(self, invocation: TaskInvocation, environment_overrides: dict[str, str] | None = None) -> TaskWorkerContext:
        context = self._contexts.get(invocation.task.number)
        if context is None:
            task = invocation.task
            context = TaskWorkerContext(self.prompt_template.prepare_task(invocation), self.runtime.bind_task(task.number, task.allowed_paths, task.read_only_paths, environment_overrides))
            self._contexts[task.number] = context
        return context

    def invoke_task(self, invocation: TaskInvocation, *, environment_overrides: dict[str, str] | None = None) -> object:
        context = self.prepare_task(invocation, environment_overrides)
        return context.runtime.execute(self.prompt_template.render(invocation, context.prompt))


def create_worker_gateway(project_root: Path, *, runtime: WorkerRuntime | None = None, prompt_template: WorkerPromptTemplate | None = None, base_environment: dict[str, str] | None = None) -> WorkerGateway:
    root = project_root.resolve()
    return WorkerGateway(root, runtime or prepare_worker_runtime(root, base_environment=base_environment or os.environ.copy()), prompt_template or WorkerPromptTemplate.load())


def invoke_task(invocation: TaskInvocation, *, environment_overrides: dict[str, str] | None = None) -> object:
    return create_worker_gateway(Path.cwd()).invoke_task(invocation, environment_overrides=environment_overrides)
