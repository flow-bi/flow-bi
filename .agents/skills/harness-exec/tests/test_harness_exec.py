from __future__ import annotations

from pathlib import Path
import sys
import unittest


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from harness_runner.worker_result import completion_error
from harness_runner.models import Task
from harness_runner.plan_parser import parse_plan_text


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
    return Result()


class CompletionTests(unittest.TestCase):
    def test_plan_parser_extracts_task_paths_and_ignores_non_task_text(self) -> None:
        plan = parse_plan_text("""# Harness
## 2. \uc2e4\ud589 Task
### Task 1. parser boundary
#### \uc120\ud589 Task
- Task 1
#### \uc218\uc815 \uac00\ub2a5 \uacbd\ub85c
- `scripts/harness_runner`
#### \uc218\uc815 \uae08\uc9c0 \uacbd\ub85c
- `docs/plans/active`
#### \uad6c\ud604 \ud56d\ubaa9
- separate parser
#### \uac80\uc99d \ud56d\ubaa9
- parser test
#### \uc644\ub8cc \uc870\uac74
- `quality_score`\uac00 85 \uc774\uc0c1\uc774\uc5b4\uc57c \ud55c\ub2e4.
## 3. \uc804\uccb4 \uc644\ub8cc \uc870\uac74
### Task 2. ignored
""")

        parsed_task = plan.tasks[0]
        self.assertEqual(len(plan.tasks), 1)
        self.assertEqual(parsed_task.prerequisite_numbers, (1,))
        self.assertEqual(parsed_task.allowed_paths, ("scripts/harness_runner",))
        self.assertEqual(parsed_task.forbidden_paths, ("docs/plans/active",))
        self.assertEqual(parsed_task.minimum_quality_score, 85)

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
                self.assertIn("quality_score", completion_error(TASK, result(score)))

    def test_accepts_quality_score_at_or_above_minimum(self) -> None:
        self.assertEqual(completion_error(TASK, result(90)), "")
        self.assertEqual(completion_error(TASK, result(100)), "")


if __name__ == "__main__":
    unittest.main()
