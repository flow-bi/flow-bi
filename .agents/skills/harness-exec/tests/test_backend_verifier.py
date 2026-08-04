from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock
from io import StringIO


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from worker_runner.backend_verifier import (
    BackendVerifier,
    BackendVerifierClientError,
    BackendVerificationResult,
    main,
    request_backend_formatting,
    request_backend_verification,
)


class BackendVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        backend = self.root / "backend"
        backend.mkdir()
        (backend / "gradlew").write_text("#!/bin/sh\n", encoding="utf-8")
        (backend / "gradlew.bat").write_text("@echo off\r\necho wrapper started\r\n", encoding="utf-8")
        (backend / "settings.gradle").write_text("rootProject.name = 'test'\n", encoding="utf-8")
        (backend / "build.gradle").write_text("plugins {}\n", encoding="utf-8")
        (backend / "gradle").mkdir()
        (backend / "config").mkdir()
        (backend / "config" / "eclipse-formatter.xml").write_text("<profiles/>\n", encoding="utf-8")

    def write_java(self, relative_path: str, contents: str = "class Test {}\n") -> Path:
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding="utf-8")
        return path

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_authenticated_request_uses_fixed_gradlew_and_backend_directory(self) -> None:
        runner = mock.Mock(
            return_value=subprocess.CompletedProcess(
                ["gradlew", "test"], 0, stdout="tests passed"
            )
        )

        with BackendVerifier(self.root, runner=runner, os_name="posix") as verifier:
            result = request_backend_verification(["test", "--tests", "com.flowbi.ApiTest"], verifier.environment)

        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.output, "tests passed")
        self.assertEqual(
            runner.call_args.args[0],
            [str((self.root / "backend" / "gradlew").resolve()), "test", "--tests", "com.flowbi.ApiTest"],
        )
        self.assertEqual(runner.call_args.kwargs["cwd"], (self.root / "backend").resolve())
        self.assertFalse(runner.call_args.kwargs.get("shell", False))

    def test_selects_platform_specific_gradle_wrapper(self) -> None:
        runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["gradlew", "compileJava"], 0, stdout="ok")
        )

        for os_name, wrapper_name in (("nt", "gradlew.bat"), ("posix", "gradlew")):
            with self.subTest(os_name=os_name):
                runner.reset_mock()
                with BackendVerifier(self.root, runner=runner, os_name=os_name) as verifier:
                    result = request_backend_verification(["compileJava"], verifier.environment)

                self.assertEqual(result.returncode, 0)
                self.assertEqual(Path(runner.call_args.args[0][0]).name, wrapper_name)
                self.assertFalse(runner.call_args.kwargs.get("shell", False))

    def test_windows_formatter_copies_and_runs_only_batch_wrapper(self) -> None:
        target = self.write_java("backend/src/main/java/allowed/Target.java")

        def formatting_runner(command, **_kwargs):
            workspace = Path(command[0]).parent
            self.assertEqual(Path(command[0]).name, "gradlew.bat")
            self.assertTrue((workspace / "gradlew.bat").is_file())
            self.assertFalse((workspace / "gradlew").exists())
            return subprocess.CompletedProcess(command, 0, stdout="formatted")

        with BackendVerifier(self.root, runner=formatting_runner, os_name="nt") as verifier:
            environment = verifier.environment_for_task(("backend/src/main/java/allowed",), ())
            result = request_backend_formatting(["backend/src/main/java/allowed/Target.java"], environment)

        self.assertEqual(result.returncode, 0)
        self.assertTrue(target.is_file())

    @unittest.skipUnless(os.name == "nt", "Windows batch wrapper integration test")
    def test_windows_batch_wrapper_starts_with_real_subprocess(self) -> None:
        with BackendVerifier(self.root, os_name="nt") as verifier:
            result = request_backend_verification(["compileJava"], verifier.environment)

        self.assertEqual(result.returncode, 0)
        self.assertIn("wrapper started", result.output)

    def test_process_start_failure_reports_wrapper_and_os_error_code(self) -> None:
        error = OSError(22, "not a valid application")
        error.winerror = 193
        runner = mock.Mock(side_effect=error)

        with BackendVerifier(self.root, runner=runner, os_name="nt") as verifier:
            result = request_backend_verification(["compileJava"], verifier.environment)

        self.assertEqual(result.returncode, 1)
        self.assertIn("gradlew.bat", result.output)
        self.assertIn("193", result.output)

    def test_rejects_missing_or_wrong_token_without_running_gradle(self) -> None:
        runner = mock.Mock()
        with BackendVerifier(self.root, runner=runner) as verifier:
            for environment in ({}, {**verifier.environment, "FLOW_BI_BACKEND_VERIFIER_TOKEN": "wrong"}):
                with self.assertRaises(BackendVerifierClientError):
                    request_backend_verification(["test"], environment)
        runner.assert_not_called()

    def test_rejects_disallowed_tasks_options_and_excessive_requests(self) -> None:
        runner = mock.Mock()
        with BackendVerifier(self.root, runner=runner) as verifier:
            for arguments in (
                ["clean"],
                ["test", "--init-script", "evil.gradle"],
                ["--tests", "com.flowbi.ApiTest"],
                ["test"] * 17,
            ):
                with self.assertRaisesRegex(BackendVerifierClientError, "거부"):
                    request_backend_verification(arguments, verifier.environment)
        runner.assert_not_called()

    def test_returns_gradle_exit_code_and_timeout_state(self) -> None:
        timeout = subprocess.TimeoutExpired(["gradlew", "test"], 1, output="timed out")
        runner = mock.Mock(side_effect=(
            subprocess.CompletedProcess(["gradlew", "test"], 7, stdout="failed"),
            timeout,
        ))
        with BackendVerifier(self.root, runner=runner) as verifier:
            failed = request_backend_verification(["test"], verifier.environment)
            timed_out = request_backend_verification(["compileJava"], verifier.environment)
        self.assertEqual((failed.returncode, failed.output, failed.timed_out), (7, "failed", False))
        self.assertEqual((timed_out.returncode, timed_out.output, timed_out.timed_out), (124, "timed out", True))

    def test_serializes_one_request_and_rejects_concurrent_request(self) -> None:
        started = threading.Event()
        release = threading.Event()
        active = 0
        maximum_active = 0
        lock = threading.Lock()

        def slow_runner(*_args, **_kwargs):
            nonlocal active, maximum_active
            with lock:
                active += 1
                maximum_active = max(maximum_active, active)
            started.set()
            release.wait(timeout=2)
            with lock:
                active -= 1
            return subprocess.CompletedProcess(["gradlew", "test"], 0, stdout="ok")

        with BackendVerifier(self.root, runner=slow_runner) as verifier:
            with ThreadPoolExecutor(max_workers=2) as executor:
                first = executor.submit(request_backend_verification, ["test"], verifier.environment)
                self.assertTrue(started.wait(timeout=1))
                with self.assertRaisesRegex(BackendVerifierClientError, "429"):
                    request_backend_verification(["test"], verifier.environment)
                release.set()
                self.assertEqual(first.result(timeout=2).returncode, 0)
        self.assertEqual(maximum_active, 1)

    def test_cli_forwards_exit_code_and_output_from_parent_verifier(self) -> None:
        output = StringIO()
        with (
            mock.patch(
                "worker_runner.backend_verifier.request_backend_verification",
                return_value=BackendVerificationResult(7, "Gradle failed"),
            ) as request,
            mock.patch("sys.stdout", output),
        ):
            exit_code = main(["test", "--tests", "com.flowbi.ApiTest"])

        self.assertEqual(exit_code, 7)
        self.assertEqual(output.getvalue(), "Gradle failed\n")
        self.assertEqual(
            request.call_args.args[0],
            ["test", "--tests", "com.flowbi.ApiTest"],
        )

    def test_formatter_token_is_bound_to_its_task_paths(self) -> None:
        first = self.write_java("backend/src/main/java/first/First.java")
        second = self.write_java("backend/src/main/java/second/Second.java")
        runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["gradlew", "spotlessApply"], 0, stdout="ok")
        )

        with BackendVerifier(self.root, runner=runner) as verifier:
            first_environment = verifier.environment_for_task(
                ("backend/src/main/java/first",), ()
            )
            second_environment = verifier.environment_for_task(
                ("backend/src/main/java/second",), ()
            )
            result = request_backend_formatting(["backend/src/main/java/first/First.java"], first_environment)
            self.assertEqual(result.returncode, 0)
            with self.assertRaisesRegex(BackendVerifierClientError, "거부"):
                request_backend_formatting(["backend/src/main/java/second/Second.java"], first_environment)

        self.assertTrue(first.exists())
        self.assertTrue(second.exists())
        self.assertEqual(runner.call_count, 1)

    def test_formatter_rejects_forbidden_paths_and_repository_escape(self) -> None:
        allowed = self.write_java("backend/src/main/java/allowed/Allowed.java")
        forbidden = self.write_java("backend/src/main/java/allowed/internal/Forbidden.java")
        outside = self.root / "outside.java"
        outside.write_text("class Outside {}\n", encoding="utf-8")
        runner = mock.Mock()

        with BackendVerifier(self.root, runner=runner) as verifier:
            environment = verifier.environment_for_task(
                ("backend/src/main/java/allowed",),
                ("backend/src/main/java/allowed/internal",),
            )
            for paths in (
                ["backend/src/main/java/allowed/internal/Forbidden.java"],
                ["../outside.java"],
                [],
            ):
                with self.assertRaisesRegex(BackendVerifierClientError, "거부"):
                    request_backend_formatting(paths, environment)

        self.assertEqual(allowed.read_text(encoding="utf-8"), "class Test {}\n")
        self.assertEqual(forbidden.read_text(encoding="utf-8"), "class Test {}\n")
        self.assertEqual(outside.read_text(encoding="utf-8"), "class Outside {}\n")
        runner.assert_not_called()

    def test_formatter_rejects_symlink_without_platform_symlink_privilege(self) -> None:
        target = self.write_java("backend/src/main/java/allowed/Link.java")
        runner = mock.Mock()
        original_is_symlink = Path.is_symlink

        def controlled_is_symlink(path: Path) -> bool:
            return path == target or original_is_symlink(path)

        with (
            mock.patch.object(Path, "is_symlink", autospec=True, side_effect=controlled_is_symlink),
            BackendVerifier(self.root, runner=runner) as verifier,
        ):
            environment = verifier.environment_for_task(("backend/src/main/java/allowed",), ())
            with self.assertRaisesRegex(BackendVerifierClientError, "거부"):
                request_backend_formatting(["backend/src/main/java/allowed/Link.java"], environment)

        runner.assert_not_called()

    def test_formatter_uses_temporary_workspace_and_applies_only_successful_output(self) -> None:
        target = self.write_java("backend/src/main/java/allowed/Target.java", "class Target {}\n")
        outside = self.write_java("backend/src/main/java/outside/Outside.java", "class Outside {}\n")

        def formatting_runner(command, **_kwargs):
            temporary_target = Path(command[0]).parent / "src/main/java/allowed/Target.java"
            temporary_target.write_text("class Target { }\n", encoding="utf-8")
            return subprocess.CompletedProcess(command, 0, stdout="formatted")

        with BackendVerifier(self.root, runner=formatting_runner) as verifier:
            environment = verifier.environment_for_task(("backend/src/main/java/allowed",), ())
            result = request_backend_formatting(["backend/src/main/java/allowed/Target.java"], environment)

        self.assertEqual(result.returncode, 0)
        self.assertEqual(target.read_text(encoding="utf-8"), "class Target { }\n")
        self.assertEqual(outside.read_text(encoding="utf-8"), "class Outside {}\n")

    def test_formatter_failure_and_timeout_leave_originals_unchanged(self) -> None:
        target = self.write_java("backend/src/main/java/allowed/Target.java", "class Target {}\n")
        failing_runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["gradlew", "spotlessApply"], 1, stdout="failed")
        )
        timeout_runner = mock.Mock(
            side_effect=subprocess.TimeoutExpired(["gradlew", "spotlessApply"], 1, output="timed out")
        )

        for runner in (failing_runner, timeout_runner):
            with BackendVerifier(self.root, runner=runner) as verifier:
                environment = verifier.environment_for_task(("backend/src/main/java/allowed",), ())
                result = request_backend_formatting(["backend/src/main/java/allowed/Target.java"], environment)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(target.read_text(encoding="utf-8"), "class Target {}\n")


if __name__ == "__main__":
    unittest.main()
