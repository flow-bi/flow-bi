from __future__ import annotations

from pathlib import Path
import sys
import unittest


WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner.prompt import build_worker_prompt
from worker_runner.request import WorkerExecutionRequest


def request(**changes: object) -> WorkerExecutionRequest:
    values: dict[str, object] = {"task_number": 1, "common_prompt": "common", "additional_request": "", "title": "title", "task_prompt": "task", "verification_items": ("unit",), "task_execution_context": {"mode": "new_or_changed", "effective_tdd_policy": "REQUIRED"}, "decision_correction": None, "verification_result_collection": None, "executable": "codex", "config_overrides": (), "environment": {}, "project_root": Path.cwd()}
    values.update(changes)
    return WorkerExecutionRequest(**values)  # type: ignore[arg-type]


class HarnessWorkerPromptPhaseTests(unittest.TestCase):
    def test_required_work_marks_each_real_tdd_boundary(self) -> None:
        prompt = build_worker_prompt(request())
        for phase in ("analysis", "test_code", "implementation", "verification", "finalization"):
            self.assertIn(f"phase_marker {phase}", prompt)
        self.assertIn("수행하지 않는 refactor·documentation phase는 만들지 않으며", prompt)

    def test_collection_and_correction_do_not_require_false_implementation_phase(self) -> None:
        collected = build_worker_prompt(request(verification_result_collection={"attempt": 2, "verification": []}))
        corrected = build_worker_prompt(request(decision_correction={"prior_decision": "RETRY"}))
        self.assertIn("결과 수집·판정 교정은 허위 구현 phase를 기록하지 않는다", collected)
        self.assertIn("구현을 변경하거나 검증을 다시 실행하지 않는다", corrected)
        self.assertIn('"verification_result_collection"', collected)
        self.assertIn('"decision_correction"', corrected)


if __name__ == "__main__":
    unittest.main()
