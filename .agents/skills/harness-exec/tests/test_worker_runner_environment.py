from __future__ import annotations

from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


class WorkerEnvironmentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_rejects_non_positive_or_non_integer_task_numbers(self) -> None:
        from worker_runner.runtime import _validate_task_number

        for value in (None, True, False, 0, -1, "2", 1.5):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, "Task number"):
                    _validate_task_number(value)

    def test_builds_isolated_environment_without_parent_only_values(self) -> None:
        from worker_runner.environment import build_subprocess_environment

        base_environment = {
            "PATH": os.pathsep.join(("first", "second", "first")),
            "CODEX_THREAD_ID": "parent-session",
            "FLOW_BI_NOTION_PARENT": "notion-parent",
            "CODEX_PERMISSION_PROFILE": "parent-profile",
            "ORIGINAL": "unchanged",
        }
        environment = build_subprocess_environment(
            "run-1",
            task_number=3,
            base_environment=base_environment,
            project_root=self.root,
        )

        temporary_root = self.root / "backend" / ".gradle-user-home"
        self.assertEqual(base_environment["PATH"], os.pathsep.join(("first", "second", "first")))
        self.assertEqual(environment["ORIGINAL"], "unchanged")
        self.assertEqual(environment["FLOW_BI_RUN_ID"], "run-1")
        self.assertEqual(environment["FLOW_BI_TASK_NUMBER"], "3")
        self.assertEqual(environment["FLOW_BI_PARENT_SESSION_ID"], "parent-session")
        self.assertEqual(environment["FLOW_BI_PYTHON_EXECUTABLE"], sys.executable)
        self.assertEqual(environment["GRADLE_USER_HOME"], str(temporary_root))
        self.assertEqual(environment["NPM_CONFIG_CACHE"], str(temporary_root / "tmp" / "npm-cache"))
        self.assertEqual(environment["NPM_CONFIG_USERCONFIG"], str(temporary_root / "worker-home" / ".npmrc"))
        self.assertNotIn("FLOW_BI_NOTION_PARENT", environment)
        self.assertNotIn("CODEX_PERMISSION_PROFILE", environment)

    def test_uses_project_java_home_once_at_the_front_of_path(self) -> None:
        from worker_runner.environment import build_subprocess_environment

        java_home = self.root / "jdk"
        java_executable = java_home / "bin" / ("java.exe" if os.name == "nt" else "java")
        java_executable.parent.mkdir(parents=True)
        java_executable.write_text("java", encoding="utf-8")
        backend = self.root / "backend"
        backend.mkdir()
        (backend / ".env.local").write_text(f"JAVA_HOME={java_home}\n", encoding="utf-8")

        environment = build_subprocess_environment(
            "run-2",
            task_number=1,
            base_environment={"PATH": os.pathsep.join((str(java_home / "bin"), "other", str(java_home / "bin")))},
            project_root=self.root,
        )

        self.assertEqual(environment["JAVA_HOME"], str(java_home))
        self.assertEqual(environment["PATH"].split(os.pathsep), [str(java_home / "bin"), "other"])

    def test_runtime_prepares_shared_values_once_and_isolates_task_environments(self) -> None:
        from worker_runner.runtime import prepare_worker_runtime

        base_environment = {"PATH": "base", "CODEX_THREAD_ID": "parent"}
        with (
            mock.patch("worker_runner.runtime.resolve_codex_executable", return_value="codex") as executable,
            mock.patch("worker_runner.runtime.resolve_codex_home", return_value=self.root / "codex-home") as home,
            mock.patch("worker_runner.runtime._read_project_java_home", return_value=None) as java_home,
            mock.patch("worker_runner.runtime.collect_worker_readable_paths", return_value=("toolchain",)) as toolchains,
            mock.patch("worker_runner.runtime.load_worker_config_template", return_value={"default_permissions": "task", "permissions": {"task": {"filesystem": {":workspace_roots": {}}}}}),
        ):
            runtime = prepare_worker_runtime(self.root, base_environment=base_environment)

        first = runtime.bind_task(1, ("frontend",), ("backend",), {"FRONTEND_URL": "one"})
        second = runtime.bind_task(2, ("backend",), ("frontend",), {"FRONTEND_URL": "two"})
        first_environment = first.environment_for_run("first-run")
        second_environment = second.environment_for_run("second-run")

        executable.assert_called_once_with()
        home.assert_called_once_with()
        java_home.assert_called_once()
        toolchains.assert_called_once()
        self.assertEqual(runtime.toolchain_readable_paths, ("toolchain",))
        self.assertEqual(first_environment["FLOW_BI_TASK_NUMBER"], "1")
        self.assertEqual(second_environment["FLOW_BI_TASK_NUMBER"], "2")
        self.assertEqual(first_environment["FLOW_BI_RUN_ID"], "first-run")
        self.assertEqual(second_environment["FLOW_BI_RUN_ID"], "second-run")
        self.assertEqual(first_environment["FRONTEND_URL"], "one")
        self.assertEqual(second_environment["FRONTEND_URL"], "two")
        self.assertNotIn("FRONTEND_URL", runtime.base_environment)
        self.assertEqual(first.config_overrides, first.config_overrides)
        self.assertNotEqual(first.config_overrides, second.config_overrides)


