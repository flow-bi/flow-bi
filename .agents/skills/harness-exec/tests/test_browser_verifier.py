from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from worker_runner.browser_verifier import (
    BrowserVerifier,
    BrowserVerifierClientError,
    request_cypress_verification,
)
from worker_runner.invocation import parse_invocation

HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(HARNESS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(HARNESS_SCRIPTS))

from harness_runner import cli, worker_gateway
from harness_runner.models import ExecutionReport, Task, TaskInvocation, TaskResult


class BrowserVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "frontend").mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_authenticated_request_runs_fixed_frontend_cypress_command(self) -> None:
        runner = mock.Mock(
            return_value=subprocess.CompletedProcess(
                ["npm", "run", "test:e2e"],
                0,
                stdout="all specs passed",
            )
        )

        with BrowserVerifier(
            self.root,
            runner=runner,
            npm_executable="npm",
        ) as verifier:
            result = request_cypress_verification(verifier.environment)

        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.output, "all specs passed")
        self.assertEqual(
            runner.call_args.args[0],
            ["npm", "run", "test:e2e"],
        )
        self.assertEqual(
            runner.call_args.kwargs["cwd"],
            (self.root / "frontend").resolve(),
        )

    def test_rejects_missing_or_wrong_token_without_running_command(self) -> None:
        runner = mock.Mock()

        with BrowserVerifier(
            self.root,
            runner=runner,
            npm_executable="npm",
        ) as verifier:
            invalid_environment = dict(verifier.environment)
            invalid_environment["FLOW_BI_BROWSER_VERIFIER_TOKEN"] = "wrong"
            with self.assertRaisesRegex(
                BrowserVerifierClientError,
                "401",
            ):
                request_cypress_verification(invalid_environment)

        runner.assert_not_called()

    def test_serializes_concurrent_cypress_requests(self) -> None:
        active = 0
        maximum_active = 0
        state_lock = threading.Lock()

        def slow_runner(*_args, **_kwargs):
            nonlocal active, maximum_active
            with state_lock:
                active += 1
                maximum_active = max(maximum_active, active)
            time.sleep(0.05)
            with state_lock:
                active -= 1
            return subprocess.CompletedProcess(
                ["npm", "run", "test:e2e"],
                0,
                stdout="ok",
            )

        with BrowserVerifier(
            self.root,
            runner=slow_runner,
            npm_executable="npm",
        ) as verifier:
            with ThreadPoolExecutor(max_workers=2) as executor:
                results = tuple(
                    executor.map(
                        lambda _index: request_cypress_verification(
                            verifier.environment
                        ),
                        range(2),
                    )
                )

        self.assertEqual([result.returncode for result in results], [0, 0])
        self.assertEqual(maximum_active, 1)

    def test_worker_can_retry_after_a_failed_cypress_result(self) -> None:
        runner = mock.Mock(
            side_effect=(
                subprocess.CompletedProcess(
                    ["npm", "run", "test:e2e"],
                    1,
                    stdout="1 failing",
                ),
                subprocess.CompletedProcess(
                    ["npm", "run", "test:e2e"],
                    0,
                    stdout="1 passing",
                ),
            )
        )

        with BrowserVerifier(
            self.root,
            runner=runner,
            npm_executable="npm",
        ) as verifier:
            failed = request_cypress_verification(verifier.environment)
            succeeded = request_cypress_verification(verifier.environment)

        self.assertEqual(failed.returncode, 1)
        self.assertIn("failing", failed.output)
        self.assertEqual(succeeded.returncode, 0)
        self.assertIn("passing", succeeded.output)
        self.assertEqual(runner.call_count, 2)

    def test_failed_cypress_screenshots_are_isolated_and_cleaned(self) -> None:
        captured_screenshots_path: Path | None = None

        def failing_runner(*_args, **kwargs):
            nonlocal captured_screenshots_path
            captured_screenshots_path = Path(
                kwargs["env"]["CYPRESS_screenshotsFolder"]
            )
            captured_screenshots_path.mkdir(parents=True)
            (captured_screenshots_path / "failed.png").write_bytes(b"screenshot")
            return subprocess.CompletedProcess(
                ["npm", "run", "test:e2e"],
                1,
                stdout="1 failing",
            )

        with BrowserVerifier(
            self.root,
            runner=failing_runner,
            npm_executable="npm",
        ) as verifier:
            result = request_cypress_verification(verifier.environment)

        self.assertEqual(result.returncode, 1)
        self.assertIsNotNone(captured_screenshots_path)
        assert captured_screenshots_path is not None
        self.assertFalse(captured_screenshots_path.exists())
        self.assertFalse((self.root / "frontend" / "cypress" / "screenshots").exists())

    def test_worker_prompt_explains_host_verification_and_retry_command(self) -> None:
        payload = """
        {
          "common_prompt": "common",
          "additional_request": "",
          "task": {
            "number": 1,
            "title": "frontend",
            "allowed_paths": ["frontend"],
            "forbidden_paths": ["backend"],
            "task_prompt": "work",
            "verification_items": ["Cypress"]
          }
        }
        """

        prompt, _allowed, _forbidden = parse_invocation(payload)

        self.assertIn("run-browser-verifier.py cypress", prompt)
        self.assertIn("FLOW_BI_PYTHON_EXECUTABLE", prompt)
        self.assertIn("이미 Harness Task Worker", prompt)
        self.assertIn("harness-exec", prompt)
        self.assertIn("재호출하지", prompt)
        self.assertIn("실패", prompt)
        self.assertIn("재실행", prompt)
        self.assertIn("backend_verifier.py", prompt)
        self.assertIn("`gradlew`를 직접 실행하지", prompt)

    def test_gateway_merges_verifier_connection_into_worker_environment(self) -> None:
        invocation = TaskInvocation(
            common_prompt="common",
            additional_request="",
            task=Task(
                number=7,
                title="gateway",
                prerequisite_numbers=(),
                allowed_paths=("frontend",),
                forbidden_paths=("backend",),
                task_prompt="work",
            ),
        )
        with (
            mock.patch.object(
                worker_gateway,
                "repository_root",
                return_value=self.root,
            ),
            mock.patch.object(
                worker_gateway,
                "asdict",
                return_value={"task": "payload"},
            ),
            mock.patch.object(
                worker_gateway,
                "parse_invocation",
                return_value=("prompt", ("frontend",), ("backend",)),
            ),
            mock.patch.object(
                worker_gateway,
                "execute_worker",
                return_value=object(),
            ) as execute_worker,
        ):
            worker_gateway.invoke_task(
                invocation,
                environment_overrides={
                    "FLOW_BI_BROWSER_VERIFIER_URL": "http://127.0.0.1:1234",
                    "FLOW_BI_BROWSER_VERIFIER_TOKEN": "token",
                },
            )

        base_environment = execute_worker.call_args.kwargs["base_environment"]
        self.assertEqual(
            base_environment["FLOW_BI_BROWSER_VERIFIER_URL"],
            "http://127.0.0.1:1234",
        )
        self.assertEqual(
            base_environment["FLOW_BI_BROWSER_VERIFIER_TOKEN"],
            "token",
        )
        self.assertIn("PATH", base_environment)
        self.assertEqual(execute_worker.call_args.kwargs["task_number"], 7)

    def test_harness_lifecycle_passes_both_verifier_environments_to_worker(self) -> None:
        browser_environment = {
            "FLOW_BI_BROWSER_VERIFIER_URL": "http://127.0.0.1:4321",
            "FLOW_BI_BROWSER_VERIFIER_TOKEN": "token",
        }
        backend_environment = {
            "FLOW_BI_BACKEND_VERIFIER_URL": "http://127.0.0.1:9876/verify/gradle",
            "FLOW_BI_BACKEND_VERIFIER_TOKEN": "backend-token",
        }
        browser_verifier = mock.MagicMock()
        browser_verifier.__enter__.return_value.environment = browser_environment
        backend_verifier = mock.MagicMock()
        backend_verifier.__enter__.return_value.environment = backend_environment
        backend_verifier.__enter__.return_value.environment_for_task.return_value = backend_environment
        plan_path = self.root / "docs" / "plans" / "active" / "test-01.md"
        destination = self.root / "docs" / "plans" / "complete" / "test-01.md"
        invocation = mock.Mock()

        def run_worker(_tasks, _request, *, call_worker):
            call_worker(invocation)
            return ExecutionReport((TaskResult(1, "lifecycle", "succeeded"),))

        with (
            mock.patch.object(cli, "parse_invocation", return_value=mock.Mock()),
            mock.patch.object(cli, "repository_root", return_value=self.root),
            mock.patch.object(
                cli,
                "load_active_plan",
                return_value=(plan_path, mock.Mock()),
            ),
            mock.patch.object(
                cli,
                "BrowserVerifier",
                return_value=browser_verifier,
            ),
            mock.patch.object(
                cli,
                "BackendVerifier",
                return_value=backend_verifier,
            ),
            mock.patch.object(
                cli,
                "execute_workers",
                side_effect=run_worker,
            ),
            mock.patch.object(cli, "invoke_task") as invoke_task,
            mock.patch.object(
                cli,
                "publish_report",
                return_value=mock.Mock(page_url="https://notion.example/report"),
            ),
            mock.patch.object(
                cli,
                "complete_plan",
                return_value=destination,
            ),
            mock.patch("builtins.print"),
        ):
            exit_code = cli.main(["$harness-exec test-01"])

        self.assertEqual(exit_code, 0)
        invoke_task.assert_called_once_with(
            invocation,
            environment_overrides={**browser_environment, **backend_environment},
        )
        backend_verifier.__enter__.return_value.environment_for_task.assert_called_once_with(
            invocation.task.allowed_paths,
            invocation.task.forbidden_paths,
        )
        browser_verifier.__exit__.assert_called_once()
        backend_verifier.__exit__.assert_called_once()


if __name__ == "__main__":
    unittest.main()
