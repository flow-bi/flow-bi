from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch


HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
for scripts_root in (HARNESS_SCRIPTS, WORKER_SCRIPTS):
    if str(scripts_root) not in sys.path:
        sys.path.insert(0, str(scripts_root))

from harness_runner.execution.task_runner import TaskRunner
from harness_runner.models.plan import Task
from harness_runner.models.request import HarnessRequest
from worker_runner.worker_process import WorkerExecutionResult


def task() -> Task:
    return Task(1, "timing", (), ("implementation",), (), "implement", verification_items=("regression",), minimum_quality_score=85)


def output(result: str, evidence: str) -> dict[str, object]:
    gates = {name: {"result": "PASS", "evidence": "evidence"} for name in ("permission_security", "scope", "requirements", "tdd", "automated_verification", "contract_sync", "critical_findings")}
    gates["tdd"].update({"effective_policy": "REQUIRED", "current_verification_evidence": "current regression"})
    return {"work_summary": "done", "mandatory_gates": gates, "verification": [{"item": "regression", "result": result, "evidence": evidence}], "decision": "RETRY" if result == "NOT_RUN" else "PASS", "remaining_issues": [], "final_status": "PASS", "quality_score": 90}


def summary(run_id: str, duration_ms: int) -> dict[str, object]:
    return {"run_id": run_id, "task_number": 1, "area": "be-worker", "total_duration_ms": duration_ms, "unattributed_duration_ms": 0, "classification": {"explicit": True, "inferred": False}, "phases": []}


class Settings:
    config_overrides: tuple[str, ...] = ()
    environment: dict[str, str] = {}

    def __init__(self) -> None:
        self.attempt = 0

    @contextmanager
    def prepare_run(self):
        self.attempt += 1
        yield f"run-{self.attempt}", {}, ()


class TaskRunnerTimingTests(unittest.TestCase):
    def test_collection_preserves_each_run_with_its_purpose_and_attempt(self) -> None:
        settings = Settings()
        evidence = Mock()
        evidence.load_valid_evidence.return_value = None
        responses = iter((
            WorkerExecutionResult(0, output("NOT_RUN", "session is still running"), timing_summary=summary("run-1", 10), run_id="run-1"),
            WorkerExecutionResult(0, output("PASS", "completed"), timing_summary=summary("run-2", 20), run_id="run-2"),
        ))
        runtime = type("Runtime", (), {"environment_for": lambda _self, _number: {}})()
        with tempfile.TemporaryDirectory() as temporary, patch("harness_runner.execution.task_runner.execute_worker", side_effect=lambda _request: next(responses)):
            result = TaskRunner(
                common_prompt="common",
                request=HarnessRequest("timing-plan-01"),
                worker_settings_by_task={1: settings},
                codex_executable="codex",
                project_root=Path(temporary),
                verifier_runtime=runtime,
                evidence_store=evidence,
            ).run(task())

        self.assertEqual(result.status, "succeeded")
        self.assertEqual([(item.purpose, item.attempt, item.timing.run_id) for item in result.run_timings], [("task_execution", 1, "run-1"), ("verification_result_collection", 2, "run-2")])


if __name__ == "__main__":
    unittest.main()
