from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


WORKER_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner.request import WorkerExecutionRequest
from worker_runner.runner import _node_timing_summary, execute_worker
from worker_runner.codex_cli import build_codex_command
from worker_runner.timing import (
    CollectionService,
    EventValidationError,
    RunContext,
    determine_worker_area,
    validate_loopback_url,
)
from worker_runner.worker_process import (
    _jsonl_tool_events_for_line,
    run_worker_process,
)


def _summary(run_id: str, task_number: int = 1) -> dict[str, object]:
    return {
        "run_id": run_id,
        "task_number": task_number,
        "area": "be-worker",
        "total_duration_ms": 12,
        "unattributed_duration_ms": 2,
        "classification": {"explicit": True, "inferred": False},
        "phases": [],
    }


class WorkerTimingCollectorTests(unittest.TestCase):
    def test_collector_binds_identity_and_strips_sensitive_tool_payloads(self) -> None:
        recorded: list[dict[str, object]] = []
        context = RunContext.create(
            task_number=2,
            area="fe-worker",
            parent_session_id="parent",
            run_id="run-2",
        )
        service = CollectionService(context, lambda event: recorded.append(event) or {})
        try:
            service.submit({
                "event_type": "start",
                "run_id": context.run_id,
                "token": context.token,
            })
            service.submit({
                "event_type": "phase",
                "phase": "implementation",
                "run_id": context.run_id,
                "token": context.token,
            })
            service.submit({
                "event_type": "tool_start",
                "tool_id": "tool-1",
                "tool_name": "file_change",
                "classification": "file_change",
                "command": "secret command",
                "patch": "secret patch",
                "token": context.token,
                "run_id": context.run_id,
            })
            service.submit({
                "event_type": "tool_end",
                "tool_id": "tool-1",
                "tool_name": "file_change",
                "classification": "file_change",
                "run_id": context.run_id,
                "token": context.token,
            })
            service.submit({
                "event_type": "end",
                "status": "completed",
                "exit_code": 0,
                "run_id": context.run_id,
                "token": context.token,
            })
        finally:
            service.close()

        tool = next(event for event in recorded if event["event_type"] == "tool_start")
        self.assertEqual(tool["phase"], "implementation")
        self.assertEqual(tool["phase_source"], "explicit")
        self.assertNotIn("command", tool)
        self.assertNotIn("patch", tool)
        self.assertNotIn("token", tool)

    def test_collector_rejects_mismatched_or_invalid_run_contract(self) -> None:
        context = RunContext.create(
            task_number=1,
            area="be-worker",
            parent_session_id=None,
            run_id="run-current",
        )
        service = CollectionService(context, lambda _event: {})
        try:
            invalid_events = (
                {"event_type": "start", "run_id": "other", "token": context.token},
                {"event_type": "start", "run_id": context.run_id, "token": "wrong"},
                {"event_type": "start", "run_id": context.run_id, "token": context.token, "task_number": 2},
                {"event_type": "phase", "phase": "unknown", "run_id": context.run_id, "token": context.token},
                {"event_type": "end", "status": "completed", "exit_code": True, "run_id": context.run_id, "token": context.token},
            )
            for event in invalid_events:
                with self.subTest(event=event), self.assertRaises(EventValidationError):
                    service.submit(event)
        finally:
            service.close()

        with self.assertRaises(EventValidationError):
            validate_loopback_url("https://example.com/worker-events")
        self.assertEqual(determine_worker_area(("frontend/src",)), "fe-worker")
        self.assertEqual(determine_worker_area(("backend",)), "be-worker")

    def test_same_task_runs_use_separate_credentials(self) -> None:
        first = RunContext.create(task_number=1, area="be-worker", parent_session_id=None)
        second = RunContext.create(task_number=1, area="be-worker", parent_session_id=None)
        self.assertNotEqual(first.run_id, second.run_id)
        self.assertNotEqual(first.token, second.token)


class WorkerProcessTimingTests(unittest.TestCase):
    def test_codex_command_enables_jsonl_progress(self) -> None:
        command = build_codex_command(
            output_path=Path("result.json"),
            executable="codex",
            config_overrides=(),
        )
        self.assertEqual(command[:3], ["codex", "exec", "--json"])

    def test_jsonl_parser_emits_only_supported_lifecycle_metadata(self) -> None:
        open_items: dict[str, str] = {}
        started = _jsonl_tool_events_for_line(json.dumps({
            "type": "item.started",
            "item": {
                "id": "item-1",
                "type": "command_execution",
                "command": "token=secret",
                "output": "file contents",
            },
        }), open_items)
        ignored = _jsonl_tool_events_for_line(json.dumps({
            "type": "item.completed",
            "item": {"id": "message-1", "type": "agent_message", "text": "secret"},
        }), open_items)
        completed = _jsonl_tool_events_for_line(json.dumps({
            "type": "item.completed",
            "item": {"id": "item-1", "type": "command_execution", "output": "secret"},
        }), open_items)

        self.assertEqual(started[0]["event_type"], "tool_start")
        self.assertEqual(completed[0]["event_type"], "tool_end")
        self.assertEqual(ignored, ())
        self.assertNotIn("command", started[0])
        self.assertNotIn("output", completed[0])

    def test_injected_runner_separates_streams_and_cleans_all_artifacts(self) -> None:
        events: list[dict[str, str]] = []
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
                output_path = Path(command[command.index("-o") + 1])
                output_path.write_text('{"final_status":"PASS"}', encoding="utf-8")
                kwargs["stdout"].write(json.dumps({
                    "type": "item.started",
                    "item": {"id": "tool", "type": "web_search", "query": "secret"},
                }) + "\n")
                kwargs["stdout"].write(json.dumps({
                    "type": "item.completed",
                    "item": {"id": "tool", "type": "web_search", "output": "secret"},
                }) + "\n")
                kwargs["stderr"].write("diagnostic only")
                return subprocess.CompletedProcess(command, 0)

            result = run_worker_process(
                run_id="run-files",
                executable="codex",
                config_overrides=(),
                prompt="prompt",
                environment={},
                project_root=root,
                runner=run,
                logger=lambda *_args: None,
                on_tool_event=events.append,
            )

            self.assertEqual(result.returncode, 0)
            self.assertEqual([event["event_type"] for event in events], ["tool_start", "tool_end"])
            self.assertEqual(list((root / ".codex-logs" / ".pending").iterdir()), [])


