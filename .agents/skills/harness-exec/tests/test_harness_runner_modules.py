from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.models import PlanValidationError, Task
from harness_runner.orchestrator import execute_grouped
from harness_runner.plan_parser import parse_plan_structure
from harness_runner.plan_validator import validate_tasks
from harness_runner.worker_gateway import invoke_worker


def plan_text(*, worker: str = "be-worker", design_docs: str = "없음") -> str:
    return (
        "## Task: module-one\n"
        f"- worker: {worker}\n"
        "- 작업 유형: API\n"
        f"- 관련 설계 문서: {design_docs}\n\n"
        "작업 내용\n"
    )


class ParserModuleTests(unittest.TestCase):
    def test_parses_structure_without_filesystem_access(self) -> None:
        with mock.patch.object(Path, "resolve", side_effect=AssertionError("filesystem access")):
            parsed = parse_plan_structure(plan_text(design_docs="docs/not-created.md"))

        self.assertEqual(parsed[0].task_id, "module-one")
        self.assertEqual(parsed[0].attributes["design_docs"], ("docs/not-created.md",))


class ValidatorModuleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def validate(self, text: str) -> list[Task]:
        return validate_tasks(parse_plan_structure(text), self.root)

    def test_rejects_duplicate_id(self) -> None:
        duplicated = plan_text() + plan_text().replace("API", "UI")
        with self.assertRaisesRegex(PlanValidationError, "중복"):
            self.validate(duplicated)

    def test_rejects_invalid_worker(self) -> None:
        with self.assertRaisesRegex(PlanValidationError, "be-worker"):
            self.validate(plan_text(worker="qa-worker"))

    def test_rejects_absolute_escaped_and_missing_design_docs(self) -> None:
        cases = (
            (str((self.root / "absolute.md").resolve()), "상대 경로"),
            ("../escaped.md", "저장소 밖"),
            ("docs/missing.md", "파일이 없"),
        )
        for value, message in cases:
            with self.subTest(value=value), self.assertRaisesRegex(PlanValidationError, message):
                self.validate(plan_text(design_docs=value))


class OrchestratorModuleTests(unittest.TestCase):
    def test_backend_runs_first_and_failure_stops_frontend(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            plan = root / "docs" / "plan" / "active" / "feature-01.md"
            tasks = [
                Task("front", "fe-worker", "UI", (), "front body"),
                Task("back", "be-worker", "API", (), "back body"),
            ]
            calls: list[str] = []

            def fail(worker: str, _prompt: str) -> None:
                calls.append(worker)
                raise RuntimeError("stop")

            with self.assertRaisesRegex(RuntimeError, "stop"):
                execute_grouped(tasks, plan, root, invoker=fail)

        self.assertEqual(calls, ["be-worker"])


class GatewayModuleTests(unittest.TestCase):
    def test_builds_worker_subprocess_command_without_executing_codex(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            with mock.patch.object(subprocess, "run") as run:
                invoke_worker("fe-worker", "$fe-worker build UI", root)

        command = run.call_args.args[0]
        self.assertEqual(command[0], sys.executable)
        self.assertEqual(Path(command[1]), root / ".agents" / "scripts" / "run-worker.py")
        self.assertEqual(command[2], "$fe-worker build UI")
        self.assertEqual(run.call_args.kwargs, {"cwd": root, "check": True})


if __name__ == "__main__":
    unittest.main()
