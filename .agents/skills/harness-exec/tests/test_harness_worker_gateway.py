from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.models import Task, TaskExecutionContext, TaskInvocation
from harness_runner.preparation.gateway import WorkerGateway
from harness_runner.preparation.prompt import WorkerPromptTemplate


class HarnessWorkerGatewayTests(unittest.TestCase):
    def test_prepares_task_once_and_passes_final_prompt_to_task_runtime(self) -> None:
        task = Task(1, "Task", (), ("backend",), ("docs",), "Implement", (), ("unit",), 90)
        first = TaskInvocation("common", "", task, TaskExecutionContext("harness-04", "fingerprint", "new_or_changed"))
        corrected = TaskInvocation("common", "", task, first.execution_context, {"prior_decision": "PASS_WITH_FOLLOW_UP", "objective_evidence": {"scope": "PASS"}})
        prompts: list[str] = []

        class TaskRuntime:
            def execute(self, prompt: str) -> str:
                prompts.append(prompt)
                return "result"

        class Runtime:
            binds = 0
            def bind_task(self, *args: object) -> TaskRuntime:
                self.binds += 1
                return TaskRuntime()

        runtime = Runtime()
        template = WorkerPromptTemplate.load()
        gateway = WorkerGateway(Path.cwd(), runtime, template)  # type: ignore[arg-type]
        self.assertEqual(gateway.invoke_task(first, environment_overrides={"VERIFY": "one"}), "result")
        self.assertEqual(gateway.invoke_task(corrected), "result")
        self.assertEqual(runtime.binds, 1)
        self.assertEqual(len(prompts), 2)
        self.assertIn("PASS_WITH_FOLLOW_UP", prompts[1])
        self.assertNotIn("{\"task\"", prompts[0])

    def test_template_is_loaded_once_and_task_inputs_are_reused_for_correction(self) -> None:
        import harness_runner.preparation.prompt as prompt_module

        first = TaskInvocation("common", "", Task(1, "One", (), ("backend",), (), "Implement", (), ("unit",), 90), TaskExecutionContext("harness-04", "one", "new_or_changed"))
        second = TaskInvocation("common", "", Task(2, "Two", (), ("frontend",), (), "Implement", (), ("unit",), 90), TaskExecutionContext("harness-04", "two", "new_or_changed"))

        class TaskRuntime:
            def execute(self, prompt: str) -> str:
                return prompt

        class Runtime:
            def bind_task(self, *args: object) -> TaskRuntime:
                return TaskRuntime()

        with mock.patch.object(prompt_module, "_load_sections", wraps=prompt_module._load_sections) as load_sections:
            template = WorkerPromptTemplate.load()
        gateway = WorkerGateway(Path.cwd(), Runtime(), template)  # type: ignore[arg-type]
        gateway.invoke_task(first)
        gateway.invoke_task(second)
        gateway.invoke_task(TaskInvocation("common", "", first.task, first.execution_context, {"prior_decision": "PASS_WITH_FOLLOW_UP", "objective_evidence": {"scope": "PASS"}}))
        self.assertEqual(load_sections.call_count, 2)
        self.assertEqual(len(gateway._contexts), 2)


if __name__ == "__main__":
    unittest.main()
