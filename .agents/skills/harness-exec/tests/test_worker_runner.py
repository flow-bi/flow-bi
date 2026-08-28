from __future__ import annotations

from contextlib import nullcontext
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from worker_runner.codex import (
    build_codex_command,
    build_subprocess_environment,
    collect_worker_readable_paths,
)
from worker_runner.runner import _jsonl_tool_events, execute_worker
import worker_runner.runner as worker_runner_module
from worker_runner.invocation import (
    BACKEND_VERIFICATION_GUIDANCE,
    FRONTEND_VERIFICATION_GUIDANCE,
    parse_invocation,
)
from worker_runner.config import load_config
from worker_runner.timing import (
    CollectionService,
    EventValidationError,
    NodeEventSink,
    RunContext,
    determine_worker_area,
    validate_loopback_url,
)


class WorkerReadablePathTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.bin_dir = self.root / "bin"
        self.bin_dir.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def make_executable(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("#!/bin/sh\n", encoding="utf-8")
        path.chmod(0o755)

    def test_collects_tool_paths_symlink_target_and_npm_package(self) -> None:
        node = self.bin_dir / "node"
        git = self.bin_dir / "git"
        npm_package = self.root / "lib" / "node_modules" / "npm"
        npm_cli = npm_package / "bin" / "npm-cli.js"
        npm = self.bin_dir / "npm"
        java_home = self.root / "jdk"

        self.make_executable(node)
        self.make_executable(git)
        self.make_executable(npm_cli)
        java_home.mkdir()

        original_resolve = Path.resolve

        def resolve_npm_symlink(path: Path, *args: object, **kwargs: object) -> Path:
            if path == npm:
                return npm_cli
            return original_resolve(path, *args, **kwargs)

        try:
            npm.symlink_to(npm_cli)
        except OSError as error:
            if getattr(error, "winerror", None) != 1314:
                raise
            self.make_executable(npm)
            resolve_context = mock.patch.object(
                Path,
                "resolve",
                autospec=True,
                side_effect=resolve_npm_symlink,
            )
        else:
            resolve_context = nullcontext()

        executables = {"node": str(node), "npm": str(npm), "git": str(git)}
        with (
            resolve_context,
            mock.patch(
                "worker_runner.codex.shutil.which",
                side_effect=lambda name, path: executables.get(name),
            ),
        ):
            paths = set(
                collect_worker_readable_paths(
                    {
                        "PATH": str(self.bin_dir),
                        "JAVA_HOME": str(java_home),
                    },
                    home_dir=self.root / "home",
                    platform_name="linux",
                )
            )

        self.assertIn(str(java_home), paths)
        self.assertIn(str(self.bin_dir), paths)
        self.assertIn(str(node), paths)
        self.assertIn(str(git), paths)
        self.assertIn(str(npm), paths)
        self.assertIn(str(npm_cli.resolve()), paths)
        self.assertIn(str(npm_package.resolve()), paths)

    def test_collects_parent_python_executable_and_package_root(self) -> None:
        python_root = self.root / "Cellar" / "python@3.14" / "3.14.6"
        resolved_python = python_root / "bin" / "python3"
        self.make_executable(resolved_python)
        python_opt_root = self.root / "opt" / "python@3.14"
        python_opt_root.parent.mkdir()
        python = python_opt_root / "bin" / "python3"

        original_resolve = Path.resolve

        def resolve_python_symlink(
            path: Path,
            *args: object,
            **kwargs: object,
        ) -> Path:
            if path == python:
                return resolved_python
            return original_resolve(path, *args, **kwargs)

        try:
            python_opt_root.symlink_to(python_root, target_is_directory=True)
        except OSError as error:
            if getattr(error, "winerror", None) != 1314:
                raise
            resolve_context = mock.patch.object(
                Path,
                "resolve",
                autospec=True,
                side_effect=resolve_python_symlink,
            )
        else:
            resolve_context = nullcontext()

        with resolve_context:
            paths = set(
                collect_worker_readable_paths(
                    {"PATH": ""},
                    home_dir=self.root / "home",
                    platform_name="darwin",
                    python_executable=python,
                )
            )

        self.assertIn(str(resolved_python.resolve()), paths)
        self.assertIn(str(resolved_python.parent.resolve()), paths)
        self.assertIn(str(python_root.resolve()), paths)
        self.assertIn(str(python_opt_root), paths)

    def test_collects_package_json_for_project_ancestors(self) -> None:
        project_root = self.root / "workspace" / "repository"
        project_root.mkdir(parents=True)

        paths = set(
            collect_worker_readable_paths(
                {"PATH": ""},
                home_dir=self.root / "home",
                platform_name="linux",
                project_root=project_root,
            )
        )

        expected_paths = {
            str(directory / "package.json")
            for directory in (project_root, *project_root.parents)
        }

        self.assertTrue(expected_paths.issubset(paths))

    def test_collects_platform_specific_git_support_paths(self) -> None:
        home = self.root / "home"
        home.mkdir()
        git_config = home / ".gitconfig"
        xdg_git_config = home / ".config" / "git" / "config"
        git_config.write_text("[user]\n", encoding="utf-8")
        xdg_git_config.parent.mkdir(parents=True)
        xdg_git_config.write_text("[user]\n", encoding="utf-8")

        mac_paths = set(
            collect_worker_readable_paths(
                {"PATH": ""},
                home_dir=home,
                platform_name="darwin",
            )
        )
        windows_paths = set(
            collect_worker_readable_paths(
                {
                    "PATH": "",
                    "LOCALAPPDATA": str(self.root / "local-app-data"),
                },
                home_dir=home,
                platform_name="win32",
            )
        )
        linux_paths = set(
            collect_worker_readable_paths(
                {"PATH": ""},
                home_dir=home,
                platform_name="linux",
            )
        )

        self.assertIn(str(Path("/Library/Developer/CommandLineTools")), mac_paths)
        self.assertIn(str(Path("/System/Library/OpenSSL")), mac_paths)
        self.assertIn(str(git_config), mac_paths)
        self.assertIn(str(xdg_git_config), mac_paths)

    def test_collects_windows_npm_package_and_git_installation_roots(self) -> None:
        node_install = self.root / "Program Files" / "nodejs"
        npm = node_install / "npm"
        npm_package = node_install / "node_modules" / "npm"
        git_root = self.root / "Program Files" / "Git"
        git = git_root / "cmd" / "git"

        self.make_executable(npm)
        npm_package.mkdir(parents=True)
        self.make_executable(git)

        executables = {"npm": str(npm), "git": str(git)}
        with mock.patch(
            "worker_runner.codex.shutil.which",
            side_effect=lambda name, path: executables.get(name),
        ):
            paths = set(
                collect_worker_readable_paths(
                    {"PATH": os.pathsep.join((str(node_install), str(git.parent)))},
                    home_dir=self.root / "home",
                    platform_name="win32",
                )
            )

        self.assertIn(str(npm_package), paths)
        self.assertIn(str(node_install), paths)
        self.assertIn(str(git_root), paths)

    def test_worker_environment_uses_run_scoped_system_tmpdir(self) -> None:
        project_root = self.root / "workspace"
        project_root.mkdir()
        system_temp = self.root / "system-temp"
        with mock.patch(
            "worker_runner.codex.tempfile.gettempdir",
            return_value=str(system_temp),
        ):
            environment = build_subprocess_environment(
                "test-run",
                task_number=12,
                base_environment={"PATH": os.environ.get("PATH", "")},
                project_root=project_root,
            )

        expected = system_temp / "flow-bi-harness-worker" / "test-run"
        self.assertEqual(environment["TEMP"], str(expected))
        self.assertEqual(environment["TMP"], str(expected))
        self.assertEqual(environment["TMPDIR"], str(expected))
        self.assertFalse(expected.is_relative_to(project_root))
        self.assertEqual(
            environment["FLOW_BI_PYTHON_EXECUTABLE"],
            sys.executable,
        )
        self.assertEqual(environment["FLOW_BI_TASK_NUMBER"], "12")

    def test_worker_environment_discards_removed_browser_verifier_values(self) -> None:
        browser_url = "FLOW_BI_" + "BROWSER_VERIFIER_URL"
        browser_token = "FLOW_BI_" + "BROWSER_VERIFIER_TOKEN"
        environment = build_subprocess_environment(
            "worker-run-id",
            task_number=12,
            base_environment={
                "PATH": os.environ.get("PATH", ""),
                "CODEX_THREAD_ID": "parent-session-id",
                "FLOW_BI_RUN_ID": "stale-run-id",
                "FLOW_BI_TASK_NUMBER": "99",
                browser_url: "http://127.0.0.1:1234",
                browser_token: "token",
            },
            project_root=self.root,
        )

        self.assertEqual(environment["FLOW_BI_RUN_ID"], "worker-run-id")
        self.assertEqual(environment["FLOW_BI_TASK_NUMBER"], "12")
        self.assertEqual(
            environment["FLOW_BI_PARENT_SESSION_ID"],
            "parent-session-id",
        )
        self.assertNotIn(browser_url, environment)
        self.assertNotIn(browser_token, environment)

    def test_worker_environment_rejects_invalid_task_numbers(self) -> None:
        for value in (None, True, False, 0, -1, "2", 1.5):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, "Task number"):
                    build_subprocess_environment(
                        "test-run",
                        task_number=value,
                        base_environment={"PATH": ""},
                        project_root=self.root,
                    )

    def test_worker_temp_directory_gets_external_recursive_write_permission(self) -> None:
        worker_temp = self.root / "system-temp" / "flow-bi-harness-worker" / "run-id"
        config = load_config((), ("backend",), writable_directories=(str(worker_temp),))
        filesystem = config["permissions"]["task-worker"]["filesystem"]
        workspace_permissions = config["permissions"]["task-worker"]["filesystem"][":workspace_roots"]

        self.assertEqual(workspace_permissions["backend"], "read")
        self.assertNotIn(".agents/skills/harness-exec/.worker-tmp/**", workspace_permissions)
        self.assertEqual(filesystem[str(worker_temp)], "write")
        self.assertEqual(filesystem[f"{worker_temp}/**"], "write")

    def test_execute_worker_forwards_collected_paths_to_codex_permissions(self) -> None:
        readable_paths = ("/toolchain/node", "/toolchain/npm")
        subprocess_runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["codex"], 0)
        )

        with (
            mock.patch.object(
                worker_runner_module,
                "build_subprocess_environment",
                return_value={"PATH": "", "TMPDIR": str(self.root / "worker-temp")},
            ) as build_environment,
            mock.patch.object(
                worker_runner_module,
                "collect_worker_readable_paths",
                return_value=readable_paths,
            ) as collect_paths,
            mock.patch.object(
                worker_runner_module,
                "build_codex_command",
                return_value=["codex", "exec"],
            ) as build_command,
        ):
            execute_worker(
                "task",
                ("frontend",),
                ("backend",),
                task_number=1,
                project_root=self.root,
                runner=subprocess_runner,
                logger=lambda *_args: None,
            )

        self.assertEqual(
            build_command.call_args.kwargs["readable_paths"],
            readable_paths,
        )
        self.assertEqual(
            build_command.call_args.kwargs["writable_directories"],
            (str(self.root / "worker-temp"),),
        )
        collect_paths.assert_called_once_with(
            {"PATH": "", "TMPDIR": str(self.root / "worker-temp")},
            project_root=self.root,
        )
        self.assertEqual(
            build_environment.call_args.kwargs["task_number"],
            1,
        )


class WorkerExecutionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    @staticmethod
    def output_path(command: list[str]) -> Path:
        return Path(command[command.index("-o") + 1])

    @staticmethod
    def command(
        _allowed: tuple[str, ...],
        _forbidden: tuple[str, ...],
        output_path: Path,
        *_args: object,
        **_kwargs: object,
    ) -> list[str]:
        return ["codex", "exec", "-o", str(output_path)]

    def patch_command_builder(self) -> mock._patch:
        return mock.patch.object(
            worker_runner_module,
            "build_codex_command",
            side_effect=self.command,
        )

    def pending_files(self) -> tuple[Path, ...]:
        pending = self.root / ".codex-logs" / ".pending"
        return tuple(pending.iterdir()) if pending.exists() else ()

    def test_execute_worker_isolates_progress_streams_and_cleans_temporary_files(self) -> None:
        captured_streams: list[object] = []
        captured_worker_temp: list[Path] = []

        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            stdout = kwargs["stdout"]
            stderr = kwargs["stderr"]
            self.assertIsNot(stdout, stderr)
            self.assertNotIn(stdout, (None, subprocess.PIPE))
            stdout.write("progress that must stay internal\n")
            stdout.flush()
            worker_temp = Path(kwargs["env"]["TMPDIR"])
            (worker_temp / "nested").mkdir()
            (worker_temp / "nested" / "artifact.txt").write_text("temporary", encoding="utf-8")
            captured_worker_temp.append(worker_temp)
            self.output_path(command).write_text('{"final_status":"PASS"}', encoding="utf-8")
            captured_streams.append(stdout)
            return subprocess.CompletedProcess(command, 0)

        with self.patch_command_builder():
            result = execute_worker(
                "task",
                (".agents",),
                (),
                task_number=1,
                project_root=self.root,
                runner=run,
                logger=lambda *_args: None,
            )

        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.output, {"final_status": "PASS"})
        self.assertEqual(result.output_error, "")
        self.assertTrue(captured_streams[0].closed)
        self.assertFalse(captured_worker_temp[0].exists())
        self.assertEqual(self.pending_files(), ())

    def test_execute_worker_preserves_node_terminal_timing_summary(self) -> None:
        def run(command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
            self.output_path(command).write_text('{"final_status":"PASS"}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        def sink(event: dict[str, object]) -> dict[str, object]:
            if event["event_type"] != "end":
                return {"status": "recorded"}
            return {
                "status": "recorded",
                "timing_summary": {
                    "run_id": event["run_id"],
                    "task_number": event["task_number"],
                    "area": event["area"],
                    "total_duration_ms": 1000,
                    "unattributed_duration_ms": 200,
                    "classification": {"explicit": True, "inferred": False},
                    "phases": [],
                },
            }

        with self.patch_command_builder():
            result = execute_worker(
                "task", (".agents",), (), task_number=1, project_root=self.root,
                runner=run, logger=lambda *_args: None, event_sink=sink,
            )

        self.assertEqual(result.timing_summary["task_number"], 1)
        self.assertEqual(result.timing_summary["total_duration_ms"], 1000)

    def test_execute_worker_reads_its_run_only_from_the_node_timing_tree(self) -> None:
        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            run_id = kwargs["env"]["FLOW_BI_RUN_ID"]
            tree_path = self.root / ".codex-logs" / "user-prompt-detail-tree.json"
            tree_path.parent.mkdir(parents=True, exist_ok=True)
            tree_path.write_text(json.dumps({"roots": [], "unresolved": [{
                "run_id": run_id, "executor": {"kind": "task", "task_number": 1},
                "area": "be-worker", "total_duration_ms": 1200,
                "unattributed_duration_ms": 300,
                "classification": {"explicit": True, "inferred": True},
                "phases": [], "children": [],
            }, {"run_id": "previous-run", "executor": {"kind": "task", "task_number": 1},
                "area": "be-worker", "total_duration_ms": 9999,
                "unattributed_duration_ms": 0,
                "classification": {"explicit": False, "inferred": True}, "phases": [], "children": []}]}), encoding="utf-8")
            self.output_path(command).write_text('{"final_status":"PASS"}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        with self.patch_command_builder():
            result = execute_worker(
                "task", (".agents",), (), task_number=1, project_root=self.root,
                runner=run, logger=lambda *_args: None, event_sink=lambda _event: {"status": "recorded"},
            )

        self.assertEqual(result.timing_summary["run_id"], result.run_id)
        self.assertEqual(result.timing_summary["total_duration_ms"], 1200)

    def test_jsonl_tool_parser_keeps_only_stable_safe_metadata(self) -> None:
        progress = self.root / "worker.jsonl"
        progress.write_text(
            '{"type":"item.started","item":{"id":"item-1","type":"command_execution","command":"secret command"}}\n'
            'not-json\n'
            '{"type":"item.completed","item":{"id":"item-1","type":"command_execution","output":"secret output"}}\n'
            '{"type":"item.completed","item":{"id":"missing","type":"command_execution"}}\n',
            encoding="utf-8",
        )

        events = _jsonl_tool_events(progress)

        self.assertEqual([event["event_type"] for event in events], ["tool_start", "tool_end"])
        self.assertTrue(all(event["tool_id"] == "item-1" for event in events))
        self.assertTrue(all("secret" not in str(event) for event in events))

    def test_codex_command_uses_jsonl_progress_protocol(self) -> None:
        command = build_codex_command((), (), self.root / "output.json", executable="codex")

        self.assertEqual(command[:3], ["codex", "exec", "--json"])

    def test_execute_worker_returns_only_a_bounded_failure_log_tail(self) -> None:
        tail_limit = worker_runner_module.WORKER_LOG_TAIL_BYTES

        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            log = kwargs["stderr"]
            log.write("discarded-prefix\n")
            log.write("x" * tail_limit)
            log.write("\nfailure-marker\n")
            log.flush()
            return subprocess.CompletedProcess(command, 7)

        with self.patch_command_builder():
            result = execute_worker(
                "task",
                (".agents",),
                (),
                task_number=1,
                project_root=self.root,
                runner=run,
                logger=lambda *_args: None,
            )

        self.assertEqual(result.returncode, 7)
        self.assertIn("failure-marker", result.output_error)
        self.assertNotIn("discarded-prefix", result.output_error)
        self.assertLessEqual(len(result.output_error), tail_limit + 512)
        self.assertEqual(self.pending_files(), ())

    def test_execute_worker_includes_log_tail_when_final_json_is_invalid(self) -> None:
        logger = mock.Mock()
        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            log = kwargs["stderr"]
            log.write("json-generation-failed\n")
            log.flush()
            self.output_path(command).write_text("not-json", encoding="utf-8")
            return subprocess.CompletedProcess(command, 0)

        with self.patch_command_builder():
            result = execute_worker(
                "task",
                (".agents",),
                (),
                task_number=1,
                project_root=self.root,
                runner=run,
                logger=logger,
            )

        self.assertIsNone(result.output)
        self.assertIn("Expecting value", result.output_error)
        self.assertIn("json-generation-failed", result.output_error)
        logger.assert_called_once()
        self.assertEqual(logger.call_args.args[4], "failed")
        self.assertEqual(self.pending_files(), ())

    def test_execute_worker_logs_actual_terminal_status_once_for_each_exit_branch(self) -> None:
        cases = (
            (0, '{"final_status":"PASS"}', "completed"),
            (0, '{"final_status":"FAILED"}', "failed"),
            (7, '', "failed"),
        )
        for returncode, output, expected_status in cases:
            with self.subTest(returncode=returncode, expected_status=expected_status):
                logger = mock.Mock()

                def run(command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
                    self.output_path(command).write_text(output, encoding="utf-8")
                    return subprocess.CompletedProcess(command, returncode)

                with self.patch_command_builder():
                    execute_worker("task", (".agents",), (), task_number=1, project_root=self.root, runner=run, logger=logger)

                logger.assert_called_once()
                self.assertEqual(logger.call_args.args[4], expected_status)

    def test_execute_worker_attaches_log_tail_and_cleans_files_on_timeout(self) -> None:
        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            log = kwargs["stderr"]
            log.write("timeout-marker\n")
            log.flush()
            raise subprocess.TimeoutExpired(command, 30)

        with self.patch_command_builder():
            with self.assertRaises(subprocess.TimeoutExpired) as raised:
                execute_worker(
                    "task",
                    (".agents",),
                    (),
                    task_number=1,
                    project_root=self.root,
                    runner=run,
                    logger=lambda *_args: None,
                    timeout=30,
                )

        self.assertIn("timeout-marker", raised.exception.stderr)
        self.assertEqual(self.pending_files(), ())

    def test_execute_worker_rejects_invalid_task_numbers_before_subprocess(self) -> None:
        runner = mock.Mock()

        for value in (None, True, 0, -1, "1"):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, "Task number"):
                    execute_worker(
                        "task",
                        (".agents",),
                        (),
                        task_number=value,
                        project_root=self.root,
                        runner=runner,
                        logger=lambda *_args: None,
                    )

        runner.assert_not_called()


class WorkerTimingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.context = RunContext.create(
            task_number=7,
            area="fe-worker",
            parent_session_id="parent-session",
        )
        self.events: list[dict[str, object]] = []
        self.service = CollectionService(self.context, self.events.append)
        self.service.start()

    def tearDown(self) -> None:
        self.service.close()

    def event(self, event_type: str, **values: object) -> dict[str, object]:
        return {
            "event_type": event_type,
            "run_id": self.context.run_id,
            "token": self.context.token,
            **values,
        }

    def test_records_start_phase_tool_and_terminal_events_with_bound_context(self) -> None:
        self.service.submit(self.event("start"))
        self.service.submit(self.event("phase", phase="implementation"))
        self.service.submit(self.event("tool_start", tool_id="tool-1", tool_name="exec"))
        self.service.submit(self.event("tool_end", tool_id="tool-1", tool_name="exec"))
        self.service.submit(self.event("end", status="completed", exit_code=0, summary="done"))

        self.assertEqual(
            [event["event_type"] for event in self.events],
            ["start", "phase", "tool_start", "tool_end", "end"],
        )
        self.assertTrue(all(event["run_id"] == self.context.run_id for event in self.events))
        self.assertTrue(all(event["area"] == "fe-worker" for event in self.events))
        self.assertTrue(all(event["task_number"] == 7 for event in self.events))
        self.assertEqual(self.events[1]["phase_source"], "explicit")
        self.assertIn("occurred_at", self.events[-1])

    def test_rejects_wrong_token_phase_run_and_events_after_terminal(self) -> None:
        for event in (
            {**self.event("phase", phase="analysis"), "token": "wrong"},
            self.event("phase", phase="not-a-phase"),
            {**self.event("phase", phase="analysis"), "run_id": "other-run"},
        ):
            with self.subTest(event=event):
                with self.assertRaises(EventValidationError):
                    self.service.submit(event)

        self.service.submit(self.event("end", status="failed", exit_code=1))
        with self.assertRaises(EventValidationError):
            self.service.submit(self.event("phase", phase="analysis"))

    def test_duplicate_tool_end_is_idempotent_and_inferred_phase_is_preserved(self) -> None:
        self.service.submit(self.event("tool_start", tool_id="tool-1", tool_name="rg"))
        self.service.submit(self.event("tool_end", tool_id="tool-1", tool_name="rg"))
        self.service.submit(self.event("tool_end", tool_id="tool-1", tool_name="rg"))

        self.assertEqual(len(self.events), 2)
        self.assertEqual(self.events[0]["phase"], "analysis")
        self.assertEqual(self.events[0]["phase_source"], "inferred")

    def test_area_uses_existing_frontend_path_boundary_and_worker_values(self) -> None:
        self.assertEqual(determine_worker_area(("frontend/src",)), "fe-worker")
        self.assertEqual(determine_worker_area(("backend/src",)), "be-worker")
        self.assertEqual(determine_worker_area((".agents/scripts",)), "be-worker")

    def test_rerun_uses_a_distinct_run_id_and_token_for_the_same_task(self) -> None:
        repeated = RunContext.create(
            task_number=7,
            area="fe-worker",
            parent_session_id="parent-session",
        )

        self.assertNotEqual(repeated.run_id, self.context.run_id)
        self.assertNotEqual(repeated.token, self.context.token)

    def test_environment_does_not_expose_log_directory_and_has_loopback_url(self) -> None:
        environment = self.service.worker_environment({"FLOW_BI_RUN_ID": "stale"})

        self.assertNotIn(".codex-logs", " ".join(environment.values()))
        self.assertTrue(environment["FLOW_BI_WORKER_EVENT_URL"].startswith("http://127.0.0.1:"))
        self.assertEqual(environment["FLOW_BI_RUN_ID"], self.context.run_id)
        self.assertNotEqual(environment["FLOW_BI_WORKER_EVENT_TOKEN"], "")

    def test_rejects_external_event_urls_and_permission_config_has_no_log_write(self) -> None:
        for url in ("https://example.com/events", "http://10.0.0.2/events", "file:///tmp/events"):
            with self.subTest(url=url):
                with self.assertRaises(EventValidationError):
                    validate_loopback_url(url)
        filesystem = load_config((), ())["permissions"]["task-worker"]["filesystem"]
        self.assertNotIn(".codex-logs", filesystem)

    def test_runner_preserves_normal_failure_and_timeout_outcomes_when_event_sink_fails(self) -> None:
        root = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: __import__("shutil").rmtree(root))
        captured: list[dict[str, object]] = []

        def sink(event: dict[str, object]) -> None:
            captured.append(event)
            raise RuntimeError("recording unavailable")

        def command(_allowed: object, _forbidden: object, output: Path, *_args: object, **_kwargs: object) -> list[str]:
            return ["codex", "exec", "-o", str(output)]

        def normal(command_values: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
            Path(command_values[command_values.index("-o") + 1]).write_text('{"final_status":"PASS"}', encoding="utf-8")
            return subprocess.CompletedProcess(command_values, 0)

        with mock.patch.object(worker_runner_module, "build_codex_command", side_effect=command):
            result = execute_worker("task", ("frontend",), (), task_number=1, project_root=root, runner=normal, event_sink=sink)
        self.assertEqual(result.returncode, 0)
        self.assertEqual([event["event_type"] for event in captured], ["start", "end"])

        def timeout(_command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
            raise subprocess.TimeoutExpired("codex", 1)

        with mock.patch.object(worker_runner_module, "build_codex_command", side_effect=command):
            with self.assertRaises(subprocess.TimeoutExpired):
                execute_worker("task", ("backend",), (), task_number=2, project_root=root, runner=timeout, event_sink=sink)
        self.assertEqual(captured[-1]["event_type"], "end")
        self.assertEqual(captured[-1]["status"], "timeout")


class WorkerNodeLoggingIntegrationTests(unittest.TestCase):
    """Exercise the authenticated Python collector against the real Node CLI."""

    def test_collector_records_completed_failed_and_timeout_runs_without_worker_log_access(self) -> None:
        source_root = Path(__file__).resolve().parents[4]
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        shutil.copytree(source_root / ".codex" / "hooks", root / ".codex" / "hooks")

        for task_number, area, status, exit_code in (
            (1, "fe-worker", "completed", 0),
            (2, "be-worker", "failed", 1),
            (3, "be-worker", "timeout", 124),
        ):
            context = RunContext.create(task_number=task_number, area=area, parent_session_id="parent")
            environment = os.environ | {
                "FLOW_BI_RUN_ID": context.run_id,
                "FLOW_BI_TASK_NUMBER": str(task_number),
                "FLOW_BI_PARENT_SESSION_ID": "parent",
            }
            subprocess.run(
                ["node", str(root / ".codex" / "hooks" / "log-prompt-detail.mjs")],
                input=json.dumps({"hook_event_name": "UserPromptSubmit", "prompt": "worker", "session_id": f"worker-{task_number}", "turn_id": f"turn-{task_number}"}),
                text=True,
                encoding="utf-8",
                cwd=root,
                env=environment,
                check=True,
                capture_output=True,
                timeout=5,
            )
            def node_runner(*args: object, **kwargs: object) -> subprocess.CompletedProcess[str]:
                result = subprocess.run(*args, **kwargs)
                if not result.stdout:
                    raise AssertionError(f"Node CLI returned empty stdout ({result.returncode}, {result.args}): {result.stderr}")
                return result

            service = CollectionService(context, NodeEventSink(root, runner=node_runner))
            service.start()
            try:
                def event(event_type: str, **values: object) -> dict[str, object]:
                    return {"event_type": event_type, "run_id": context.run_id, "token": context.token, **values}

                service.submit(event("start"))
                service.submit(event("phase", phase="verification"))
                service.submit(event("tool_start", tool_id="test", tool_name="node --test"))
                service.submit(event("end", status=status, exit_code=exit_code, summary="safe summary"))
                self.assertFalse(service.diagnostics)
            finally:
                service.close()

        tree = json.loads((root / ".codex-logs" / "user-prompt-detail-tree.json").read_text(encoding="utf-8"))
        records = json.loads((root / ".codex-logs" / "user-prompt-detail-submit.json").read_text(encoding="utf-8"))
        worker_ends = [record for record in records if record["record_type"] == "worker_end"]
        self.assertEqual([record["status"] for record in worker_ends], ["completed", "failed", "timeout"])
        self.assertTrue(all("token" not in record for record in records))
        self.assertEqual(tree["roots"], [])
        self.assertEqual(len(tree["unresolved"]), 3)
        self.assertTrue(all(node["area"] in {"fe-worker", "be-worker"} for node in tree["unresolved"]))

    def test_collector_binds_parent_start_before_real_worker_session_creation(self) -> None:
        source_root = Path(__file__).resolve().parents[4]
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        shutil.copytree(source_root / ".codex" / "hooks", root / ".codex" / "hooks")
        context = RunContext.create(task_number=9, area="fe-worker", parent_session_id="parent")
        service = CollectionService(context, NodeEventSink(root))
        service.start()
        try:
            service.submit({"event_type": "start", "run_id": context.run_id, "token": context.token})
            environment = os.environ | {
                "FLOW_BI_RUN_ID": context.run_id,
                "FLOW_BI_TASK_NUMBER": "9",
                "FLOW_BI_PARENT_SESSION_ID": "parent",
            }
            subprocess.run(
                ["node", str(root / ".codex" / "hooks" / "log-prompt-detail.mjs")],
                input=json.dumps({"hook_event_name": "UserPromptSubmit", "prompt": "worker", "session_id": "worker-session", "turn_id": "worker-turn"}),
                text=True, encoding="utf-8", cwd=root, env=environment, check=True, capture_output=True, timeout=5,
            )
            service.submit({"event_type": "end", "run_id": context.run_id, "token": context.token, "status": "completed", "exit_code": 0})
        finally:
            service.close()

        records = json.loads((root / ".codex-logs" / "user-prompt-detail-submit.json").read_text(encoding="utf-8"))
        starts = [record for record in records if record["record_type"] == "worker_start"]
        self.assertEqual(len(starts), 1)
        self.assertEqual(starts[0]["context"]["session_id"], "worker-session")
        self.assertEqual(starts[0]["area"], "fe-worker")


class WorkerInvocationTests(unittest.TestCase):
    def payload(self, execution_context: dict[str, object]) -> str:
        execution_context = dict(execution_context)
        if execution_context.get("mode") == "rerun":
            execution_context.setdefault("effective_tdd_policy", "REUSE_ALLOWED")
            execution_context.setdefault("prior_evidence_id", "plan:rerun-01:task:2:fingerprint:same-fingerprint")
        else:
            execution_context.setdefault("effective_tdd_policy", "REQUIRED")
        return json.dumps(
            {
                "common_prompt": "common",
                "additional_request": "",
                "task": {
                    "number": 2,
                    "title": "worker rerun",
                    "allowed_paths": [".agents/scripts/worker_runner"],
                    "forbidden_paths": ["backend"],
                    "task_prompt": "implement",
                    "verification_items": ["unit test"],
                    "tdd_policy": "REQUIRED",
                },
                "execution_context": execution_context,
            }
        )

    def test_new_or_changed_revision_requires_fresh_tdd_without_prior_evidence(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "new-fingerprint",
                    "mode": "new_or_changed",
                    "prior_tdd_evidence": None,
                }
            )
        )

        self.assertIn('"mode": "new_or_changed"', prompt)
        self.assertIn("Red → Green → Refactor", prompt)
        self.assertIn("과거 TDD 증거를 재사용하지 마십시오", prompt)


    def test_worker_guidance_limits_repeated_discovery_patches_and_diff_output(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "efficient-fingerprint",
                    "mode": "new_or_changed",
                    "prior_tdd_evidence": None,
                }
            )
        )

        self.assertIn("최초 탐색에서 변경 대상 파일과 필요한 구간을 확정", prompt)
        self.assertIn("관련 변경을 가능한 한 큰 단위의 patch로 적용", prompt)
        self.assertIn("patch가 실패한 경우에만 해당 구간을 다시 조회", prompt)
        self.assertIn("최종 `git diff`는 한 번만", prompt)
        self.assertIn("긴 테스트 로그는 실패 원인 주변의 제한된 구간", prompt)

    def test_backend_verifier_prompt_waits_for_in_flight_execution_before_rerunning(self) -> None:
        contexts = (
            {
                "plan_id": "rerun-01",
                "fingerprint": "new-fingerprint",
                "mode": "new_or_changed",
                "prior_tdd_evidence": None,
            },
            {
                "plan_id": "rerun-01",
                "fingerprint": "same-fingerprint",
                "mode": "rerun",
                "prior_tdd_evidence": {
                    "result": "PASS",
                    "evidence": "red-green-refactor record",
                },
            },
        )

        for context in contexts:
            with self.subTest(mode=context["mode"]):
                prompt, _allowed, _forbidden = parse_invocation(self.payload(context))

                self.assertIn("기존 실행을 wait/poll", prompt)
                self.assertIn("같은 verifier CLI를 새 shell 명령으로 시작하지 마십시오", prompt)
                self.assertIn("확정적으로 종료", prompt)
                self.assertIn("실패 원인을 수정했거나 명시적인 재검증이 필요한 경우", prompt)
                self.assertIn("HTTP 429 등 실행 중 충돌 응답만으로", prompt)
                self.assertIn("기존 실행의 최종 결과를 먼저 확인", prompt)
                self.assertIn("automated_verification` 또는 `decision`", prompt)
                self.assertIn("최종 JSON에는 완료된 최신 검증 결과만", prompt)

    def test_verifier_prompts_wait_for_in_flight_execution_before_rerunning(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "new-fingerprint",
                    "mode": "new_or_changed",
                    "prior_tdd_evidence": None,
                }
            )
        )

        for guidance in (BACKEND_VERIFICATION_GUIDANCE, FRONTEND_VERIFICATION_GUIDANCE):
            with self.subTest(guidance=guidance):
                self.assertIn("기존 실행을 wait/poll", guidance)
                self.assertIn("같은 verifier CLI를 새 shell 명령으로 시작하지 마십시오", guidance)
                self.assertIn("single-flight", guidance)
                self.assertIn("최종 JSON에는 완료된 최신 검증 결과만", guidance)

    def test_same_revision_rerun_references_prior_evidence_and_current_regression(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "same-fingerprint",
                    "mode": "rerun",
                    "prior_tdd_evidence": {
                        "result": "PASS",
                        "evidence": "red-green-refactor record",
                    },
                }
            )
        )

        self.assertIn('"mode": "rerun"', prompt)
        self.assertIn("plan:rerun-01:task:2:fingerprint:same-fingerprint", prompt)
        self.assertIn("새로운 Red 실패를 인위적으로 만들지 마십시오", prompt)
        self.assertIn("현재 Green 및 회귀 검증", prompt)
        self.assertIn("reused_evidence", prompt)
        self.assertIn("current_verification_evidence", prompt)

    def test_reuse_allowed_is_rejected_for_non_required_declaration(self) -> None:
        payload = json.loads(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "same-fingerprint",
                    "mode": "rerun",
                    "prior_tdd_evidence": {"result": "PASS", "evidence": "record"},
                }
            )
        )
        payload["task"]["tdd_policy"] = "REGRESSION_ONLY"

        with self.assertRaisesRegex(ValueError, "일치하지 않습니다"):
            parse_invocation(json.dumps(payload))

    def test_existing_implementation_without_evidence_requires_human_review(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "legacy-fingerprint",
                    "mode": "existing_without_evidence",
                    "prior_tdd_evidence": None,
                }
            )
        )

        self.assertIn("HUMAN_REVIEW_REQUIRED", prompt)
        self.assertIn("TDD `PASS`로 보고하지 마십시오", prompt)
        self.assertIn("인위적인 Red 실패를 만들지 마십시오", prompt)
        self.assertNotIn("Red 재현을 수행", prompt)

    def test_rejects_prior_evidence_for_a_changed_revision(self) -> None:
        with self.assertRaisesRegex(ValueError, "재사용할 수 없습니다"):
            parse_invocation(
                self.payload(
                    {
                        "plan_id": "rerun-01",
                        "fingerprint": "changed-fingerprint",
                        "mode": "new_or_changed",
                        "prior_tdd_evidence": {"result": "PASS", "evidence": "old"},
                    }
                )
            )

    def test_decision_correction_prompt_requires_only_a_pass_or_failure_decision(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "same-fingerprint",
                    "mode": "new_or_changed",
                    "prior_tdd_evidence": None,
                }
            )[:-1]
            + ', "decision_correction": {"prior_decision": "PASS_WITH_FOLLOW_UP", "objective_evidence": {"quality_score": 90}}}'
        )

        self.assertIn("성공 판정은 정확히 `PASS`만", prompt)
        self.assertIn("제품 구현, 테스트, 검증을 다시 수행하거나 변경하지 마십시오", prompt)
        self.assertIn("PASS_WITH_FOLLOW_UP", prompt)

    def test_verification_collection_prompt_rejoins_existing_single_flight_request(self) -> None:
        prompt, _allowed, _forbidden = parse_invocation(
            self.payload(
                {
                    "plan_id": "rerun-01",
                    "fingerprint": "same-fingerprint",
                    "mode": "new_or_changed",
                    "prior_tdd_evidence": None,
                }
            )[:-1]
            + ', "verification_result_collection": {"attempt": 2, "verification": [{"item": "unit test", "result": "NOT_RUN", "evidence": "shell session running"}]}}'
        )

        self.assertIn("검증 결과 수집 continuation 요청", prompt)
        self.assertIn("제품 구현이나 테스트를 수정하지 말고", prompt)
        self.assertIn("완료된 검증을 재실행하지도 마십시오", prompt)
        self.assertIn("single-flight verifier 요청", prompt)
        self.assertIn("총 3회까지만", prompt)


if __name__ == "__main__":
    unittest.main()
