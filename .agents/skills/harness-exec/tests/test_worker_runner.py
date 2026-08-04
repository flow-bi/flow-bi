from __future__ import annotations

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
        npm.symlink_to(npm_cli)
        java_home.mkdir()

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
        python_opt_root.symlink_to(python_root, target_is_directory=True)
        python = python_opt_root / "bin" / "python3"

        paths = set(
            collect_worker_readable_paths(
                {"PATH": ""},
                home_dir=self.root / "home",
                platform_name="darwin",
                python_executable=python,
            )
        )

        self.assertIn(str(python.resolve()), paths)
        self.assertIn(str(python.parent.resolve()), paths)
        self.assertIn(str(python_root.resolve()), paths)
        self.assertIn(str(python_opt_root), paths)

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

        self.assertIn("/Library/Developer/CommandLineTools", mac_paths)
        self.assertIn("/System/Library/OpenSSL", mac_paths)
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
            ),
            mock.patch.object(
                worker_runner_module,
                "collect_worker_readable_paths",
                return_value=readable_paths,
            ),
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
                project_root=self.root,
                runner=subprocess_runner,
                logger=lambda *_args: None,
            )

        self.assertEqual(
            build_command.call_args.kwargs["readable_paths"],
            readable_paths,
        )


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
