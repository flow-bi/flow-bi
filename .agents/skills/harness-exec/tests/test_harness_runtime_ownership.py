from __future__ import annotations

from pathlib import Path
import sys
import unittest


HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(HARNESS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(HARNESS_SCRIPTS))


class HarnessRuntimeOwnershipTests(unittest.TestCase):
    def test_harness_package_owns_runtime_preparation_contract(self) -> None:
        from harness_runner.preparation.runtime import (
            WorkerRuntime,
            WorkerTaskRuntime,
            prepare_worker_runtime,
        )

        self.assertTrue(callable(prepare_worker_runtime))
        self.assertEqual(WorkerRuntime.__module__, "harness_runner.preparation.runtime")
        self.assertEqual(WorkerTaskRuntime.__module__, "harness_runner.preparation.runtime")

    def test_worker_runner_exports_only_the_prepared_execution_adapter(self) -> None:
        import worker_runner

        self.assertEqual(worker_runner.__all__, ("execute_prepared_worker",))
        self.assertFalse(hasattr(worker_runner, "prepare_worker_runtime"))


if __name__ == "__main__":
    unittest.main()
