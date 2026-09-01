from __future__ import annotations

from pathlib import Path
import sys
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.execution.task_runner import _worker_completion_error
from harness_runner.models import Task
from harness_runner.planning.parser import parse_plan_text


TASK = Task(1, "quality", (), (), (), "", (), ("verification",), 90)


def context(policy: str = "REQUIRED") -> dict[str, object]:
    return {
        "plan_id": "plan-01",
        "fingerprint": "fingerprint",
        "mode": "new_or_changed",
        "prior_tdd_evidence": None,
        "prior_evidence_id": None,
        "effective_tdd_policy": policy,
    }


def result(
    score: object,
    *,
    policy: str = "REQUIRED",
    tdd_result: str = "PASS",
    reason: str | None = None,
    reused_evidence: dict[str, object] | None = None,
) -> object:
    tdd = {
        "result": tdd_result,
        "evidence": "tdd evidence",
        "effective_policy": policy,
        "reason": reason,
        "reused_evidence": reused_evidence,
        "current_verification_evidence": "current regression",
    }

    class Result:
        returncode = 0
        output_error = ""
        output = {
            "work_summary": "quality contract verified",
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
                "tdd": tdd,
            },
            "verification": [
                {"item": "verification", "result": "PASS", "evidence": "proof"}
            ],
            "decision": "PASS",
            "quality_score": score,
            "remaining_issues": [],
            "final_status": "PASS",
        }

    return Result()


class CompletionTests(unittest.TestCase):
    def test_plan_parser_extracts_paths_quality_and_tdd_policy(self) -> None:
        plan = parse_plan_text("""# Harness
## 2. 실행 Task
### Task 1. parser boundary
#### 선행 Task
- 없음
#### TDD 정책
- REGRESSION_ONLY
#### 수정 가능 경로
- `scripts/harness_runner`
#### 수정 금지 경로
- `docs/plans/active`
#### 구현 항목
- separate parser
#### 검증 항목
- parser test
#### 완료 조건
- `quality_score`가 85 이상이어야 한다.
## 3. 전체 완료 조건
### Task 2. ignored
""")

        parsed_task = plan.tasks[0]
        self.assertEqual(len(plan.tasks), 1)
        self.assertEqual(parsed_task.allowed_paths, ("scripts/harness_runner",))
        self.assertEqual(parsed_task.read_only_paths, ("docs/plans/active",))
        self.assertEqual(parsed_task.minimum_quality_score, 85)
        self.assertEqual(parsed_task.tdd_policy, "REGRESSION_ONLY")

    def test_rejects_missing_and_invalid_tdd_policy(self) -> None:
        for policy_section in ("", "#### TDD 정책\n- REUSE_ALLOWED"):
            with self.subTest(policy_section=policy_section):
                with self.assertRaisesRegex(ValueError, "TDD 정책"):
                    parse_plan_text(f"""## 2. 실행 Task
### Task 1. policy
{policy_section}
#### 검증 항목
- verification
""")

    def test_rejects_below_missing_and_non_integer_quality_score(self) -> None:
        for score in (89, None, "90", True):
            with self.subTest(score=score):
                self.assertIn(
                    "quality_score",
                    _worker_completion_error(TASK, result(score), context()),
                )

    def test_accepts_quality_score_at_or_above_minimum(self) -> None:
        self.assertEqual(
            _worker_completion_error(TASK, result(90), context()), ""
        )
        self.assertEqual(
            _worker_completion_error(TASK, result(100), context()), ""
        )

    def test_tdd_policies_require_distinct_evidence(self) -> None:
        scenarios = (
            (Task(1, "required", (), (), (), "", (), ("verification",), 90, "REQUIRED"), result(90), context(), ""),
            (Task(1, "regression", (), (), (), "", (), ("verification",), 90, "REGRESSION_ONLY"), result(90, policy="REGRESSION_ONLY"), context("REGRESSION_ONLY"), ""),
            (Task(1, "docs", (), (), (), "", (), ("verification",), 90, "NOT_APPLICABLE"), result(90, policy="NOT_APPLICABLE", tdd_result="N/A", reason="documentation only"), context("NOT_APPLICABLE"), ""),
            (Task(1, "docs", (), (), (), "", (), ("verification",), 90, "NOT_APPLICABLE"), result(90, policy="NOT_APPLICABLE", tdd_result="N/A"), context("NOT_APPLICABLE"), "적용 제외 사유"),
        )
        for task, response, execution_context, expected in scenarios:
            with self.subTest(task=task.title):
                message = _worker_completion_error(task, response, execution_context)
                if expected:
                    self.assertIn(expected, message)
                else:
                    self.assertEqual(message, "")

    def test_reuse_allowed_requires_matching_prior_record(self) -> None:
        execution_context = context("REUSE_ALLOWED")
        execution_context["mode"] = "rerun"
        execution_context["prior_evidence_id"] = "prior"
        response = result(
            90,
            policy="REUSE_ALLOWED",
            reused_evidence={"record_id": "other", "fingerprint": "fingerprint"},
        )

        self.assertIn(
            "동일 fingerprint",
            _worker_completion_error(TASK, response, execution_context),
        )


if __name__ == "__main__":
    unittest.main()
