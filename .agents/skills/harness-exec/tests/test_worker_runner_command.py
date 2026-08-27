from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest import mock


HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
for scripts_root in (HARNESS_SCRIPTS, WORKER_SCRIPTS):
    if str(scripts_root) not in sys.path:
        sys.path.insert(0, str(scripts_root))

from harness_runner.preparation import config
from harness_runner.preparation.codex import (
    resolve_codex_executable,
    resolve_codex_home,
)
from worker_runner.codex_cli import build_codex_command


class CodexCommandTests(unittest.TestCase):
    def test_resolves_first_available_codex_executable(self) -> None:
        with mock.patch(
            "harness_runner.preparation.codex.shutil.which",
            side_effect=(None, "C:/tools/codex.cmd"),
        ):
            self.assertEqual(resolve_codex_executable(), "C:/tools/codex.cmd")

    def test_reports_missing_codex_executable(self) -> None:
        with mock.patch(
            "harness_runner.preparation.codex.shutil.which", return_value=None
        ):
            with self.assertRaisesRegex(RuntimeError, "Codex CLI"):
                resolve_codex_executable()

    def test_uses_default_home_directory(self) -> None:
        with mock.patch("harness_runner.preparation.codex.Path.home", return_value=Path("C:/home")):
            self.assertEqual(resolve_codex_home(), Path("C:/home/.codex"))

    def test_builds_exec_command_with_output_overrides_and_stdin(self) -> None:
        overrides = ["permissions={}", "model=\"gpt-5\""]
        command = build_codex_command(
            output_path=Path("C:/work/result.json"),
            executable="C:/tools/codex.exe",
            config_overrides=tuple(overrides),
        )

        self.assertEqual(
            command,
            [
                "C:/tools/codex.exe",
                "exec",
                "-o",
                str(Path("C:/work/result.json")),
                "-c",
                "permissions={}",
                "-c",
                'model="gpt-5"',
                "-",
            ],
        )
class WorkerConfigPermissionTests(unittest.TestCase):
    def test_write_read_and_toolchain_permissions_do_not_overwrite_each_other(self) -> None:
        loaded_config = {
            "default_permissions": "task-worker",
            "permissions": {
                "task-worker": {
                    "filesystem": {":workspace_roots": {}}
                }
            },
        }
        with mock.patch("harness_runner.preparation.config.tomllib.load", return_value=loaded_config):
            worker_config = config.build_worker_config(
                writable_paths=("frontend",),
                read_only_paths=("frontend", "backend"),
                toolchain_readable_paths=("C:/tools/node",),
            )

        filesystem = worker_config["permissions"]["task-worker"]["filesystem"]
        self.assertEqual(filesystem[":workspace_roots"]["frontend"], "write")
        self.assertEqual(filesystem[":workspace_roots"]["backend"], "read")
        self.assertEqual(filesystem["C:/tools/node"], "read")


if __name__ == "__main__":
    unittest.main()
