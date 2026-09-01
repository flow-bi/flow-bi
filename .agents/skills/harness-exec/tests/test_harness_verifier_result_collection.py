from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.execution.task_runner import TaskRunner
from harness_runner.models import HarnessRequest, Task
from harness_runner.preparation.worker_settings import TaskWorkerSettings
from harness_runner.results.evidence import TaskEvidenceStore
from worker_runner import WorkerExecutionResult


TASK = Task(
    1,
    "verification collection",
    (),
    (),
    (),
    "collect verifier result",
    (),
    ("regression",),
    90,
    "REQUIRED",
)


def worker_result(
    verification_result: str = "PASS",
    evidence: str = "current regression",
) -> WorkerExecutionResult:
    return WorkerExecutionResult(
        0,
        {
            "work_summary": "verification collected",
            "mandatory_gates": {
                **{
                    name: {"result": "PASS", "evidence": "evidence"}
                    for name in (
                        "permission_security",
                        "scope",
                        "requirements",
                        "automated_verification",
                        "contract_sync",
                        "critical_findings",
                    )
                },
                "tdd": {
                    "result": "PASS",
                    "evidence": "red green refactor",
                    "effective_policy": "REQUIRED",
                    "reason": None,
                    "reused_evidence": None,
                    "current_verification_evidence": "current regression",
                },
            },
            "verification": [
                {
                    "item": "regression",
                    "result": verification_result,
                    "evidence": evidence,
                }
            ],
            "decision": "PASS" if verification_result == "PASS" else "RETRY",
            "remaining_issues": [],
            "final_status": "PASS" if verification_result == "PASS" else "FAILED",
            "quality_score": 90,
        },
    )


class VerifierResultCollectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        verifier_runtime = mock.Mock()
        verifier_runtime.environment_for.return_value = {}
        self.runner = TaskRunner(
            common_prompt="requirements",
            request=HarnessRequest("plan-01"),
            worker_settings_by_task={1: TaskWorkerSettings((), {})},
            codex_executable="codex",
            project_root=self.root,
            verifier_runtime=verifier_runtime,
            evidence_store=TaskEvidenceStore(self.root / "records"),
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_collects_in_progress_result_without_restarting_verifier(self) -> None:
        responses = [
            worker_result("NOT_RUN", "shell session is still running"),
            worker_result(),
        ]
        requests: list[object] = []

        def execute(request: object) -> WorkerExecutionResult:
            requests.append(request)
            return responses.pop(0)

        with mock.patch(
            "harness_runner.execution.task_runner.execute_worker", side_effect=execute
        ):
            result = self.runner.run(TASK)

        self.assertEqual(result.status, "succeeded")
        self.assertEqual(len(requests), 2)
        self.assertIsNone(requests[0].verification_result_collection)
        self.assertEqual(requests[1].verification_result_collection["attempt"], 2)
        self.assertIsNone(requests[1].decision_correction)

    def test_stops_after_three_total_collection_attempts(self) -> None:
        requests: list[object] = []

        with mock.patch(
            "harness_runner.execution.task_runner.execute_worker",
            side_effect=lambda request: requests.append(request)
            or worker_result("NOT_RUN", "verifier running"),
        ):
            result = self.runner.run(TASK)

        self.assertEqual(len(requests), 3)
        self.assertEqual(result.status, "failed")
        self.assertIn("3회", result.message)

    def test_does_not_collect_terminal_or_unrelated_results(self) -> None:
        scenarios = (
            worker_result("FAIL", "tests failed"),
            worker_result("NOT_RUN", "worker did not start"),
            worker_result("PASS", ""),
        )
        for response in scenarios:
            with self.subTest(verification=response.output["verification"][0]):
                requests: list[object] = []
                with mock.patch(
                    "harness_runner.execution.task_runner.execute_worker",
                    side_effect=lambda request, response=response: requests.append(request)
                    or response,
                ):
                    result = self.runner.run(TASK)
                self.assertEqual(len(requests), 1)
                self.assertEqual(result.status, "failed")


if __name__ == "__main__":
    unittest.main()