class WorkerRunnerPublicContractTests(unittest.TestCase):
    def test_package_exports_only_runtime_contract(self) -> None:
        import worker_runner

        self.assertEqual(worker_runner.__all__, ("WorkerRuntime", "WorkerTaskRuntime", "prepare_worker_runtime"))
        self.assertTrue(callable(worker_runner.prepare_worker_runtime))

    def test_runner_composes_specialized_modules(self) -> None:
        import worker_runner.runner as runner

        self.assertTrue(callable(runner.build_codex_command))
        self.assertTrue(callable(runner.execute_worker))
        self.assertTrue(callable(runner.execute_prepared_worker))


class WorkerExecutionContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    @staticmethod
    def output_path(command: list[str]) -> Path:
        return Path(command[command.index("-o") + 1])

    def test_returns_worker_json_and_cleans_isolated_files(self) -> None:
        import worker_runner.runner as runner_module
        from worker_runner.prompt import build_worker_prompt, load_prompt_sections

        logger = mock.Mock()
        prompt = build_worker_prompt(
            sections=load_prompt_sections(),
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

        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            self.assertEqual(kwargs["input"], prompt)
            self.output_path(command).write_text('{"final_status":"PASS"}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        with mock.patch.object(
            runner_module,
            "build_codex_command",
            side_effect=lambda **kwargs: ["codex", "exec", "-o", str(kwargs["output_path"])],
        ):
            result = runner_module.execute_worker(
                prompt,
                (".agents",),
                (),
                task_number=1,
                project_root=self.root,
                runner=run,
                logger=logger,
            )

        self.assertEqual(result.output, {"final_status": "PASS"})
        self.assertEqual(result.output_error, "")
        self.assertEqual(logger.call_args.args[4], "completed")
        self.assertEqual(tuple((self.root / ".codex-logs" / ".pending").iterdir()), ())

    def test_logs_timeout_and_cleans_isolated_files(self) -> None:
        import worker_runner.runner as runner_module

        logger = mock.Mock()

        def run(command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
            raise subprocess.TimeoutExpired(command, 1)

        with mock.patch.object(
            runner_module,
            "build_codex_command",
            side_effect=lambda **kwargs: ["codex", "exec", "-o", str(kwargs["output_path"])],
        ):
            with self.assertRaises(subprocess.TimeoutExpired):
                runner_module.execute_worker(
                    "task",
                    (".agents",),
                    (),
                    task_number=1,
                    project_root=self.root,
                    runner=run,
                    logger=logger,
                    timeout=1,
                )

        self.assertEqual(logger.call_args.args[1], 124)
        self.assertEqual(logger.call_args.args[4], "timeout")
        self.assertEqual(tuple((self.root / ".codex-logs" / ".pending").iterdir()), ())

    def test_process_module_owns_log_tail_and_temporary_file_lifecycle(self) -> None:
        import worker_runner.worker_process as process

        logger = mock.Mock()

        def command_factory(output_path: Path) -> list[str]:
            return ["codex", "exec", "-o", str(output_path)]

        def run(command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
            self.output_path(command).write_text('{"final_status":"PASS"}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        result = process.run_worker_process(
            run_id="run-1",
            command_factory=command_factory,
            prompt="prompt from build_worker_prompt()",
            environment={"PATH": ""},
            project_root=self.root,
            runner=run,
            logger=logger,
        )

        self.assertEqual(result.output, {"final_status": "PASS"})
        self.assertEqual(result.output_error, "")
        self.assertEqual(logger.call_args.args[4], "completed")
        self.assertEqual(tuple((self.root / ".codex-logs" / ".pending").iterdir()), ())

    def test_process_selects_default_completion_logger_at_call_time(self) -> None:
        import worker_runner.worker_process as process

        def command_factory(output_path: Path) -> list[str]:
            return ["codex", "exec", "-o", str(output_path)]

        def run(command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
            self.output_path(command).write_text('{"final_status":"PASS"}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        with mock.patch.object(process, "invoke_worker_completion_hook") as logger:
            result = process.run_worker_process(
                run_id="run-default-logger",
                command_factory=command_factory,
                prompt="prompt",
                environment={"PATH": ""},
                project_root=self.root,
                runner=run,
            )

        self.assertEqual(result.output, {"final_status": "PASS"})
        self.assertEqual(logger.call_args.args[4], "completed")

    def test_process_reports_invalid_json_with_a_bounded_log_tail(self) -> None:
        import worker_runner.worker_process as process
        from worker_runner.worker_log import WORKER_LOG_TAIL_BYTES

        logger = mock.Mock()
        log_content = "x" * (WORKER_LOG_TAIL_BYTES + 1)

        def command_factory(output_path: Path) -> list[str]:
            return ["codex", "exec", "-o", str(output_path)]

        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            self.output_path(command).write_text("not-json", encoding="utf-8")
            kwargs["stdout"].write(log_content)
            return subprocess.CompletedProcess(command, 1)

        result = process.run_worker_process(
            run_id="run-2",
            command_factory=command_factory,
            prompt="prompt",
            environment={"PATH": ""},
            project_root=self.root,
            runner=run,
            logger=logger,
        )

        self.assertIsNone(result.output)
        self.assertIn("Worker log tail", result.output_error)
        self.assertIn("earlier output omitted", result.output_error)
        self.assertLessEqual(len(result.output_error.encode("utf-8")), WORKER_LOG_TAIL_BYTES + 256)
        self.assertEqual(logger.call_args.args[4], "failed")
        self.assertEqual(tuple((self.root / ".codex-logs" / ".pending").iterdir()), ())


if __name__ == "__main__":
    unittest.main()
