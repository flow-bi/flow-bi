from __future__ import annotations

from importlib import import_module
from pathlib import Path
import sys
import unittest


HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(HARNESS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(HARNESS_SCRIPTS))


class HarnessPackageLayoutTests(unittest.TestCase):
    def test_groups_modules_by_planning_preparation_execution_and_results(self) -> None:
        expected_modules = (
            "harness_runner.planning.invocation",
            "harness_runner.planning.plan",
            "harness_runner.planning.parser",
            "harness_runner.planning.paths",
            "harness_runner.preparation.runtime",
            "harness_runner.preparation.gateway",
            "harness_runner.preparation.prompt",
            "harness_runner.execution.coordinator",
            "harness_runner.execution.scheduling",
            "harness_runner.execution.task_executor",
            "harness_runner.results.evidence",
            "harness_runner.results.state",
            "harness_runner.results.worker_result",
            "harness_runner.results.report",
            "harness_runner.results.notion",
        )

        for module_name in expected_modules:
            with self.subTest(module=module_name):
                import_module(module_name)


if __name__ == "__main__":
    unittest.main()