class WorkerRunnerTimingTests(unittest.TestCase):
    def _request(self, root: Path, run_id: str = "run-current") -> WorkerExecutionRequest:
        return WorkerExecutionRequest(
            task_number=1,
            common_prompt="common",
            additional_request="",
            title="title",
            task_prompt="task",
            task_execution_context=None,
            decision_correction=None,
            executable="codex",
            config_overrides=(),
            environment={},
            project_root=root,
            run_id=run_id,
            worker_area="be-worker",
        )

    @staticmethod
    def _successful_process(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        output_path = Path(command[command.index("-o") + 1])
        output_path.write_text(
            '{"final_status":"PASS","work_summary":"done"}',
            encoding="utf-8",
        )
        return subprocess.CompletedProcess(command, 0)

    def test_success_preserves_run_and_node_confirmed_timing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            def sink(event: dict[str, object]) -> dict[str, object]:
                return {"timing_summary": _summary("run-current")} if event["event_type"] == "end" else {}

            result = execute_worker(
                self._request(root),
                process_runner=self._successful_process,
                logger=lambda *_args: None,
                event_sink=sink,
            )

        self.assertEqual(result.run_id, "run-current")
        self.assertEqual(result.timing_summary, _summary("run-current"))

    def test_timing_sink_failure_does_not_change_worker_success(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            def fail_sink(_event: dict[str, object]) -> object:
                raise OSError("timing unavailable")

            result = execute_worker(
                self._request(Path(temporary)),
                process_runner=self._successful_process,
                logger=lambda *_args: None,
                event_sink=fail_sink,
            )

        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.run_id, "run-current")
        self.assertIsNone(result.timing_summary)

    def test_timeout_preserves_run_and_terminal_timing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            def timeout(_command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
                raise subprocess.TimeoutExpired("codex", 30)

            def sink(event: dict[str, object]) -> dict[str, object]:
                return {"timing_summary": _summary("run-current")} if event["event_type"] == "end" else {}

            with self.assertRaises(subprocess.TimeoutExpired) as raised:
                execute_worker(
                    self._request(Path(temporary)),
                    process_runner=timeout,
                    logger=lambda *_args: None,
                    event_sink=sink,
                    timeout=30,
                )

        self.assertEqual(raised.exception.run_id, "run-current")
        self.assertEqual(raised.exception.timing_summary, _summary("run-current"))

    def test_nonzero_exit_preserves_failed_terminal_timing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            def failed(command: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
                return subprocess.CompletedProcess(command, 3)

            def sink(event: dict[str, object]) -> dict[str, object]:
                return {"timing_summary": _summary("run-current")} if event["event_type"] == "end" else {}

            result = execute_worker(
                self._request(Path(temporary)),
                process_runner=failed,
                logger=lambda *_args: None,
                event_sink=sink,
            )

        self.assertEqual(result.returncode, 3)
        self.assertEqual(result.run_id, "run-current")
        self.assertEqual(result.timing_summary, _summary("run-current"))

    def test_tree_fallback_reads_only_the_current_run_id(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            log_directory = root / ".codex-logs"
            log_directory.mkdir()
            (log_directory / "user-prompt-detail-tree.json").write_text(json.dumps({
                "roots": [
                    {
                        "run_id": "old-run",
                        "executor": {"kind": "task", "task_number": 1},
                        "area": "be-worker",
                        "total_duration_ms": 999,
                        "unattributed_duration_ms": 999,
                        "classification": {"explicit": False, "inferred": True},
                        "phases": [],
                        "children": [],
                    },
                    {
                        "run_id": "run-current",
                        "executor": {"kind": "task", "task_number": 1},
                        "area": "be-worker",
                        "total_duration_ms": 12,
                        "unattributed_duration_ms": 2,
                        "classification": {"explicit": True, "inferred": False},
                        "phases": [],
                        "children": [],
                    },
                ],
            }), encoding="utf-8")

            observed = _node_timing_summary(root, "run-current")

        self.assertEqual(observed, _summary("run-current"))


if __name__ == "__main__":
    unittest.main()
