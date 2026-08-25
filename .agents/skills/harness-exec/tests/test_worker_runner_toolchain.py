from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


class WorkerToolchainPathTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def make_file(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("tool", encoding="utf-8")

    def test_collects_toolchains_in_discovery_order_without_duplicates(self) -> None:
        from worker_runner.toolchain_paths import collect_worker_readable_paths

        bin_dir = self.root / "bin"
        java_home = self.root / "jdk"
        python = bin_dir / "python"
        node = bin_dir / "node"
        npm = bin_dir / "npm"
        git = bin_dir / "git"
        for executable in (python, node, npm, git):
            self.make_file(executable)
        java_home.mkdir()

        tools = {"node": str(node), "npm": str(npm), "git": str(git)}
        with mock.patch(
            "worker_runner.toolchain_paths.shutil.which",
            side_effect=lambda name, path: tools.get(name),
        ):
            paths = collect_worker_readable_paths(
                {"JAVA_HOME": str(java_home), "PATH": str(bin_dir)},
                home_dir=self.root / "home",
                platform_name="linux",
                python_executable=python,
                project_root=self.root / "project",
            )

        self.assertEqual(paths[:3], (str(java_home), str(python), str(bin_dir)))
        self.assertEqual(paths.count(str(bin_dir)), 1)
        self.assertEqual(paths.count(str(node)), 1)
        self.assertEqual(paths.count(str(npm)), 1)
        self.assertEqual(paths.count(str(git)), 1)

    def test_omits_missing_directory_candidates_but_keeps_read_policy_files(self) -> None:
        from worker_runner.toolchain_paths import collect_worker_readable_paths

        npm = self.root / "nodejs" / "npm"
        self.make_file(npm)
        home = self.root / "home"
        project = self.root / "workspace" / "project"
        project.mkdir(parents=True)

        with mock.patch(
            "worker_runner.toolchain_paths.shutil.which",
            side_effect=lambda name, path: str(npm) if name == "npm" else None,
        ):
            paths = collect_worker_readable_paths(
                {"PATH": str(npm.parent)},
                home_dir=home,
                platform_name="linux",
                python_executable=npm,
                project_root=project,
            )

        self.assertNotIn(str(npm.parent / "node_modules" / "npm"), paths)
        self.assertIn(str(home / ".gitconfig"), paths)
        self.assertIn(str(home / ".config" / "git" / "config"), paths)
        self.assertIn(str(project / "package.json"), paths)
        self.assertIn(str(project.parent / "package.json"), paths)

    def test_collects_macos_homebrew_and_windows_git_roots_at_os_boundaries(self) -> None:
        from worker_runner.toolchain_paths import collect_worker_readable_paths

        cellar_python = self.root / "Cellar" / "python@3.14" / "3.14.6" / "bin" / "python3"
        opt_python = self.root / "opt" / "python@3.14" / "bin" / "python3"
        git = self.root / "Program Files" / "Git" / "cmd" / "git.exe"
        for executable in (cellar_python, opt_python, git):
            self.make_file(executable)

        original_resolve = Path.resolve

        def resolve_opt_python(path: Path, *args: object, **kwargs: object) -> Path:
            if path == opt_python:
                return cellar_python
            return original_resolve(path, *args, **kwargs)

        with mock.patch.object(Path, "resolve", autospec=True, side_effect=resolve_opt_python):
            mac_paths = collect_worker_readable_paths(
                {"PATH": ""},
                home_dir=self.root / "home",
                platform_name="darwin",
                python_executable=opt_python,
                project_root=self.root,
            )

        with mock.patch(
            "worker_runner.toolchain_paths.shutil.which",
            side_effect=lambda name, path: str(git) if name == "git" else None,
        ):
            windows_paths = collect_worker_readable_paths(
                {"PATH": str(git.parent)},
                home_dir=self.root / "home",
                platform_name="win32",
                python_executable=git,
                project_root=self.root,
            )

        self.assertIn(str(self.root / "opt" / "python@3.14"), mac_paths)
        self.assertIn(str(self.root / "Cellar" / "python@3.14" / "3.14.6"), mac_paths)
        self.assertIn(str(Path("/Library/Developer/CommandLineTools")), mac_paths)
        self.assertIn(str(Path("/System/Library/OpenSSL")), mac_paths)
        self.assertIn(str(self.root / "Program Files" / "Git"), windows_paths)
        self.assertNotIn(str(Path("/Library/Developer/CommandLineTools")), windows_paths)

    def test_passes_collected_paths_to_the_codex_command_boundary(self) -> None:
        from worker_runner.codex_cli import build_codex_command
        from worker_runner.toolchain_paths import collect_worker_readable_paths

        python = self.root / "bin" / "python"
        self.make_file(python)
        paths = collect_worker_readable_paths(
            {"PATH": ""},
            home_dir=self.root / "home",
            platform_name="linux",
            python_executable=python,
            project_root=self.root,
        )
        with mock.patch(
            "worker_runner.codex_cli.build_config_overrides",
            return_value=(),
        ) as build_overrides:
            build_codex_command(
                writable_paths=("frontend",),
                read_only_paths=("backend",),
                toolchain_readable_paths=paths,
                output_path=self.root / "result.json",
                executable="codex",
            )

        self.assertEqual(
            build_overrides.call_args.kwargs["toolchain_readable_paths"],
            paths,
        )


if __name__ == "__main__":
    unittest.main()
