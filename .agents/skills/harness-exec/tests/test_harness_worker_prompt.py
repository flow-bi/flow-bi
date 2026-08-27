from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.models import Task, TaskExecutionContext, TaskInvocation
from harness_runner.worker_prompt import WorkerPromptTemplate


def make_invocation(paths: tuple[str, ...] = ("backend",), mode: str = "new_or_changed") -> TaskInvocation:
    task = Task(1, "Task title", (), paths, (), "Implement it.", (), ("unit test",), 90)
    return TaskInvocation("common", "", task, TaskExecutionContext("harness-04", "fingerprint", mode))


class HarnessWorkerPromptTests(unittest.TestCase):
    def test_load_rejects_missing_and_duplicate_sections(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "prompt.md"
            path.write_text("## discovery-guidance\ntext\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing required prompt section"):
                WorkerPromptTemplate.load(path)
            path.write_text("## discovery-guidance\none\n## discovery-guidance\ntwo\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate prompt section"):
                WorkerPromptTemplate.load(path)

    def test_selects_only_task_guidance_and_keeps_contract(self) -> None:
        template = WorkerPromptTemplate.load()
        backend = make_invocation(("backend/src",))
        frontend = make_invocation(("frontend/src",))
        backend_prompt = template.render(backend, template.prepare_task(backend))
        frontend_prompt = template.render(frontend, template.prepare_task(frontend))
        self.assertIn("backend_verifier.py", backend_prompt)
        self.assertNotIn("frontend_verifier.py", backend_prompt)
        self.assertIn("frontend_verifier.py", frontend_prompt)
        self.assertNotIn("backend_verifier.py", frontend_prompt)
        self.assertLess(backend_prompt.index("common"), backend_prompt.index("Task title"))
        self.assertIn('"task_id":"Task 1"', backend_prompt)

    def test_rerun_context_and_correction_are_rendered_by_harness(self) -> None:
        template = WorkerPromptTemplate.load()
        task = make_invocation().task
        invocation = TaskInvocation("common", "", task, TaskExecutionContext("harness-04", "fingerprint", "rerun", {"result": "PASS", "evidence": "red then green"}), {"prior_decision": "PASS_WITH_FOLLOW_UP", "objective_evidence": {"scope": "PASS"}})
        prompt = template.render(invocation, template.prepare_task(invocation))
        self.assertIn("plan:harness-04:task:1:fingerprint:fingerprint", prompt)
        self.assertIn("PASS_WITH_FOLLOW_UP", prompt)


if __name__ == "__main__":
    unittest.main()
