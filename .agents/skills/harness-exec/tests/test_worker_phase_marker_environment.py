from __future__ import annotations

from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
for scripts_root in (HARNESS_SCRIPTS, WORKER_SCRIPTS):
    if str(scripts_root) not in sys.path:
        sys.path.insert(0, str(scripts_root))


class WorkerPhaseMarkerEnvironmentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_pythonpath_prepends_repository_scripts_once_and_blocks_override(self) -> None:
        from harness_runner.preparation.environment import build_task_environment, build_worker_environment

        scripts = (self.root / ".agents" / "scripts").resolve()
        duplicate = os.path.relpath(scripts, start=Path.cwd())
        inherited = os.pathsep.join(("first", str(scripts), "second", duplicate))
        with mock.patch.dict(os.environ, {"PYTHONPATH": inherited}, clear=False):
            environment = build_worker_environment(self.root)
            self.assertEqual(os.environ.get("PYTHONPATH"), inherited)

        self.assertEqual(environment["PYTHONPATH"].split(os.pathsep), [str(scripts), "first", "second"])
        self.assertEqual(build_task_environment(environment, task_number=1, overrides={"PYTHONPATH": "task-value"})["PYTHONPATH"], environment["PYTHONPATH"])

    def test_pythonpath_handles_an_empty_parent_value(self) -> None:
        from harness_runner.preparation.environment import build_worker_environment

        with mock.patch.dict(os.environ, {"PYTHONPATH": ""}, clear=False):
            environment = build_worker_environment(self.root)
        self.assertEqual(environment["PYTHONPATH"], str((self.root / ".agents" / "scripts").resolve()))

    def test_prepared_environment_delivers_subprocess_phase_event(self) -> None:
        from harness_runner.preparation.environment import build_worker_environment
        from worker_runner.timing import CollectionService, RunContext

        project_root = WORKER_SCRIPTS.parents[1]
        events: list[dict[str, object]] = []
        collector = CollectionService(RunContext.create(task_number=1, area="be-worker", parent_session_id=None, run_id="phase-marker-test"), events.append)
        collector.start()
        try:
            environment = collector.worker_environment(build_worker_environment(project_root))
            result = subprocess.run([environment["FLOW_BI_PYTHON_EXECUTABLE"], "-m", "worker_runner.phase_marker", "analysis"], cwd=project_root, env=environment, capture_output=True, text=True, check=False, timeout=10)
        finally:
            collector.close()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([(event["event_type"], event["phase"]) for event in events], [("phase", "analysis")])


if __name__ == "__main__":
    unittest.main()
