from __future__ import annotations

from pathlib import Path
import sys
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.execution import _completion_error
from harness_runner.models import Task, TaskExecutionContext
from harness_runner.parse import parse_plan_text


TASK = Task(1, "quality", (), (), (), "", (), ("verification",), 90)


def result(score: object) -> object:
    class Result:
        output_error = ""
        output = {
            "work_summary": "quality contract verified",
            "mandatory_gates": {
                name: {"result": "PASS", "evidence": "evidence"}
                for name in (
                    "permission_security", "scope", "requirements", "tdd",
                    "automated_verification", "contract_sync", "critical_findings",
                )
            },
            "verification": [{"item": "verification", "result": "PASS", "evidence": "proof"}],
            "decision": "PASS",
            "quality_score": score,
            "remaining_issues": [],
            "final_status": "PASS",
        }
    response = Result()
    response.output["mandatory_gates"]["tdd"].update({
        "effective_policy": "REQUIRED",
        "current_verification_evidence": "green",
    })
    return response


def context(policy: str = "REQUIRED") -> TaskExecutionContext:
    return TaskExecutionContext("plan-01", "fingerprint", "new_or_changed", effective_tdd_policy=policy)


class CompletionTests(unittest.TestCase):
    def test_parses_minimum_quality_score(self) -> None:
        plan = parse_plan_text("""## 2. 실행 Task
### Task 1. quality
#### 완료 조건
- `quality_score`가 90 이상이어야 한다.
#### TDD 정책
- REQUIRED
#### 검증 항목
- verification
""")
        self.assertEqual(plan.tasks[0].minimum_quality_score, 90)

    def test_rejects_below_missing_and_non_integer_quality_score(self) -> None:
        for score in (89, None, "90", True):
            with self.subTest(score=score):
                self.assertIn("quality_score", _completion_error(TASK, result(score), context()))

    def test_accepts_quality_score_at_or_above_minimum(self) -> None:
        for score in (90, 100):
            self.assertEqual(_completion_error(TASK, result(score), context()), "")

    def test_tdd_policies_require_distinct_evidence(self) -> None:
        scenarios = (
            ("REQUIRED", "PASS", {"effective_policy": "REQUIRED", "current_verification_evidence": "green"}, ""),
            ("REGRESSION_ONLY", "PASS", {"effective_policy": "REGRESSION_ONLY", "current_verification_evidence": "regression"}, ""),
            ("NOT_APPLICABLE", "N/A", {"effective_policy": "NOT_APPLICABLE", "reason": "documentation only", "current_verification_evidence": "link check"}, ""),
            ("NOT_APPLICABLE", "N/A", {"effective_policy": "NOT_APPLICABLE", "current_verification_evidence": "link check"}, "N/A 결과와 적용 제외 사유"),
        )
        for policy, gate_result, fields, expected in scenarios:
            with self.subTest(policy=policy, expected=expected):
                task = Task(1, "policy", (), (), (), "", (), ("verification",), 90, policy)
                response = result(90)
                response.output["mandatory_gates"]["tdd"].update({"result": gate_result, **fields})
                message = _completion_error(task, response, context(policy))
                if expected:
                    self.assertIn(expected, message)
                else:
                    self.assertEqual(message, "")

    def test_reuse_allowed_is_rejected_for_non_required_declaration(self) -> None:
        task = Task(1, "policy", (), (), (), "", (), ("verification",), 90, "REGRESSION_ONLY")
        response = result(90)
        response.output["mandatory_gates"]["tdd"].update({
            "effective_policy": "REUSE_ALLOWED",
            "reused_evidence": {"record_id": "prior", "fingerprint": "fingerprint"},
        })
        rerun = TaskExecutionContext(
            "plan-01", "fingerprint", "rerun",
            prior_tdd_evidence={"result": "PASS", "evidence": "record"},
            prior_evidence_id="prior",
            effective_tdd_policy="REUSE_ALLOWED",
        )

        self.assertIn("선언 TDD 정책", _completion_error(task, response, rerun))


if __name__ == "__main__":
    unittest.main()
