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
from harness_runner.models import ExecutionReport, HarnessRequest, ParsedPlan, Task, TaskInvocation, TaskResult
from harness_runner.parse import parse_invocation
from harness_runner.report import build_execution_report
from harness_runner import cli
from harness_runner import worker_gateway
from harness_runner.worker_gateway import parse_timing_summary
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


def worker_result(
    *,
    quality_score: object = 90,
    decision: str = "PASS",
    effective_tdd_policy: str = "REQUIRED",
    prior_evidence_id: str | None = None,
    fingerprint: str | None = None,
) -> object:
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
    response = Result()
    tdd_gate = {
        "effective_policy": effective_tdd_policy,
        "current_verification_evidence": "current regression",
    }
    if effective_tdd_policy == "REUSE_ALLOWED":
        tdd_gate["reused_evidence"] = {
            "record_id": prior_evidence_id,
            "fingerprint": fingerprint,
        }
    response.output["mandatory_gates"]["tdd"].update(tdd_gate)
    return response


def in_progress_not_run_result(*, evidence: str = "shell session is still running") -> object:
    response = worker_result(decision="RETRY")
    response.output["verification"][0] = {
        "item": "regression",
        "result": "NOT_RUN",
        "evidence": evidence,
    }
    return response


def timing(
    task_number: int,
    *,
    total_ms: int,
    unattributed_ms: int = 0,
    phases: list[dict[str, object]] | None = None,
) -> object:
    return parse_timing_summary({
        "run_id": f"run-{task_number}",
        "task_number": task_number,
        "area": "be-worker",
        "total_duration_ms": total_ms,
        "unattributed_duration_ms": unattributed_ms,
        "classification": {"explicit": True, "inferred": False},
        "phases": phases or [],
    }, task_number)


