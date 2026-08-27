from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from io import StringIO
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


from worker_runner.frontend_verifier import (
    FRONTEND_VERIFIER_TOKEN,
    FRONTEND_VERIFIER_URL,
    FrontendVerificationResult,
    FrontendVerifier,
    FrontendVerifierClientError,
    main,
    request_frontend_verification,
)

HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(HARNESS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(HARNESS_SCRIPTS))

from harness_runner import cli
from harness_runner.models import ExecutionReport, Task, TaskExecutionContext, TaskInvocation, TaskResult
from harness_runner.preparation.prompt import WorkerPromptTemplate


class FrontendVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "frontend").mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_authenticated_requests_use_only_fixed_npm_commands_and_frontend_cwd(self) -> None:
        runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["npm", "run", "check"], 7, stdout="failed")
        )
        with FrontendVerifier(self.root, runner=runner, npm_executable="npm") as verifier:
            result = request_frontend_verification(["run", "check"], verifier.environment)

        self.assertEqual((result.returncode, result.output, result.timed_out), (7, "failed", False))
        self.assertEqual(runner.call_args.args[0], ["npm", "run", "check"])
        self.assertEqual(runner.call_args.kwargs["cwd"], (self.root / "frontend").resolve())
        self.assertFalse(runner.call_args.kwargs.get("shell", False))
        self.assertEqual(runner.call_args.kwargs["stderr"], subprocess.STDOUT)
        self.assertNotIn(FRONTEND_VERIFIER_URL, runner.call_args.kwargs["env"])
        self.assertNotIn(FRONTEND_VERIFIER_TOKEN, runner.call_args.kwargs["env"])

    def test_prepares_npm_and_sanitized_base_environment_once_then_copies_per_request(self) -> None:
        runner = mock.Mock(return_value=subprocess.CompletedProcess(["npm", "run", "check"], 0, stdout="ok"))
        with (
            mock.patch(
                "worker_runner.verifiers.frontend_service.os.environ.copy",
                wraps=__import__("os").environ.copy,
            ) as environment_copy,
            mock.patch(
                "worker_runner.verifiers.frontend_service._resolve_npm_executable",
                return_value="npm",
            ) as resolve_npm,
        ):
            with FrontendVerifier(self.root, runner=runner) as verifier:
                request_frontend_verification(["run", "check"], verifier.environment)
                first_environment = runner.call_args.kwargs["env"]
                first_environment["REQUEST_ONLY"] = "first"
                request_frontend_verification(["run", "typecheck"], verifier.environment)
                second_environment = runner.call_args.kwargs["env"]

        self.assertEqual(environment_copy.call_count, 1)
        resolve_npm.assert_called_once_with()
        self.assertNotIn("REQUEST_ONLY", second_environment)

    def test_rejects_auth_command_flags_and_unsafe_package_names_without_running_npm(self) -> None:
        runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["npm", "ls"], 0, stdout="listed")
        )
        with FrontendVerifier(self.root, runner=runner, npm_executable="npm") as verifier:
            invalid_environment = {**verifier.environment, FRONTEND_VERIFIER_TOKEN: "wrong"}
            with self.assertRaisesRegex(FrontendVerifierClientError, "401"):
                request_frontend_verification(["run", "check"], invalid_environment)
            for arguments in (
                ["install"], ["exec", "echo"], ["run", "test:e2e"], ["run", "check", "--flag"],
                ["ls", "../outside"], ["ls", "package@1.0.0"], ["ls", "--all"], ["ls", "@scope/package"],
            ):
                if arguments == ["ls", "@scope/package"]:
                    continue
                with self.assertRaisesRegex(FrontendVerifierClientError, "400"):
                    request_frontend_verification(arguments, verifier.environment)
            request_frontend_verification(["ls", "package-name", "@scope/package"], verifier.environment)
        runner.assert_called_once()
        self.assertEqual(runner.call_args.args[0], ["npm", "ls", "package-name", "@scope/package"])

    def test_timeout_busy_and_cli_preserve_parent_result(self) -> None:
        timeout = subprocess.TimeoutExpired(["npm", "run", "check"], 1, output="timed out")
        runner = mock.Mock(side_effect=timeout)
        with FrontendVerifier(self.root, runner=runner, npm_executable="npm") as verifier:
            result = request_frontend_verification(["run", "check"], verifier.environment)
        self.assertEqual((result.returncode, result.output, result.timed_out), (124, "timed out", True))

        output = StringIO()
        errors = StringIO()
        with (
            mock.patch(
                "worker_runner.frontend_verifier.request_frontend_verification",
                return_value=FrontendVerificationResult(9, "parent output"),
            ),
            mock.patch("sys.stdout", output),
            mock.patch("sys.stderr", errors),
        ):
            self.assertEqual(main(["run", "typecheck"]), 9)
        self.assertEqual(output.getvalue(), "parent output")
        self.assertEqual(errors.getvalue(), "")

    def test_cli_preserves_timeout_output_without_extra_messages(self) -> None:
        output = StringIO()
        errors = StringIO()
        with (
            mock.patch(
                "worker_runner.frontend_verifier.request_frontend_verification",
                return_value=FrontendVerificationResult(124, "timed out", timed_out=True),
            ),
            mock.patch("sys.stdout", output),
            mock.patch("sys.stderr", errors),
        ):
            self.assertEqual(main(["run", "check"]), 124)
        self.assertEqual(output.getvalue(), "timed out")
        self.assertEqual(errors.getvalue(), "")

    def test_rejects_concurrent_request(self) -> None:
        started = threading.Event()
        release = threading.Event()

        def slow_runner(*_args, **_kwargs):
            started.set()
            release.wait(timeout=2)
            return subprocess.CompletedProcess(["npm", "run", "check"], 0, stdout="ok")

        with FrontendVerifier(self.root, runner=slow_runner, npm_executable="npm") as verifier:
            with ThreadPoolExecutor(max_workers=2) as executor:
                first = executor.submit(request_frontend_verification, ["run", "check"], verifier.environment)
                self.assertTrue(started.wait(timeout=1))
                with self.assertRaisesRegex(FrontendVerifierClientError, "429"):
                    request_frontend_verification(["run", "check"], verifier.environment)
                release.set()
                self.assertEqual(first.result(timeout=2).returncode, 0)

    def test_client_rejects_tampered_url_and_bad_response(self) -> None:
        with self.assertRaisesRegex(FrontendVerifierClientError, "localhost"):
            request_frontend_verification(["run", "check"], {
                FRONTEND_VERIFIER_URL: "https://example.com/verify/npm",
                FRONTEND_VERIFIER_TOKEN: "token",
            })
        with mock.patch("urllib.request.urlopen") as urlopen:
            response = mock.MagicMock()
            response.read.return_value = b'{"returncode": "zero"}'
            urlopen.return_value.__enter__.return_value = response
            with self.assertRaisesRegex(FrontendVerifierClientError, "응답 계약"):
                request_frontend_verification(["run", "check"], {
                    FRONTEND_VERIFIER_URL: "http://127.0.0.1:1234/verify/npm",
                    FRONTEND_VERIFIER_TOKEN: "token",
                })

    def _legacy_worker_prompt_forbids_direct_npm(self) -> None:
        prompt, _allowed, _read_only = parse_invocation("""
        {"common_prompt":"common", "additional_request":"", "task":{"number":1,
        "title":"frontend", "allowed_paths":["frontend"], "read_only_paths":[],
        "task_prompt":"work", "verification_items":["unit"]}}
        """)
        self.assertIn("frontend_verifier.py", prompt)
        self.assertIn("Frontend npm 검증은 Worker에서 직접 `npm`으로 실행하지 말고", prompt)
        self.assertIn("FLOW_BI_PYTHON_EXECUTABLE", prompt)
        self.assertIn("Cypress E2E 테스트를 작성하거나 실행하지 마십시오", prompt)
        self.assertNotIn("npm run test:e2e", prompt)

    def test_lifecycle_exposes_frontend_environment_only_to_frontend_tasks(self) -> None:
        backend = mock.MagicMock()
        backend.__enter__.return_value.environment_for_task.return_value = {"BACKEND": "backend"}
        frontend = mock.MagicMock()
        frontend.__enter__.return_value.environment = {"FRONTEND": "frontend"}
        plan_path = self.root / "docs/plans/active/test.md"
        destination = self.root / "docs/plans/complete/test.md"
        frontend_task = mock.Mock(allowed_paths=("frontend/src",), read_only_paths=())
        other_task = mock.Mock(allowed_paths=("backend/src",), read_only_paths=())
        invocations = (mock.Mock(task=frontend_task), mock.Mock(task=other_task))

        def execute(_tasks, _request, *, call_worker):
            for invocation in invocations:
                call_worker(invocation)
            return ExecutionReport((TaskResult(1, "lifecycle", "succeeded"),))

        with (
            mock.patch.object(cli, "parse_cli_invocation", return_value=mock.Mock()),
            mock.patch.object(cli, "PROJECT_ROOT", self.root),
            mock.patch.object(
                cli,
                "load_active_plan",
                return_value=(
                    plan_path,
                    mock.Mock(tasks=(frontend_task, other_task)),
                ),
            ),
            mock.patch.object(cli, "BackendVerifier", return_value=backend),
            mock.patch.object(cli, "FrontendVerifier", return_value=frontend),
            mock.patch.object(cli, "execute_workers", side_effect=execute),
            mock.patch.object(cli, "prepare_worker_runtime", return_value=mock.Mock()),
            mock.patch.object(cli, "WorkerPromptTemplate") as prompt_template,
            mock.patch.object(cli, "create_worker_gateway", return_value=mock.Mock()) as create_gateway,
            mock.patch.object(
                cli,
                "publish_report",
                return_value=mock.Mock(page_url="https://notion.example/report"),
            ),
            mock.patch.object(cli, "complete_plan", return_value=destination),
            mock.patch("builtins.print"),
        ):
            self.assertEqual(cli.main(["$harness-exec test"]), 0)
        invoke_task = create_gateway.return_value.invoke_task
        self.assertEqual(invoke_task.call_args_list[0].kwargs["environment_overrides"], {
            "BACKEND": "backend", "FRONTEND": "frontend",
        })
        self.assertEqual(invoke_task.call_args_list[1].kwargs["environment_overrides"], {
            "BACKEND": "backend",
        })
        frontend.__exit__.assert_called_once()


if __name__ == "__main__":
    unittest.main()
