from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest import mock


HARNESS_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
for scripts_root in (HARNESS_SCRIPTS, WORKER_SCRIPTS):
    if str(scripts_root) not in sys.path:
        sys.path.insert(0, str(scripts_root))

from harness_runner.models import ExecutionReport, TaskResult, WorkerRunTiming
from harness_runner.models.plan import Task
from harness_runner import cli
from harness_runner.execution.task_runner import _task_result_from_worker_output
from harness_runner.results.report import build_execution_report
from harness_runner.results.timing import parse_timing_summary, timing_from_observation
from worker_runner.worker_process import WorkerExecutionResult


def summary(
    task_number: int,
    *,
    run_id: str | None = None,
    total_ms: int = 1_000,
    unattributed_ms: int = 100,
    phases: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    return {
        "run_id": run_id or f"run-{task_number}",
        "task_number": task_number,
        "area": "be-worker",
        "total_duration_ms": total_ms,
        "unattributed_duration_ms": unattributed_ms,
        "classification": {"explicit": True, "inferred": False},
        "phases": phases or [],
    }


def phase(
    name: str,
    duration_ms: int,
    *,
    tool_calls: int = 0,
    tool_duration_ms: int = 0,
) -> dict[str, object]:
    return {
        "phase": name,
        "duration_ms": duration_ms,
        "tool_calls": tool_calls,
        "tool_duration_ms": tool_duration_ms,
        "classification": {"explicit": True, "inferred": False},
    }


class TimingSummaryTests(unittest.TestCase):
    def test_valid_summary_converts_to_worker_timing(self) -> None:
        timing = parse_timing_summary(
            summary(2, phases=[phase("verification", 900, tool_calls=2, tool_duration_ms=1_500)]),
            2,
            "run-2",
        )

        self.assertEqual(timing.run_id, "run-2")
        self.assertEqual(timing.phases[0].phase, "verification")
        self.assertEqual(timing.phases[0].tool_duration_ms, 1_500)

    def test_invalid_summary_is_an_observation_error_not_a_worker_failure(self) -> None:
        invalid_values = (
            summary(1, run_id="old-run"),
            {**summary(1), "task_number": 2},
            {**summary(1), "area": "parent"},
            {**summary(1), "total_duration_ms": True},
            {**summary(1), "classification": {"explicit": 1, "inferred": False}},
            {**summary(1), "phases": [phase("unknown", 1)]},
        )
        for payload in invalid_values:
            with self.subTest(payload=payload):
                timing, error = timing_from_observation(payload, 1, "run-1")
                self.assertIsNone(timing)
                self.assertIn("Worker timing 관측 실패", error)


class TaskTimingPropagationTests(unittest.TestCase):
    def test_worker_timing_is_preserved_for_every_task_outcome(self) -> None:
        task = Task(1, "timed", (), ("backend",), (), "implement")
        observation = WorkerExecutionResult(
            0,
            None,
            timing_summary=summary(1),
            run_id="run-1",
        )

        for status, timed_out in (
            ("succeeded", False),
            ("failed", False),
            ("failed", True),
        ):
            with self.subTest(status=status, timed_out=timed_out):
                result = _task_result_from_worker_output(
                    task,
                    status,
                    124 if timed_out else 0,
                    timed_out,
                    "timeout" if timed_out else "",
                    None,
                    worker_observation=observation,
                )
                self.assertEqual(result.status, status)
                self.assertEqual(result.timed_out, timed_out)
                self.assertEqual(result.timing.run_id, "run-1")

    def test_invalid_timing_does_not_change_task_outcome(self) -> None:
        task = Task(1, "failed", (), ("backend",), (), "implement")
        observation = WorkerExecutionResult(
            3,
            None,
            timing_summary={**summary(1), "total_duration_ms": False},
            run_id="run-1",
        )
        result = _task_result_from_worker_output(
            task,
            "failed",
            3,
            False,
            "Worker 종료 코드 3",
            None,
            worker_observation=observation,
        )

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.return_code, 3)
        self.assertIsNone(result.timing)
        self.assertIn("Worker timing 관측 실패", result.timing_observation_error)


