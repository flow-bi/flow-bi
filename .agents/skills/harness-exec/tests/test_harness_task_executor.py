from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.evidence import ExecutionRecordStore
from harness_runner.models import Task, TaskExecutionContext, TaskInvocation
from harness_runner.task_executor import execute_task


TASK = Task(1, "Task 1", (), (), (), "requirements", (), ("regression",), 90)
CONTEXT = TaskExecutionContext("harness-03", "fingerprint", "new_or_changed")
INVOCATION = TaskInvocation("common", "", TASK, CONTEXT)


def worker_result(*, decision: str = "PASS") -> object:
    return type("Result", (), {
        "returncode": 0,
        "output_error": "",
        "output": {
            "work_summary": "completed",
            "mandatory_gates": {
                name: {"result": "PASS", "evidence": "evidence"}
                for name in (
                    "permission_security", "scope", "requirements", "tdd",
                    "automated_verification", "contract_sync", "critical_findings",
                )
            },
            "verification": [{"item": "regression", "result": "PASS", "evidence": "current"}],
            "decision": decision,
            "remaining_issues": [],
            "final_status": "PASS",
            "quality_score": 90,
        },
    })()


class TaskExecutorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.store = ExecutionRecordStore(Path(self.temporary.name) / "records")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_pass_result_is_saved_atomically(self) -> None:
        result = execute_task(TASK, INVOCATION, lambda _: worker_result(), self.store)

        self.assertEqual(result.status, "succeeded")
        self.assertTrue(self.store.path_for("harness-03", 1).exists())

    def test_timeout_process_and_contract_failures_become_task_failures(self) -> None:
        failures = (
            lambda _: (_ for _ in ()).throw(subprocess.TimeoutExpired("worker", 10)),
            lambda _: (_ for _ in ()).throw(subprocess.CalledProcessError(3, "worker")),
            lambda _: type("Broken", (), {"returncode": 0, "output": None, "output_error": "invalid"})(),
        )

        results = [execute_task(TASK, INVOCATION, call_worker, self.store) for call_worker in failures]

        self.assertEqual([result.status for result in results], ["failed", "failed", "failed"])
        self.assertTrue(results[0].timed_out)
        self.assertEqual(results[0].return_code, 124)
        self.assertEqual(results[1].return_code, 3)

    def test_unexpected_worker_exception_becomes_a_task_failure(self) -> None:
        result = execute_task(
            TASK,
            INVOCATION,
            lambda _: (_ for _ in ()).throw(RuntimeError("gateway unavailable")),
            self.store,
        )

        self.assertEqual(result.status, "failed")
        self.assertIn("gateway unavailable", result.message)

    def test_nonstandard_success_is_corrected_once(self) -> None:
        calls: list[TaskInvocation] = []

        def call_worker(invocation: TaskInvocation) -> object:
            calls.append(invocation)
            return worker_result(decision="PASS_WITH_FOLLOW_UP" if len(calls) == 1 else "PASS")

        result = execute_task(TASK, INVOCATION, call_worker, self.store)

        self.assertEqual(result.status, "succeeded")
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1].decision_correction["prior_decision"], "PASS_WITH_FOLLOW_UP")

    def test_evidence_save_failure_is_not_reported_as_success(self) -> None:
        with mock.patch.object(self.store, "save", side_effect=OSError("disk full")):
            result = execute_task(TASK, INVOCATION, lambda _: worker_result(), self.store)

        self.assertEqual(result.status, "failed")
        self.assertIn("disk full", result.message)


if __name__ == "__main__":
    unittest.main()
