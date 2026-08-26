from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(HARNESS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(HARNESS_SCRIPTS))

from harness_runner import cli
from harness_runner.models import ExecutionReport, TaskResult
from worker_runner.invocation import parse_invocation


class HarnessWithoutBrowserAutomationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(dir="/tmp")
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_worker_prompt_omits_cypress_automation_guidance(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation("""
        {"common_prompt":"common", "additional_request":"", "task":{"number":1,
        "title":"frontend", "allowed_paths":["frontend"], "forbidden_paths":[],
        "task_prompt":"work", "verification_items":["unit"]}}
        """)

        self.assertNotIn("run-browser" + "-verifier.py", prompt)
        self.assertNotIn("Cypress 브라우저 검증", prompt)
        self.assertNotIn("npm run test:e2e", prompt)

    def test_harness_does_not_create_or_forward_browser_connection(self) -> None:
        backend = mock.MagicMock()
        backend.__enter__.return_value.environment_for_task.return_value = {"BACKEND": "backend"}
        frontend = mock.MagicMock()
        frontend.__enter__.return_value.environment = {"FRONTEND": "frontend"}
        plan_path = self.root / "docs/plans/active/test.md"
        destination = self.root / "docs/plans/complete/test.md"
        invocation = mock.Mock()
        invocation.task.allowed_paths = ("frontend/src",)
        invocation.task.forbidden_paths = ()

        def execute(_tasks, _request, *, call_worker):
            call_worker(invocation)
            return ExecutionReport((TaskResult(1, "lifecycle", "succeeded"),))

        with (
            mock.patch.object(cli, "parse_invocation", return_value=mock.Mock()),
            mock.patch.object(cli, "repository_root", return_value=self.root),
            mock.patch.object(cli, "load_active_plan", return_value=(plan_path, mock.Mock())),
            mock.patch.object(cli, "BackendVerifier", return_value=backend),
            mock.patch.object(cli, "FrontendVerifier", return_value=frontend),
            mock.patch.object(cli, "execute_workers", side_effect=execute),
            mock.patch.object(cli, "invoke_task") as invoke_task,
            mock.patch.object(cli, "publish_report", return_value=mock.Mock(page_url="https://notion.example/report")),
            mock.patch.object(cli, "complete_plan", return_value=destination),
            mock.patch("builtins.print"),
        ):
            self.assertEqual(cli.main(["$harness-exec test"]), 0)

        invoke_task.assert_called_once_with(
            invocation,
            environment_overrides={"BACKEND": "backend", "FRONTEND": "frontend"},
        )
        self.assertFalse(hasattr(cli, "Browser" + "Verifier"))


if __name__ == "__main__":
    unittest.main()
