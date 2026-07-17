from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "harness_exec.py"
SPEC = importlib.util.spec_from_file_location("harness_exec", SCRIPT)
assert SPEC and SPEC.loader
harness_exec = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = harness_exec
SPEC.loader.exec_module(harness_exec)


def task(task_id: str, worker: str) -> object:
    return harness_exec.Task(task_id, worker, "테스트", (), f"{task_id} 본문")


class ParserTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def parse(self, text: str):
        return harness_exec.parse_plan_text(text, self.root)

    def test_parses_valid_tasks_and_design_docs(self) -> None:
        design = self.root / "docs" / "design.md"
        design.parent.mkdir()
        design.write_text("design", encoding="utf-8")
        tasks = self.parse(
            """## Task: api-one
- worker: be-worker
- 작업 유형: API 구현
- 관련 설계 문서: docs/design.md

API를 구현한다.

## Task: ui-one
- worker: fe-worker
- 작업 유형: UI 구현
- 관련 설계 문서: 없음

UI를 구현한다.
"""
        )
        self.assertEqual([item.task_id for item in tasks], ["api-one", "ui-one"])
        self.assertEqual(tasks[0].design_docs, ("docs/design.md",))

    def test_rejects_duplicate_task_id(self) -> None:
        text = """## Task: same
- worker: fe-worker
- 작업 유형: A
- 관련 설계 문서: 없음
본문
## Task: same
- worker: fe-worker
- 작업 유형: B
- 관련 설계 문서: 없음
본문
"""
        with self.assertRaisesRegex(harness_exec.PlanValidationError, "중복"):
            self.parse(text)

    def test_rejects_empty_task_id(self) -> None:
        text = """## Task:
- worker: fe-worker
- 작업 유형: A
- 관련 설계 문서: 없음
본문
"""
        with self.assertRaisesRegex(harness_exec.PlanValidationError, "비어"):
            self.parse(text)

    def test_rejects_missing_attribute(self) -> None:
        text = """## Task: missing
- worker: fe-worker
- 관련 설계 문서: 없음
본문
"""
        with self.assertRaisesRegex(harness_exec.PlanValidationError, "work_type"):
            self.parse(text)

    def test_rejects_unknown_worker(self) -> None:
        text = """## Task: unknown
- worker: qa-worker
- 작업 유형: 테스트
- 관련 설계 문서: 없음
본문
"""
        with self.assertRaisesRegex(harness_exec.PlanValidationError, "be-worker"):
            self.parse(text)

    def test_rejects_invalid_design_doc_path(self) -> None:
        text = """## Task: escaped
- worker: fe-worker
- 작업 유형: 테스트
- 관련 설계 문서: ../outside.md
본문
"""
        with self.assertRaisesRegex(harness_exec.PlanValidationError, "저장소 밖"):
            self.parse(text)


class RunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name).resolve()
        self.plan = self.root / "docs" / "plan" / "active" / "feature-01.md"
        self.plan.parent.mkdir(parents=True)
        self.plan.write_text("plan", encoding="utf-8")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_grouped_runs_backend_then_frontend(self) -> None:
        calls: list[tuple[str, str]] = []
        tasks = [task("fe-1", "fe-worker"), task("be-1", "be-worker"), task("be-2", "be-worker")]
        harness_exec.execute_grouped(
            tasks, self.plan, self.root, "추가", lambda worker, prompt: calls.append((worker, prompt))
        )
        self.assertEqual([worker for worker, _ in calls], ["be-worker", "fe-worker"])
        self.assertIn("be-1", calls[0][1])
        self.assertIn("be-2", calls[0][1])
        self.assertNotIn("fe-1", calls[0][1])
        self.assertIn("추가", calls[1][1])

    def test_backend_failure_stops_frontend(self) -> None:
        calls: list[str] = []

        def failing(worker: str, _prompt: str) -> None:
            calls.append(worker)
            raise RuntimeError("worker failed")

        with self.assertRaisesRegex(RuntimeError, "failed"):
            harness_exec.execute_grouped(
                [task("fe", "fe-worker"), task("be", "be-worker")],
                self.plan,
                self.root,
                invoker=failing,
            )
        self.assertEqual(calls, ["be-worker"])

    def test_supports_frontend_only_and_backend_only(self) -> None:
        for worker in ("fe-worker", "be-worker"):
            calls: list[str] = []
            harness_exec.execute_grouped(
                [task("only", worker)],
                self.plan,
                self.root,
                invoker=lambda actual, _prompt: calls.append(actual),
            )
            self.assertEqual(calls, [worker])

    def test_per_task_runs_backend_tasks_then_frontend_tasks(self) -> None:
        calls: list[tuple[str, str]] = []
        harness_exec.execute_per_task(
            [task("fe-1", "fe-worker"), task("be-1", "be-worker"), task("be-2", "be-worker")],
            self.plan,
            self.root,
            invoker=lambda worker, prompt: calls.append((worker, prompt)),
        )
        self.assertEqual([worker for worker, _ in calls], ["be-worker", "be-worker", "fe-worker"])
        self.assertIn("be-1", calls[0][1])
        self.assertNotIn("be-2", calls[0][1])

if __name__ == "__main__":
    unittest.main()
