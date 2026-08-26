from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest


WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner.invocation import (  # noqa: E402
    EXISTING_WITHOUT_EVIDENCE,
    NEW_OR_CHANGED,
    RERUN,
    parse_invocation,
)


def invocation(*, context: object | None = None, correction: object | None = None) -> str:
    payload: dict[str, object] = {
        "common_prompt": "common guidance",
        "additional_request": "additional request",
        "task": {
            "number": 1,
            "title": "Task title",
            "task_prompt": "Implement the task.",
            "allowed_paths": ["implementation"],
            "forbidden_paths": ["forbidden"],
            "verification_items": ["unit test"],
        },
    }
    if context is not None:
        payload["execution_context"] = context
    if correction is not None:
        payload["decision_correction"] = correction
    return json.dumps(payload)


class WorkerInvocationTests(unittest.TestCase):
    def test_preserves_return_contract_and_default_execution_context(self) -> None:
        prompt, allowed, forbidden = parse_invocation(invocation())

        self.assertEqual(allowed, ("implementation",))
        self.assertEqual(forbidden, ("forbidden",))
        self.assertIn(EXISTING_WITHOUT_EVIDENCE, prompt)

    def test_rejects_missing_required_task_field(self) -> None:
        payload = json.loads(invocation())
        del payload["task"]["title"]

        with self.assertRaises(KeyError):
            parse_invocation(json.dumps(payload))

    def test_validates_execution_mode_and_prior_tdd_evidence(self) -> None:
        invalid_mode = {
            "plan_id": "harness-03",
            "fingerprint": "fingerprint",
            "mode": "invalid",
            "prior_tdd_evidence": None,
        }
        with self.assertRaises(ValueError):
            parse_invocation(invocation(context=invalid_mode))

        rerun = {
            "plan_id": "harness-03",
            "fingerprint": "fingerprint",
            "mode": RERUN,
            "prior_tdd_evidence": {"result": "PASS", "evidence": "red then green"},
        }
        prompt, _, _ = parse_invocation(invocation(context=rerun))
        self.assertIn("plan:harness-03:task:1:fingerprint:fingerprint", prompt)

        changed_with_prior = dict(rerun, mode=NEW_OR_CHANGED)
        with self.assertRaises(ValueError):
            parse_invocation(invocation(context=changed_with_prior))

    def test_keeps_decision_correction_in_prompt(self) -> None:
        correction = {"prior_decision": "PASS_WITH_FOLLOW_UP", "objective_evidence": {"scope": "PASS"}}

        prompt, _, _ = parse_invocation(invocation(correction=correction))

        self.assertIn("PASS_WITH_FOLLOW_UP", prompt)
        self.assertIn("objective_evidence", prompt)


if __name__ == "__main__":
    unittest.main()
