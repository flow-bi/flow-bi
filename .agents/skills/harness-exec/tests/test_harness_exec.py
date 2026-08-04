from __future__ import annotations

from pathlib import Path
import sys
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.execution import _completion_error
from harness_runner.models import Task
from harness_runner.parse import parse_plan_text


TASK = Task(1, "quality", (), (), (), "", (), ("verification",), 90)


def result(score: object) -> object:
    class Result:
        output_error = ""
        output = {
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
        }
    return Result()


class CompletionTests(unittest.TestCase):
    def test_parses_minimum_quality_score(self) -> None:
        plan = parse_plan_text("""## 2. 실행 Task
### Task 1. quality
#### 완료 조건
- `quality_score`가 90 이상이어야 한다.
#### 검증 항목
- verification
""")
        self.assertEqual(plan.tasks[0].minimum_quality_score, 90)

    def test_rejects_below_missing_and_non_integer_quality_score(self) -> None:
        for score in (89, None, "90", True):
            with self.subTest(score=score):
                self.assertIn("quality_score", _completion_error(TASK, result(score)))

    def test_accepts_quality_score_at_or_above_minimum(self) -> None:
        self.assertEqual(_completion_error(TASK, result(90)), "")
        self.assertEqual(_completion_error(TASK, result(100)), "")


if __name__ == "__main__":
    unittest.main()