class HarnessTimeReportTests(unittest.TestCase):
    def test_task_detail_keeps_every_run_and_aggregates_phases_once(self) -> None:
        initial = parse_timing_summary(summary(1, run_id="main", total_ms=100, phases=[phase("test_code", 30)]), 1)
        collection = parse_timing_summary(summary(1, run_id="collection", total_ms=50, phases=[phase("verification", 20)]), 1)
        result = TaskResult(
            1, "timed", "succeeded",
            run_timings=(
                WorkerRunTiming("task_execution", 1, initial),
                WorkerRunTiming("verification_result_collection", 2, collection),
            ),
        )
        body = build_execution_report("timing-plan", ExecutionReport((result,))).body

        self.assertIn("| 1 | timed | PASS | 0.15초 (150ms) | 100.0%", body)
        self.assertIn("task_execution #1 | be-worker / main", body)
        self.assertIn("verification_result_collection #2 | be-worker / collection", body)
        self.assertIn("| test_code | 0.03초 (30ms)", body)
        self.assertIn("| verification | 0.02초 (20ms)", body)

    def test_report_aggregates_success_failure_timeout_and_keeps_missing_unrecorded(self) -> None:
        first = parse_timing_summary(summary(
            1,
            total_ms=60_000,
            unattributed_ms=10_000,
            phases=[phase("analysis", 50_000)],
        ), 1)
        second = parse_timing_summary(summary(
            2,
            total_ms=40_000,
            unattributed_ms=5_000,
            phases=[phase("implementation", 35_000, tool_calls=2, tool_duration_ms=70_000)],
        ), 2)
        third = parse_timing_summary(summary(3, total_ms=0, unattributed_ms=0), 3)
        rendered = build_execution_report("timing-plan", ExecutionReport((
            TaskResult(4, "blocked", "blocked"),
            TaskResult(2, "failed", "failed", timing=second),
            TaskResult(1, "success", "succeeded", timing=first),
            TaskResult(3, "timeout", "failed", timed_out=True, timing=third),
            TaskResult(5, "legacy", "succeeded", restored=True, timing_observation_error="malformed"),
        )))

        body = rendered.body
        self.assertLess(body.index("## 실행 메타데이터"), body.index("## Worker 시간 분석"))
        self.assertLess(body.index("## Worker 시간 분석"), body.index("## 최종 피드백"))
        self.assertIn("| 3개 | 2개 | 1분 40초 (100000ms) | 15초 (15000ms), 15.0% |", body)
        self.assertIn("| 1 | success | PASS | 1분 0초 (60000ms) | 60.0%", body)
        self.assertIn("| 2 | failed | FAILED | 40초 (40000ms) | 40.0%", body)
        self.assertIn("| 4 | blocked | BLOCKED | 미기록 |", body)
        self.assertIn("| 5 | legacy | PASS | 미기록 |", body)
        self.assertIn("| implementation | 35초 (35000ms) | 35.0% | 2회 | 1분 10초 (70000ms) | 명시 |", body)
        self.assertIn("| finalization | 미기록 | 미기록 | 미기록 | 미기록 | 미기록 |", body)
        self.assertIn("관측 상태: 오류 — malformed", body)
        self.assertIn("서로 더하거나 Worker 전체 시간에 가산하지 않습니다", body)
        self.assertNotIn("170000ms), 전체 Worker", body)

    def test_zero_duration_avoids_division_by_zero(self) -> None:
        zero = parse_timing_summary(summary(1, total_ms=0, unattributed_ms=0), 1)
        body = build_execution_report(
            "zero-plan",
            ExecutionReport((TaskResult(1, "zero", "succeeded", timing=zero),)),
        ).body

        self.assertIn("| 1개 | 0개 | 0초 (0ms) | 0초 (0ms), 분석 불가 |", body)
        self.assertIn("| be-worker | run-1 | 0초 (0ms) | 분석 불가", body)

    def test_all_missing_timing_is_not_reported_as_zero(self) -> None:
        body = build_execution_report(
            "missing-plan",
            ExecutionReport((
                TaskResult(1, "blocked", "blocked"),
                TaskResult(2, "legacy", "succeeded", restored=True),
            )),
        ).body

        self.assertIn("분석 불가 (timing 기록 없음)", body)
        self.assertNotIn("전체 Worker 시간 | 전체 미귀속 시간 |\n| --- | --- | --- | --- |\n| 0개 | 2개 | 0초", body)

    def test_cli_publishes_one_page_with_the_time_analysis(self) -> None:
        timing = parse_timing_summary(summary(1), 1)
        report = ExecutionReport((TaskResult(1, "timed", "succeeded", timing=timing),))
        request = type("Request", (), {"plan_id": "timing-plan"})()
        plan = type("Plan", (), {"tasks": ()})()
        prepared = type("Prepared", (), {"codex_executable": "codex"})()
        published = type("Published", (), {"page_url": "https://notion.example/report"})()

        with (
            mock.patch.object(cli, "load_requested_plan", return_value=(request, Path("plan.md"), plan)),
            mock.patch.object(cli, "prepare_execution", return_value=prepared),
            mock.patch.object(cli, "run_harness_execution", return_value=report),
            mock.patch.object(cli, "publish_report", return_value=published) as publish,
            mock.patch.object(
                cli,
                "complete_plan",
                return_value=cli.PROJECT_ROOT / "docs/plans/complete/timing-plan.md",
            ),
            mock.patch.object(cli, "_print_console"),
        ):
            self.assertEqual(cli.main(["request"]), 0)

        self.assertEqual(publish.call_count, 1)
        self.assertIn("## Worker 시간 분석", publish.call_args.args[1])
        self.assertIn("### 전체 phase 분석", publish.call_args.args[1])


if __name__ == "__main__":
    unittest.main()
