from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest


WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))


class WorkerPromptTests(unittest.TestCase):
    def test_load_rejects_missing_required_section(self) -> None:
        from worker_runner.prompt import load_prompt_sections

        with tempfile.TemporaryDirectory() as temporary:
            prompt_file = Path(temporary) / "worker-prompt.md"
            prompt_file.write_text("## discovery-guidance\ntext\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing required prompt section"):
                load_prompt_sections(prompt_file)

    def test_load_rejects_duplicate_section(self) -> None:
        from worker_runner.prompt import load_prompt_sections

        with tempfile.TemporaryDirectory() as temporary:
            prompt_file = Path(temporary) / "worker-prompt.md"
            prompt_file.write_text(
                "## discovery-guidance\none\n## discovery-guidance\ntwo\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "duplicate prompt section: discovery-guidance"):
                load_prompt_sections(prompt_file)

    def test_builder_keeps_section_order_and_result_contract(self) -> None:
        from worker_runner.prompt import build_worker_prompt, load_prompt_sections

        sections = load_prompt_sections()
        prompt = build_worker_prompt(
            sections=sections,
            common_prompt="common guidance",
            additional_request="",
            title="Task title",
            task_prompt="Implement the task.",
            number=1,
            verification_items=("unit test",),
            execution_context={
                "plan_id": "harness-03",
                "fingerprint": "fingerprint",
                "mode": "new_or_changed",
                "prior_tdd_evidence": None,
                "prior_evidence_id": None,
            },
            decision_correction=None,
        )

        names = (
            "discovery-guidance",
            "context-efficiency-guidance",
            "task-worker-guidance",
            "backend-verification-guidance",
            "backend-formatting-guidance",
            "frontend-verification-guidance",
            "execution-context",
            "execution-new-or-changed",
        )
        positions = [prompt.index(sections[name]) for name in names]
        self.assertEqual(positions, sorted(positions))
        self.assertIn('"task_id": "Task 1"', prompt)
        self.assertIn('"item": "unit test"', prompt)


if __name__ == "__main__":
    unittest.main()
