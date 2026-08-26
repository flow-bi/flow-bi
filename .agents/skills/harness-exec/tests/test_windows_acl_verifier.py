from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager, redirect_stdout
from io import StringIO
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(HARNESS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(HARNESS_SCRIPTS))

from worker_runner.verifiers.windows_acl import (
    AclRestorationError,
    WindowsAclBackend,
    preserve_windows_acls,
)
from harness_runner import cli
from harness_runner.models import (
    ExecutionReport,
    HarnessRequest,
    ParsedPlan,
    Task,
    TaskResult,
)


class FakeAclBackend:
    def __init__(self, values: dict[Path, bytes]) -> None:
        self.values = dict(values)
        self.restore_calls: list[tuple[Path, bytes]] = []
        self.fail_capture_for: Path | None = None
        self.fail_restore_for: Path | None = None

    def capture(self, path: Path) -> bytes:
        if path == self.fail_capture_for:
            raise OSError("capture failed")
        return self.values[path]

    def restore(self, path: Path, snapshot: bytes) -> None:
        self.restore_calls.append((path, snapshot))
        if path == self.fail_restore_for:
            raise OSError("restore failed")
        self.values[path] = snapshot


class WindowsAclVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name).resolve()
        self.first = self.root / "first.py"
        self.second = self.root / "second.py"
        self.first.write_text("first", encoding="utf-8")
        self.second.write_text("second", encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_unchanged_acl_is_not_restored(self) -> None:
        backend = FakeAclBackend({self.first: b"before"})

        with preserve_windows_acls(self.root, ("first.py",), backend=backend):
            pass

        self.assertEqual(backend.restore_calls, [])

    def test_changed_acl_is_restored_after_all_parallel_tasks_finish(self) -> None:
        backend = FakeAclBackend({self.first: b"first-before", self.second: b"second-before"})
        barrier = threading.Barrier(2)
        observed_during_execution: list[tuple[bytes, bytes]] = []

        def change(path: Path, value: bytes) -> None:
            backend.values[path] = value
            barrier.wait(timeout=5)
            observed_during_execution.append((backend.values[self.first], backend.values[self.second]))

        with preserve_windows_acls(
            self.root,
            ("first.py", "second.py"),
            backend=backend,
        ):
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = (
                    executor.submit(change, self.first, b"first-worker"),
                    executor.submit(change, self.second, b"second-worker"),
                )
                for future in futures:
                    future.result()
            self.assertEqual(backend.restore_calls, [])

        self.assertTrue(observed_during_execution)
        self.assertEqual(backend.values[self.first], b"first-before")
        self.assertEqual(backend.values[self.second], b"second-before")

    def test_acl_is_restored_when_worker_scope_raises(self) -> None:
        backend = FakeAclBackend({self.first: b"before"})

        with self.assertRaisesRegex(RuntimeError, "worker failed"):
            with preserve_windows_acls(self.root, ("first.py",), backend=backend):
                backend.values[self.first] = b"worker"
                raise RuntimeError("worker failed")

        self.assertEqual(backend.values[self.first], b"before")

    def test_restore_failure_is_reported(self) -> None:
        backend = FakeAclBackend({self.first: b"before"})
        backend.fail_restore_for = self.first

        with self.assertRaisesRegex(AclRestorationError, "first.py"):
            with preserve_windows_acls(self.root, ("first.py",), backend=backend):
                backend.values[self.first] = b"worker"

    def test_missing_contract_path_uses_existing_parent_snapshot(self) -> None:
        backend = FakeAclBackend({self.root: b"root-before"})

        with preserve_windows_acls(
            self.root,
            ("new/package",),
            backend=backend,
        ):
            backend.values[self.root] = b"root-worker"

        self.assertEqual(backend.values[self.root], b"root-before")

    def test_initial_capture_failure_stops_before_worker_execution(self) -> None:
        backend = FakeAclBackend({self.first: b"before"})
        backend.fail_capture_for = self.first
        entered = False

        with self.assertRaisesRegex(AclRestorationError, "ACL 캡처 실패"):
            with preserve_windows_acls(self.root, ("first.py",), backend=backend):
                entered = True

        self.assertFalse(entered)

    def test_effective_paths_merge_every_parallel_task_with_static_profile(self) -> None:
        from worker_runner.verifiers.windows_acl import worker_permission_paths

        paths = worker_permission_paths(
            ("first-task", "second-task"),
            ("first-read-only", "second-read-only"),
        )

        self.assertIn("first-task", paths)
        self.assertIn("second-task", paths)
        self.assertIn("first-read-only", paths)
        self.assertIn("second-read-only", paths)
        self.assertIn(".git", paths)

    def test_cli_runs_parallel_workers_inside_one_acl_cohort(self) -> None:
        tasks = ParsedPlan(
            "common",
            (
                Task(1, "first", (), ("first.py",), ("first-read.py",), ""),
                Task(2, "second", (), ("second.py",), ("second-read.py",), ""),
            ),
        )
        request = HarnessRequest("harness-03")
        cohort_active = False

        @contextmanager
        def acl_cohort(project_root, paths):
            nonlocal cohort_active
            self.assertEqual(project_root, self.root)
            self.assertEqual(paths, ("effective-path",))
            cohort_active = True
            try:
                yield
            finally:
                cohort_active = False

        def execute_workers(*args, **kwargs):
            self.assertTrue(cohort_active)
            return ExecutionReport((TaskResult(1, "first", "succeeded"),))

        backend = mock.MagicMock()
        backend.environment_for_task.return_value = {}
        frontend = mock.MagicMock(environment={})
        with (
            mock.patch.object(cli, "parse_invocation", return_value=request),
            mock.patch.object(cli, "repository_root", return_value=self.root),
            mock.patch.object(
                cli,
                "load_active_plan",
                return_value=(self.root / "harness-03.md", tasks),
            ),
            mock.patch.object(
                cli,
                "worker_permission_paths",
                return_value=("effective-path",),
            ) as permission_paths,
            mock.patch.object(cli, "preserve_windows_acls", side_effect=acl_cohort),
            mock.patch.object(cli, "BackendVerifier") as backend_type,
            mock.patch.object(cli, "FrontendVerifier") as frontend_type,
            mock.patch.object(cli, "execute_workers", side_effect=execute_workers),
            mock.patch.object(
                cli,
                "build_execution_report",
                return_value=SimpleNamespace(title="title", body="body"),
            ),
            mock.patch.object(
                cli,
                "publish_report",
                return_value=SimpleNamespace(page_url="https://notion.test/report"),
            ),
            mock.patch.object(
                cli,
                "complete_plan",
                return_value=self.root / "docs/plans/complete/harness-03.md",
            ),
            redirect_stdout(StringIO()),
        ):
            backend_type.return_value.__enter__.return_value = backend
            frontend_type.return_value.__enter__.return_value = frontend
            self.assertEqual(cli.main(["request"]), 0)

        permission_paths.assert_called_once_with(
            ("first.py", "second.py"),
            ("first-read.py", "second-read.py"),
        )
        self.assertFalse(cohort_active)

    @unittest.skipUnless(os.name == "nt", "Windows ACL integration test")
    def test_real_windows_acl_is_identical_after_scope(self) -> None:
        backend = WindowsAclBackend(self.root)
        before = backend.capture(self.first)

        with preserve_windows_acls(self.root, ("first.py",), backend=backend):
            subprocess.run(
                ["icacls", str(self.first), "/grant", "*S-1-1-0:R", "/q"],
                check=True,
                capture_output=True,
            )
            self.assertNotEqual(backend.capture(self.first), before)

        self.assertEqual(backend.capture(self.first), before)

    @unittest.skipUnless(os.name == "nt", "Windows ACL integration test")
    def test_two_real_windows_tasks_change_acl_concurrently_and_restore_once(self) -> None:
        backend = WindowsAclBackend(self.root)
        before = {
            self.first: backend.capture(self.first),
            self.second: backend.capture(self.second),
        }
        barrier = threading.Barrier(2)

        def change_acl(path: Path) -> bytes:
            subprocess.run(
                ["icacls", str(path), "/grant", "*S-1-1-0:R", "/q"],
                check=True,
                capture_output=True,
            )
            barrier.wait(timeout=5)
            return backend.capture(path)

        with preserve_windows_acls(
            self.root,
            ("first.py", "second.py"),
            backend=backend,
        ):
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = (
                    executor.submit(change_acl, self.first),
                    executor.submit(change_acl, self.second),
                )
                changed = tuple(future.result() for future in futures)
            self.assertNotEqual(changed[0], before[self.first])
            self.assertNotEqual(changed[1], before[self.second])

        self.assertEqual(backend.capture(self.first), before[self.first])
        self.assertEqual(backend.capture(self.second), before[self.second])


if __name__ == "__main__":
    unittest.main()
