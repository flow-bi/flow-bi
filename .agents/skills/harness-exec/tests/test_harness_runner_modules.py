from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.evidence import ExecutionRecordStore, revision_fingerprint
from harness_runner.execution import execute_workers
from harness_runner.models import HarnessRequest, ParsedPlan, Task
from harness_runner.worker_result import completion_error, needs_decision_correction
from harness_runner.invocation import parse_invocation
from harness_runner.state import PlanStateStore, StateRecordError


def task(number: int, *, prerequisites: tuple[int, ...] = ()) -> Task:
    return Task(
        number=number,
        title=f"Task {number}",
        prerequisite_numbers=prerequisites,
        allowed_paths=("implementation", "tests"),
        forbidden_paths=(),
        task_prompt="requirements",
        implementation_items=("implement",),
        verification_items=("regression",),
        minimum_quality_score=90,
    )


def worker_result(*, quality_score: object = 90, decision: str = "PASS") -> object:
    class Result:
        returncode = 0
        output_error = ""
        output = {
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
            "quality_score": quality_score,
        }

    return Result()


class RevisionEvidenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "implementation").mkdir()
        (self.root / "tests").mkdir()
        (self.root / "implementation" / "feature.py").write_text("value = 1\n", encoding="utf-8")
        (self.root / "tests" / "test_feature.py").write_text("assert True\n", encoding="utf-8")
        self.plan = ParsedPlan("requirements", (task(1), task(2, prerequisites=(1,))))
        self.request = HarnessRequest("rerun-plan-01")
        self.store = ExecutionRecordStore(self.root / "records")
        self.state_store = PlanStateStore(self.root / "docs" / "plans" / "state")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_worker_result_contract_keeps_explicit_failure_and_correction_boundaries(self) -> None:
        failed = worker_result(decision="FAILED")
        corrected = worker_result(decision="PASS_WITH_FOLLOW_UP")

        self.assertIn("Worker 판정", completion_error(task(1), failed))
        self.assertFalse(needs_decision_correction(task(1), failed))
        self.assertTrue(needs_decision_correction(task(1), corrected))

    def test_same_fingerprint_reuses_complete_evidence_but_runs_current_regression(self) -> None:
        calls: list[object] = []
        first = execute_workers(self.plan, self.request, lambda invocation: calls.append(invocation) or worker_result(), project_root=self.root, record_store=self.store)
        second = execute_workers(self.plan, self.request, lambda invocation: calls.append(invocation) or worker_result(), project_root=self.root, record_store=self.store)

        self.assertTrue(first.succeeded)
        self.assertTrue(second.succeeded)
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(result.restored for result in second.results))

    def test_resume_restores_succeeded_predecessor_and_retries_failed_task(self) -> None:
        calls: list[int] = []

        def fail_second(invocation: object) -> object:
            calls.append(invocation.task.number)
            if invocation.task.number == 2:
                return type("Failed", (), {"returncode": 1, "output": None, "output_error": "test failure"})()
            return worker_result()

        first = execute_workers(self.plan, self.request, fail_second, project_root=self.root, record_store=self.store, state_store=self.state_store)
        second = execute_workers(self.plan, self.request, lambda invocation: calls.append(invocation.task.number) or worker_result(), project_root=self.root, record_store=self.store, state_store=self.state_store)

        self.assertEqual([result.status for result in first.results], ["succeeded", "failed"])
        self.assertEqual(calls, [1, 2, 2])
        self.assertTrue(second.results[0].restored)
        self.assertFalse(second.results[1].restored)
        state = self.state_store.load(self.request.plan_id, self.plan.tasks)
        self.assertEqual(state["01"]["task1"], {"status": "succeeded"})
        self.assertEqual(state["01"]["task2"], {"status": "succeeded"})

    def test_feature_state_uses_one_root_object_and_preserves_parallel_updates(self) -> None:
        other = HarnessRequest("rerun-plan-02")
        self.state_store.update(self.request.plan_id, task(1), "succeeded")
        self.state_store.update(self.request.plan_id, task(2), "failed", reason="test failure")
        self.state_store.update(other.plan_id, task(1), "pending")

        path = self.state_store.path_for(self.request.plan_id)
        import json
        document = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(document, {
            "01": {"task1": {"status": "succeeded"}, "task2": {"status": "failed", "reason": "test failure"}},
            "02": {"task1": {"status": "pending"}},
        })

    def test_state_store_returns_only_the_current_plan_task_records(self) -> None:
        other = HarnessRequest("rerun-plan-02")
        self.state_store.update(self.request.plan_id, task(1), "succeeded")
        self.state_store.update(other.plan_id, task(1), "pending")

        records = self.state_store.load_task_records(self.request.plan_id, self.plan.tasks)

        self.assertEqual(records, {"task1": {"status": "succeeded"}})

    def test_blocking_descendants_survives_state_write_failure(self) -> None:
        failed_plan = ParsedPlan("requirements", (task(1), task(2, prerequisites=(1,))))
        with mock.patch.object(self.state_store, "update", side_effect=StateRecordError("disk full")):
            report = execute_workers(
                failed_plan,
                self.request,
                call_worker=lambda _: type("Failed", (), {"returncode": 1, "output": None, "output_error": "failure"})(),
                project_root=self.root,
                record_store=self.store,
                state_store=self.state_store,
            )

        self.assertEqual([result.status for result in report.results], ["failed", "blocked"])

    def test_state_schema_rejects_invalid_json_and_reason_rules(self) -> None:
        path = self.state_store.path_for(self.request.plan_id)
        path.parent.mkdir(parents=True)
        path.write_text("[]", encoding="utf-8")
        with self.assertRaises(StateRecordError):
            self.state_store.load(self.request.plan_id, self.plan.tasks)
        path.write_text('{"01":{"task1":{"status":"failed"}}}', encoding="utf-8")
        with self.assertRaises(StateRecordError):
            self.state_store.load(self.request.plan_id, self.plan.tasks)
        with self.assertRaises(ValueError):
            self.state_store.update(self.request.plan_id, task(1), "succeeded", reason="evidence")

    def test_from_task_reuses_prior_pass_records_without_invoking_earlier_workers(self) -> None:
        execute_workers(
            self.plan,
            self.request,
            lambda _: worker_result(),
            project_root=self.root,
            record_store=self.store,
        )
        calls: list[int] = []

        report = execute_workers(
            self.plan,
            HarnessRequest("rerun-plan-01", start_task_number=2),
            lambda invocation: calls.append(invocation.task.number) or worker_result(),
            project_root=self.root,
            record_store=self.store,
        )

        self.assertTrue(report.succeeded)
        self.assertEqual(calls, [2])
        self.assertEqual(report.results[0].status, "succeeded")
        self.assertIn("이전 PASS 실행 기록", report.results[0].work_summary)

    def test_from_task_requires_trusted_prior_pass_records(self) -> None:
        report = execute_workers(
            self.plan,
            HarnessRequest("rerun-plan-01", start_task_number=2),
            lambda _: worker_result(),
            project_root=self.root,
            record_store=self.store,
        )

        self.assertEqual(report.results[0].status, "failed")
        self.assertIn("PASS 실행 기록", report.results[0].message)
        self.assertEqual(report.results[1].status, "blocked")
    def test_implementation_change_reuses_tdd_evidence_and_runs_current_regression(self) -> None:
        execute_workers(self.plan, self.request, lambda _: worker_result(), project_root=self.root, record_store=self.store)
        (self.root / "implementation" / "feature.py").write_text("value = 2\n", encoding="utf-8")
        contexts: list[object] = []
        execute_workers(self.plan, self.request, lambda invocation: contexts.append(invocation.execution_context) or worker_result(), project_root=self.root, record_store=self.store)

        self.assertEqual(contexts, [])

    def test_other_task_or_common_prompt_change_does_not_invalidate_task_evidence(self) -> None:
        original = revision_fingerprint(self.request.plan_id, task(1))
        changed = revision_fingerprint(self.request.plan_id, task(1))

        self.assertEqual(original, changed)

    def test_task_contract_change_does_not_reuse_evidence(self) -> None:
        execute_workers(self.plan, self.request, lambda _: worker_result(), project_root=self.root, record_store=self.store)
        changed_task = Task(
            number=1,
            title="Task 1",
            prerequisite_numbers=(),
            allowed_paths=("implementation", "tests"),
            forbidden_paths=(),
            task_prompt="changed requirements",
            implementation_items=("implement",),
            verification_items=("regression",),
            minimum_quality_score=90,
        )
        contexts: list[object] = []
        execute_workers(
            ParsedPlan("requirements", (changed_task,)),
            self.request,
            lambda invocation: contexts.append(invocation.execution_context) or worker_result(),
            project_root=self.root,
            record_store=self.store,
        )

        self.assertEqual(contexts, [])

    def test_corrupt_record_is_not_reused_and_blocks_dependent_task(self) -> None:
        fingerprint = revision_fingerprint(self.request.plan_id, task(1))
        record_path = self.store.path_for(self.request.plan_id, 1)
        record_path.parent.mkdir(parents=True)
        record_path.write_text('{"fingerprint": "' + fingerprint + '"}', encoding="utf-8")

        report = execute_workers(self.plan, self.request, lambda _: worker_result(), project_root=self.root, record_store=self.store)

        self.assertEqual(report.results[0].status, "failed")
        self.assertIn("HUMAN_REVIEW_REQUIRED", report.results[0].message)
        self.assertEqual(report.results[1].status, "blocked")

    def test_record_write_is_atomic_and_does_not_touch_active_plan(self) -> None:
        active_plan = self.root / "docs" / "plans" / "active" / "rerun-plan.md"
        active_plan.parent.mkdir(parents=True)
        active_plan.write_text("unchanged", encoding="utf-8")

        report = execute_workers(self.plan, self.request, lambda _: worker_result(), project_root=self.root, record_store=self.store)

        self.assertTrue(report.succeeded)
        self.assertEqual(active_plan.read_text(encoding="utf-8"), "unchanged")
        self.assertTrue(self.store.path_for(self.request.plan_id, 1).exists())
        self.assertFalse(list(self.store.root.glob("*.tmp")))

    def test_record_write_failure_is_an_explicit_task_failure(self) -> None:
        with mock.patch.object(self.store, "save", side_effect=OSError("disk full")):
            report = execute_workers(
                ParsedPlan("requirements", (task(1),)),
                self.request,
                lambda _: worker_result(),
                project_root=self.root,
                record_store=self.store,
            )

        self.assertEqual(report.results[0].status, "failed")
        self.assertIn("실행 기록 저장 실패", report.results[0].message)

    def test_nonstandard_success_decision_is_corrected_once_and_unblocks_dependents(self) -> None:
        calls: list[object] = []

        def invoke(invocation: object) -> object:
            calls.append(invocation)
            return worker_result(
                decision="PASS_WITH_FOLLOW_UP" if len(calls) == 1 else "PASS"
            )

        report = execute_workers(self.plan, self.request, invoke, project_root=self.root, record_store=self.store)

        self.assertTrue(report.succeeded)
        self.assertEqual(len(calls), 3)
        correction = calls[1]
        self.assertIsNotNone(correction.decision_correction)
        self.assertEqual(correction.decision_correction["prior_decision"], "PASS_WITH_FOLLOW_UP")
        self.assertEqual(calls[2].task.number, 2)

    def test_repeated_nonstandard_success_decision_fails_and_blocks_dependents(self) -> None:
        calls: list[object] = []

        report = execute_workers(
            self.plan,
            self.request,
            lambda invocation: calls.append(invocation) or worker_result(decision="PASS_WITH_FOLLOW_UP"),
            project_root=self.root,
            record_store=self.store,
        )

        self.assertEqual(len(calls), 2)
        self.assertEqual(report.results[0].status, "failed")
        self.assertIn("판정 교정 후에도", report.results[0].message)
        self.assertEqual(report.results[1].status, "blocked")

    def test_correction_cannot_hide_a_quality_failure(self) -> None:
        calls: list[object] = []

        def invoke(invocation: object) -> object:
            calls.append(invocation)
            if len(calls) == 1:
                return worker_result(decision="PASS_WITH_FOLLOW_UP")
            return worker_result(quality_score=89, decision="PASS")

        report = execute_workers(self.plan, self.request, invoke, project_root=self.root, record_store=self.store)

        self.assertEqual(len(calls), 2)
        self.assertEqual(report.results[0].status, "failed")
        self.assertIn("quality_score가 최소 기준", report.results[0].message)
        self.assertEqual(report.results[1].status, "blocked")

    def test_objective_failure_and_worker_failure_do_not_request_decision_correction(self) -> None:
        failed_gate = worker_result(decision="PASS_WITH_FOLLOW_UP")
        failed_gate.output["mandatory_gates"]["scope"]["result"] = "FAIL"
        failed_verification = worker_result(decision="PASS_WITH_FOLLOW_UP")
        failed_verification.output["verification"][0]["result"] = "FAIL"
        failed_quality = worker_result(quality_score=89, decision="PASS_WITH_FOLLOW_UP")
        worker_error = type("Result", (), {"returncode": 1, "output": None, "output_error": ""})()

        for result in (
            failed_gate,
            failed_verification,
            failed_quality,
            worker_error,
            worker_result(decision="FAILED"),
        ):
            calls: list[object] = []
            report = execute_workers(
                ParsedPlan("requirements", (task(1),)),
                self.request,
                lambda invocation, response=result: calls.append(invocation) or response,
                project_root=self.root,
                record_store=ExecutionRecordStore(self.root / f"records-{len(calls)}-{id(result)}"),
            )
            self.assertEqual(len(calls), 1)
            self.assertEqual(report.results[0].status, "failed")


class InvocationParsingTests(unittest.TestCase):
    def test_rejects_missing_harness_exec_prefix(self) -> None:
        from harness_runner.models import PlanValidationError

        with self.assertRaises(PlanValidationError):
            parse_invocation("calendar-01 --from-task 2")

    def test_rejects_zero_from_task(self) -> None:
        from harness_runner.models import PlanValidationError

        with self.assertRaises(PlanValidationError):
            parse_invocation("$harness-exec calendar-01 --from-task 0")

    def test_parses_from_task_option_without_forwarding_it_to_worker(self) -> None:
        request = parse_invocation(
            "$harness-exec calendar-01 --from-task 7 인증 만료 흐름을 검증해줘"
        )

        self.assertEqual(request.plan_id, "calendar-01")
        self.assertEqual(request.start_task_number, 7)
        self.assertEqual(request.additional_request, "인증 만료 흐름을 검증해줘")


if __name__ == "__main__":
    unittest.main()