def phase(name: str, duration_ms: int, *, tool_calls: int = 0, tool_duration_ms: int = 0) -> dict[str, object]:
    return {
        "phase": name,
        "duration_ms": duration_ms,
        "tool_calls": tool_calls,
        "tool_duration_ms": tool_duration_ms,
        "classification": {"explicit": True, "inferred": False},
    }


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
            lambda invocation: calls.append(invocation.task.number) or worker_result(
                effective_tdd_policy=invocation.execution_context.effective_tdd_policy,
                prior_evidence_id=invocation.execution_context.prior_evidence_id,
                fingerprint=invocation.execution_context.fingerprint,
            ),
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
        original = revision_fingerprint(
            self.root, self.request.plan_id, task(1), "original common prompt"
        )
        changed = revision_fingerprint(
            self.root, self.request.plan_id, task(1), "changed by another task"
        )

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
        fingerprint = revision_fingerprint(self.root, self.request.plan_id, task(1), self.plan.common_prompt)
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

    def test_worker_timing_is_preserved_for_success_failure_and_timeout_reports(self) -> None:
        def timed_result(invocation: object) -> object:
            response = worker_result()
            response.timing = parse_timing_summary({
                "run_id": f"run-{invocation.task.number}",
                "task_number": invocation.task.number,
                "area": "be-worker",
                "total_duration_ms": 2500,
                "unattributed_duration_ms": 400,
                "classification": {"explicit": True, "inferred": True},
                "phases": [{
                    "phase": "implementation", "duration_ms": 2100,
                    "tool_calls": 2, "tool_duration_ms": 900,
                    "classification": {"explicit": True, "inferred": False},
                }],
            }, invocation.task.number)
            if invocation.task.number == 2:
                response.returncode = 1
            return response

        report = execute_workers(
            ParsedPlan("requirements", (task(1), task(2))), self.request, timed_result,
            project_root=self.root, record_store=self.store,
        )
        rendered = build_execution_report("rerun-plan-01", report)

        self.assertEqual(report.results[0].timing.run_id, "run-1")
        self.assertEqual(report.results[1].timing.run_id, "run-2")
        self.assertIn("| be-worker | run-1 | 2.5초 (2500ms) |", rendered.body)
        self.assertIn("| implementation | 2.1초 (2100ms) | 84.0% | 2회 | 0.9초 (900ms) | 명시 |", rendered.body)

    def test_blocked_and_legacy_tasks_render_timing_as_unrecorded(self) -> None:
        report = execute_workers(
            self.plan, self.request,
            lambda invocation: type("Failed", (), {"returncode": 1, "output": None, "output_error": "failed"})(),
            project_root=self.root, record_store=self.store,
        )
        rendered = build_execution_report("rerun-plan-01", report)

        self.assertEqual(report.results[0].timing, None)
        self.assertEqual(report.results[1].status, "blocked")
        self.assertEqual(rendered.body.count("| 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |"), 2)

    def test_timing_summary_rejects_another_task_run_without_changing_worker_outcome(self) -> None:
        with self.assertRaisesRegex(ValueError, "현재 Task"):
            parse_timing_summary({
                "run_id": "other-run", "task_number": 2, "area": "be-worker",
                "total_duration_ms": 1, "unattributed_duration_ms": 0,
                "classification": {"explicit": False, "inferred": True}, "phases": [],
            }, 1)

    def test_gateway_keeps_invalid_timing_separate_from_worker_result(self) -> None:
        invocation = TaskInvocation("common", "", task(1))
        raw = type("Raw", (), {
            "returncode": 1, "output": {"work_summary": "failed"}, "output_error": "exit",
            "timing_summary": {"run_id": "run-1", "task_number": 2},
        })()
        with (
            mock.patch.object(worker_gateway, "repository_root", return_value=self.root),
            mock.patch.object(worker_gateway, "parse_invocation", return_value=("prompt", (), ())),
            mock.patch.object(worker_gateway, "execute_worker", return_value=raw),
        ):
            result = worker_gateway.invoke_task(invocation)

        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.output, {"work_summary": "failed"})
        self.assertIsNone(result.timing)
        self.assertIn("관측 실패", result.timing_observation_error)

    def test_gateway_rejects_timing_from_a_different_worker_run(self) -> None:
        invocation = TaskInvocation("common", "", task(1))
        raw = type("Raw", (), {
            "returncode": 0, "output": {"work_summary": "completed"}, "output_error": "",
            "run_id": "current-run",
            "timing_summary": {
                "run_id": "previous-run", "task_number": 1, "area": "be-worker",
                "total_duration_ms": 1, "unattributed_duration_ms": 0,
                "classification": {"explicit": False, "inferred": True}, "phases": [],
            },
        })()
        with (
            mock.patch.object(worker_gateway, "repository_root", return_value=self.root),
            mock.patch.object(worker_gateway, "parse_invocation", return_value=("prompt", (), ())),
            mock.patch.object(worker_gateway, "execute_worker", return_value=raw),
        ):
            result = worker_gateway.invoke_task(invocation)

        self.assertIsNone(result.timing)
        self.assertIn("run_id", result.timing_observation_error)

    def test_gateway_attaches_timeout_timing_without_masking_timeout(self) -> None:
        invocation = TaskInvocation("common", "", task(1))
        timeout = __import__("subprocess").TimeoutExpired("codex", 90)
        timeout.timing_summary = {
            "run_id": "run-timeout", "task_number": 1, "area": "be-worker",
            "total_duration_ms": 90000, "unattributed_duration_ms": 1000,
            "classification": {"explicit": False, "inferred": True}, "phases": [],
        }
        with (
            mock.patch.object(worker_gateway, "repository_root", return_value=self.root),
            mock.patch.object(worker_gateway, "parse_invocation", return_value=("prompt", (), ())),
            mock.patch.object(worker_gateway, "execute_worker", side_effect=timeout),
            self.assertRaises(__import__("subprocess").TimeoutExpired) as raised,
        ):
            worker_gateway.invoke_task(invocation)

        self.assertEqual(raised.exception.timing.run_id, "run-timeout")
        self.assertEqual(raised.exception.timing.total_duration_ms, 90000)

    def test_execution_preserves_timeout_timing_in_the_report(self) -> None:
        timing = parse_timing_summary({
            "run_id": "run-timeout", "task_number": 1, "area": "be-worker",
            "total_duration_ms": 90000, "unattributed_duration_ms": 1000,
            "classification": {"explicit": False, "inferred": True}, "phases": [],
        }, 1)
        timeout = __import__("subprocess").TimeoutExpired("codex", 90)
        timeout.timing = timing

        report = execute_workers(
            ParsedPlan("requirements", (task(1),)), self.request,
            lambda _invocation: (_ for _ in ()).throw(timeout),
            project_root=self.root, record_store=self.store,
        )
        rendered = build_execution_report("rerun-plan-01", report)

        self.assertTrue(report.results[0].timed_out)
        self.assertEqual(report.results[0].timing, timing)
        self.assertIn("| be-worker | run-timeout |", rendered.body)

    def test_report_distinguishes_success_failure_timeout_blocked_and_legacy_timing(self) -> None:
        timing = parse_timing_summary({
            "run_id": "run-current", "task_number": 1, "area": "fe-worker",
            "total_duration_ms": 1000, "unattributed_duration_ms": 0,
            "classification": {"explicit": True, "inferred": True},
            "phases": [{"phase": "analysis", "duration_ms": 1000, "tool_calls": 0,
                        "tool_duration_ms": 0, "classification": {"explicit": False, "inferred": True}}],
        }, 1)
        rendered = build_execution_report("timing-plan", ExecutionReport((
            TaskResult(2, "failure", "failed", timing=timing),
            TaskResult(5, "legacy", "succeeded"),
            TaskResult(3, "timeout", "failed", timed_out=True),
            TaskResult(4, "blocked", "blocked"),
            TaskResult(1, "success", "succeeded", timing=timing),
        )))

        self.assertLess(rendered.body.index("### Task 1."), rendered.body.index("### Task 2."))
        self.assertEqual(rendered.body.count("| 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |"), 3)
        self.assertIn("Task 3. timeout\n- 상태: FAILED", rendered.body)
        self.assertIn("Task 4. blocked\n- 상태: BLOCKED", rendered.body)

    def test_report_aggregates_worker_time_and_canonical_phases(self) -> None:
        rendered = build_execution_report("timing-plan", ExecutionReport((
            TaskResult(2, "failure", "failed", timing=timing(
                2, total_ms=10_000, unattributed_ms=2_000,
                phases=[phase("implementation", 5_000, tool_calls=2, tool_duration_ms=7_000)],
            )),
            TaskResult(1, "success", "succeeded", timing=timing(
                1, total_ms=61_500, unattributed_ms=1_500,
                phases=[phase("analysis", 30_000), phase("implementation", 30_000)],
            )),
            TaskResult(3, "blocked", "blocked"),
            TaskResult(4, "legacy", "succeeded", timing_observation_error="summary malformed"),
        )))

        self.assertIn("## Worker 시간 분석", rendered.body)
        self.assertLess(rendered.body.index("### 실행 시간 요약"), rendered.body.index("### Task별 소요 시간"))
        self.assertLess(rendered.body.index("### Task별 소요 시간"), rendered.body.index("### 전체 phase 분석"))
        self.assertLess(rendered.body.index("### 전체 phase 분석"), rendered.body.index("### 해석 메모"))
        self.assertIn("| timing 기록 Task | timing 미기록 Task | 전체 Worker 시간 | 전체 미귀속 시간 |", rendered.body)
        self.assertIn("| 2개 | 2개 | 1분 11.5초 (71500ms) | 3.5초 (3500ms), 4.9% |", rendered.body)
        self.assertIn("| Task 번호 | 제목 | 실행 상태 | Worker 시간 | 전체 대비 | 미귀속 시간 | Task 대비 | timing 분류 |", rendered.body)
        self.assertIn("| 1 | success | PASS | 1분 1.5초 (61500ms) | 86.0% | 1.5초 (1500ms) | 2.4% | 명시 |", rendered.body)
        self.assertIn("| 3 | blocked | BLOCKED | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |", rendered.body)
        self.assertIn("| phase | 소요 시간 | 전체 Worker 시간 대비 | tool 호출 수 | tool 실행 시간 | 분류 |", rendered.body)
        self.assertIn("| analysis | 30초 (30000ms) | 42.0% | 0회 | 0초 (0ms) | 명시 |", rendered.body)
        self.assertIn("| implementation | 35초 (35000ms) | 49.0% | 2회 | 7초 (7000ms) | 명시 |", rendered.body)
        self.assertIn("| finalization | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |", rendered.body)
        self.assertLess(rendered.body.index("| analysis |"), rendered.body.index("| implementation |"))
        self.assertLess(rendered.body.index("| implementation |"), rendered.body.index("| finalization |"))
        self.assertNotIn("78000ms), 전체 시간", rendered.body)

    def test_report_renders_task_ratios_missing_phases_and_zero_timing(self) -> None:
        rendered = build_execution_report("timing-plan", ExecutionReport((
            TaskResult(1, "zero", "succeeded", timing=timing(1, total_ms=0)),
            TaskResult(2, "observed", "failed", timed_out=True, timing=timing(
                2, total_ms=1_000, unattributed_ms=250,
                phases=[phase("verification", 750, tool_calls=3, tool_duration_ms=2_000)],
            )),
            TaskResult(3, "missing", "blocked", timing_observation_error="collector failed"),
        )))

        self.assertIn("| 2개 | 1개 | 1초 (1000ms) | 0.25초 (250ms), 25.0% |", rendered.body)
        self.assertIn("| verification | 0.75초 (750ms) | 75.0% | 3회 | 2초 (2000ms) | 명시 |", rendered.body)
        task_one = rendered.body[rendered.body.index("### Task 1."):rendered.body.index("### Task 2.")]
        self.assertIn("| Area | Run ID | Worker 시간 | 전체 대비 | 미귀속 시간 | Task 대비 | timing 분류 |", task_one)
        self.assertIn("| be-worker | run-1 | 0초 (0ms) | 0.0% | 0초 (0ms) | 분석 불가 | 명시 |", task_one)
        self.assertIn("| analysis | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |", task_one)
        task_two = rendered.body[rendered.body.index("### Task 2."):rendered.body.index("### Task 3.")]
        self.assertIn("| be-worker | run-2 | 1초 (1000ms) | 100.0% | 0.25초 (250ms) | 25.0% | 명시 |", task_two)
        self.assertIn("| verification | 0.75초 (750ms) | 75.0% | 3회 | 2초 (2000ms) | 명시 |", task_two)
        self.assertIn("tool 실행 시간은 phase 경계를 걸쳐 중복될 수 있으며, phase.duration_ms와 서로 더하거나 Worker 전체 시간에 가산하지 않습니다.", rendered.body)
        self.assertIn("관측 상태: 오류 — collector failed", rendered.body)

    def test_report_marks_analysis_unavailable_when_every_timing_is_missing(self) -> None:
        rendered = build_execution_report("timing-plan", ExecutionReport((
            TaskResult(1, "blocked", "blocked"),
            TaskResult(2, "legacy", "succeeded"),
        )))

        self.assertIn("| 0개 | 2개 | 분석 불가 (timing 기록 없음) | 분석 불가 (timing 기록 없음) |", rendered.body)
        self.assertIn("| analysis | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |", rendered.body)

    def test_report_avoids_division_by_zero_for_recorded_zero_duration(self) -> None:
        rendered = build_execution_report("timing-plan", ExecutionReport((
            TaskResult(1, "zero", "succeeded", timing=timing(1, total_ms=0)),
        )))

        self.assertIn("| 1개 | 0개 | 0초 (0ms) | 0초 (0ms), 분석 불가 |", rendered.body)
        self.assertIn("| be-worker | run-1 | 0초 (0ms) | 분석 불가 | 0초 (0ms) | 분석 불가 | 명시 |", rendered.body)

    def test_cli_publishes_the_rendered_time_analysis_without_changing_page_policy(self) -> None:
        report = ExecutionReport((TaskResult(1, "timed", "succeeded", timing=timing(1, total_ms=1)),))
        published = type("Published", (), {"page_url": "https://notion.example/page"})()
        verifier = mock.MagicMock()
        verifier.__enter__.return_value = verifier
        verifier.__exit__.return_value = False
        verifier.environment = {}
        verifier.environment_for_task.return_value = {}
        with (
            mock.patch.object(cli, "parse_invocation", return_value=HarnessRequest("timing-plan")),
            mock.patch.object(cli, "repository_root", return_value=self.root),
            mock.patch.object(cli, "load_active_plan", return_value=(self.root / "plan.md", self.plan)),
            mock.patch.object(cli, "BackendVerifier", return_value=verifier),
            mock.patch.object(cli, "FrontendVerifier", return_value=verifier),
            mock.patch.object(cli, "execute_workers", return_value=report),
            mock.patch.object(cli, "publish_report", return_value=published) as publish,
            mock.patch.object(cli, "complete_plan", return_value=self.root / "done.md"),
        ):
            self.assertEqual(cli.main(["request"]), 0)

        self.assertEqual(publish.call_count, 1)
        self.assertEqual(publish.call_args.kwargs["project_root"], self.root)
        self.assertIn("## Worker 시간 분석\n### 실행 시간 요약", publish.call_args.args[1])
        self.assertIn("### 해석 메모", publish.call_args.args[1])

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

    def test_in_progress_not_run_collects_existing_verifier_result_without_reexecution(self) -> None:
        calls: list[object] = []

        def invoke(invocation: object) -> object:
            calls.append(invocation)
            return in_progress_not_run_result() if len(calls) == 1 else worker_result()

        report = execute_workers(
            ParsedPlan("requirements", (task(1),)),
            self.request,
            invoke,
            project_root=self.root,
            record_store=self.store,
        )

        self.assertTrue(report.succeeded)
        self.assertEqual(len(calls), 2)
        self.assertIsNone(calls[1].decision_correction)
        self.assertIsNotNone(calls[1].verification_result_collection)
        self.assertEqual(calls[1].verification_result_collection["attempt"], 2)

    def test_in_progress_not_run_stops_after_three_total_attempts(self) -> None:
        calls: list[object] = []

        report = execute_workers(
            ParsedPlan("requirements", (task(1),)),
            self.request,
            lambda invocation: calls.append(invocation) or in_progress_not_run_result(),
            project_root=self.root,
            record_store=self.store,
        )

        self.assertEqual(len(calls), 3)
        self.assertEqual(report.results[0].status, "failed")
        self.assertIn("3회", report.results[0].message)

    def test_final_failure_non_pending_not_run_and_evidenceless_pass_do_not_collect(self) -> None:
        final_failure = worker_result()
        final_failure.output["verification"][0]["result"] = "FAIL"
        unrelated_not_run = in_progress_not_run_result(evidence="worker did not start")
        evidenceless_pass = worker_result()
        evidenceless_pass.output["verification"][0]["evidence"] = ""

        for response in (final_failure, unrelated_not_run, evidenceless_pass):
            with self.subTest(response=response.output["verification"][0]):
                calls: list[object] = []
                report = execute_workers(
                    ParsedPlan("requirements", (task(1),)),
                    self.request,
                    lambda invocation, response=response: calls.append(invocation) or response,
                    project_root=self.root,
                    record_store=ExecutionRecordStore(self.root / f"records-{id(response)}"),
                )

                self.assertEqual(len(calls), 1)
                self.assertEqual(report.results[0].status, "failed")


class InvocationParsingTests(unittest.TestCase):
    def test_parses_from_task_option_without_forwarding_it_to_worker(self) -> None:
        request = parse_invocation(
            "$harness-exec calendar-01 --from-task 7 인증 만료 흐름을 검증해줘"
        )

        self.assertEqual(request.plan_id, "calendar-01")
        self.assertEqual(request.start_task_number, 7)
        self.assertEqual(request.additional_request, "인증 만료 흐름을 검증해줘")


if __name__ == "__main__":
    unittest.main()
