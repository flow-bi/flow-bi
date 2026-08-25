from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from worker_runner import config
from worker_runner.codex_cli import (
    build_codex_command,
    resolve_codex_executable,
    resolve_codex_home,
)


class CodexCommandTests(unittest.TestCase):
    def test_resolves_first_available_codex_executable(self) -> None:
        with mock.patch(
            "worker_runner.codex_cli.shutil.which",
            side_effect=(None, "C:/tools/codex.cmd"),
        ):
            self.assertEqual(resolve_codex_executable(), "C:/tools/codex.cmd")

    def test_reports_missing_codex_executable(self) -> None:
        with mock.patch(
            "worker_runner.codex_cli.shutil.which", return_value=None
        ):
            with self.assertRaisesRegex(RuntimeError, "Codex CLI"):
                resolve_codex_executable()

    def test_uses_default_home_directory(self) -> None:
        with mock.patch("worker_runner.codex_cli.Path.home", return_value=Path("C:/home")):
            self.assertEqual(resolve_codex_home(), Path("C:/home/.codex"))

    def test_builds_exec_command_with_output_overrides_and_stdin(self) -> None:
        overrides = ["permissions={}", "model=\"gpt-5\""]
        with mock.patch(
            "worker_runner.codex_cli.build_config_overrides",
            return_value=overrides,
        ) as build_overrides:
            command = build_codex_command(
                writable_paths=("frontend",),
                read_only_paths=("backend",),
                toolchain_readable_paths=("C:/tools/node",),
                output_path=Path("C:/work/result.json"),
                executable="C:/tools/codex.exe",
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
        build_overrides.assert_called_once_with(
            writable_paths=("frontend",),
            read_only_paths=("backend",),
            toolchain_readable_paths=("C:/tools/node",),
        )

    def test_uses_resolved_executable_when_one_is_not_supplied(self) -> None:
        with (
            mock.patch(
                "worker_runner.codex_cli.resolve_codex_executable",
                return_value="codex",
            ),
            mock.patch(
                "worker_runner.codex_cli.build_config_overrides",
                return_value=[],
            ),
        ):
            command = build_codex_command(
                writable_paths=(),
                read_only_paths=(),
                toolchain_readable_paths=(),
                output_path=Path("result.json"),
            )

        self.assertEqual(command, ["codex", "exec", "-o", "result.json", "-"])


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
        with mock.patch("worker_runner.config.tomllib.load", return_value=loaded_config):
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
