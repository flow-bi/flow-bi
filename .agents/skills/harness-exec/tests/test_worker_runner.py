from __future__ import annotations

from contextlib import nullcontext
from pathlib import Path
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from worker_runner.codex import (
    build_subprocess_environment,
    collect_worker_readable_paths,
)
from worker_runner.runner import execute_worker
import worker_runner.runner as worker_runner_module
from worker_runner.invocation import parse_invocation
from worker_runner.config import load_config


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

        self.assertIn(str(resolved_python), paths)
        self.assertIn(str(resolved_python.parent), paths)
        self.assertIn(str(python_root), paths)
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
        mac_cache = home / "Library" / "Caches" / "Cypress"
        windows_cache = self.root / "local-app-data" / "Cypress" / "Cache"
        linux_cache = home / ".cache" / "Cypress"
        for cache in (mac_cache, windows_cache, linux_cache):
            cache.mkdir(parents=True)
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
        self.assertNotIn(str(mac_cache), mac_paths)
        self.assertNotIn(str(windows_cache), windows_paths)
        self.assertNotIn(str(linux_cache), linux_paths)

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

    def test_worker_environment_uses_workspace_backed_tmpdir(self) -> None:
        environment = build_subprocess_environment(
            "test-run",
            task_number=12,
            base_environment={"PATH": os.environ.get("PATH", "")},
            project_root=self.root,
        )

        expected = self.root / "backend" / ".gradle-user-home" / "tmp"
        self.assertEqual(environment["TEMP"], str(expected))
        self.assertEqual(environment["TMP"], str(expected))
        self.assertEqual(environment["TMPDIR"], str(expected))
        self.assertEqual(
            environment["FLOW_BI_PYTHON_EXECUTABLE"],
            sys.executable,
        )
        self.assertEqual(environment["FLOW_BI_TASK_NUMBER"], "12")

    def test_worker_environment_keeps_task_identifiers_separate_from_verifier_values(self) -> None:
        environment = build_subprocess_environment(
            "worker-run-id",
            task_number=12,
            base_environment={
                "PATH": os.environ.get("PATH", ""),
                "CODEX_THREAD_ID": "parent-session-id",
                "FLOW_BI_RUN_ID": "stale-run-id",
                "FLOW_BI_TASK_NUMBER": "99",
                "FLOW_BI_BROWSER_VERIFIER_URL": "http://127.0.0.1:1234",
                "FLOW_BI_BROWSER_VERIFIER_TOKEN": "token",
            },
            project_root=self.root,
        )

        self.assertEqual(environment["FLOW_BI_RUN_ID"], "worker-run-id")
        self.assertEqual(environment["FLOW_BI_TASK_NUMBER"], "12")
        self.assertEqual(
            environment["FLOW_BI_PARENT_SESSION_ID"],
            "parent-session-id",
        )
        self.assertEqual(
            environment["FLOW_BI_BROWSER_VERIFIER_URL"],
            "http://127.0.0.1:1234",
        )
        self.assertEqual(environment["FLOW_BI_BROWSER_VERIFIER_TOKEN"], "token")

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

    def test_worker_temp_directory_keeps_recursive_write_permission(self) -> None:
        config = load_config((), ("backend",))
        workspace_permissions = config["permissions"]["task-worker"]["filesystem"][":workspace_roots"]

        self.assertEqual(workspace_permissions["backend"], "read")
        self.assertEqual(
            workspace_permissions["backend/.gradle-user-home/**"],
            "write",
        )
        self.assertNotIn(".git/**", workspace_permissions)

    def test_execute_worker_forwards_collected_paths_to_codex_permissions(self) -> None:
        readable_paths = ("/toolchain/node", "/toolchain/npm")
        subprocess_runner = mock.Mock(
            return_value=subprocess.CompletedProcess(["codex"], 0)
        )

        with (
            mock.patch.object(
                worker_runner_module,
                "build_subprocess_environment",
                return_value={"PATH": ""},
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
        collect_paths.assert_called_once_with(
            {"PATH": ""},
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

        def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
            stdout = kwargs["stdout"]
            stderr = kwargs["stderr"]
            self.assertIs(stdout, stderr)
            self.assertNotIn(stdout, (None, subprocess.PIPE))
            stdout.write("progress that must stay internal\n")
            stdout.flush()
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
        self.assertEqual(self.pending_files(), ())

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
                logger=lambda *_args: None,
            )

        self.assertIsNone(result.output)
        self.assertIn("Expecting value", result.output_error)
        self.assertIn("json-generation-failed", result.output_error)
        self.assertEqual(self.pending_files(), ())

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


class WorkerInvocationTests(unittest.TestCase):
    def payload(self, execution_context: dict[str, object]) -> str:
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


if __name__ == "__main__":
    unittest.main()
