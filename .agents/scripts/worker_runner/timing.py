"""Run-scoped Worker timing event collection owned by the parent process."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import secrets
from pathlib import Path
import shutil
import subprocess
from threading import Lock, Thread
from typing import Any
from urllib.parse import urlparse
import uuid

WORKERS = ("fe-worker", "be-worker")


PHASES = frozenset((
    "analysis",
    "test_code",
    "implementation",
    "implementation_and_test",
    "refactor",
    "documentation",
    "verification",
    "finalization",
))
EVENT_TYPES = frozenset(("start", "phase", "tool_start", "tool_end", "end"))
TERMINAL_STATUSES = frozenset(("completed", "failed", "timeout"))
RUN_PURPOSES = frozenset(("task_execution", "verification_result_collection", "decision_correction"))


class EventValidationError(ValueError):
    """An event did not satisfy the run-scoped collector contract."""


class TimingLogError(RuntimeError):
    """The parent-owned record sink did not acknowledge an event."""


def validate_task_number(value: object) -> int:
    if type(value) is not int or value < 1:
        raise ValueError("Task number must be a positive integer.")
    return value


def determine_worker_area(allowed_paths: tuple[str, ...]) -> str:
    """Reuse the Harness frontend path boundary and existing Worker names."""

    is_frontend = any(
        path == "frontend" or path.startswith("frontend/")
        for path in allowed_paths
    )
    return WORKERS[0] if is_frontend else WORKERS[1]


def infer_phase(tool_name: object, classification: object = None) -> str:
    """Return the narrowest safe phase inferred from non-sensitive metadata."""

    text = " ".join(
        value.lower()
        for value in (str(tool_name or ""), str(classification or ""))
    )
    if any(value in text for value in ("test", "lint", "build", "compile", "check", "diff")):
        return "verification"
    if any(value in text for value in ("format", "spotless", "refactor")):
        return "refactor"
    if any(value in text for value in ("read", "rg", "grep", "find", "search", "ls")):
        return "analysis"
    if "doc" in text or "markdown" in text:
        return "documentation"
    return "analysis"


@dataclass(frozen=True)
class RunContext:
    run_id: str
    token: str
    task_number: int
    area: str
    parent_session_id: str | None
    run_purpose: str = "task_execution"
    attempt: int = 1

    @classmethod
    def create(
        cls,
        *,
        task_number: object,
        area: str,
        parent_session_id: str | None,
        run_id: str | None = None,
        run_purpose: str = "task_execution",
        attempt: int = 1,
    ) -> "RunContext":
        if area not in WORKERS:
            raise ValueError("Worker area must be an existing WORKERS value.")
        if run_purpose not in RUN_PURPOSES:
            raise ValueError("Worker run purpose is not allowed.")
        if type(attempt) is not int or attempt < 1:
            raise ValueError("Worker attempt must be a positive integer.")
        return cls(
            run_id=run_id or str(uuid.uuid4()),
            token=secrets.token_urlsafe(32),
            task_number=int(validate_task_number(task_number)),
            area=area,
            parent_session_id=parent_session_id, run_purpose=run_purpose, attempt=attempt,
        )


EventSink = Callable[[dict[str, object]], object]


class NodeEventSink:
    """Forward only normalized, authenticated events to the parent Node logger."""

    def __init__(self, project_root: Path, runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run) -> None:
        self._project_root = project_root
        self._runner = runner

    def __call__(self, event: dict[str, object]) -> dict[str, object]:
        node = shutil.which("node")
        logger = self._project_root / ".codex" / "hooks" / "log-prompt-detail.mjs"
        if not node or not logger.is_file():
            raise TimingLogError("Node worker event logger is unavailable.")
        result = self._runner(
            [node, str(logger), "--worker-event"],
            input=json.dumps(event),
            text=True,
            encoding="utf-8",
            cwd=self._project_root,
            check=False,
            capture_output=True,
            timeout=5,
        )
        try:
            response = json.loads(result.stdout)
        except (TypeError, json.JSONDecodeError) as error:
            raise TimingLogError("Node worker event logger returned invalid JSON.") from error
        if result.returncode != 0 or not isinstance(response, dict) or response.get("ok") is not True:
            raise TimingLogError("Node worker event logger rejected the event.")
        return response


class CollectionService:
    """A loopback-only, authenticated event collector for one Worker run."""

    def __init__(self, context: RunContext, sink: EventSink) -> None:
        self.context = context
        self._sink = sink
        self._active = True
        self._current_phase: str | None = None
        self._open_tools: set[str] = set()
        self._lock = Lock()
        self.diagnostics: list[str] = []
        self.timing_summary: object | None = None
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), self._handler_type())
        self._thread: Thread | None = None

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self._server.server_port}/worker-events"

    def _handler_type(self) -> type[BaseHTTPRequestHandler]:
        collector = self

        class EventHandler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:  # noqa: N802 - HTTP method name
                if self.path != "/worker-events" or self.client_address[0] not in {"127.0.0.1", "::1"}:
                    self.send_error(403)
                    return
                try:
                    size = int(self.headers.get("Content-Length", "0"))
                    if size <= 0 or size > 65_536:
                        raise EventValidationError("Invalid event body size.")
                    event = json.loads(self.rfile.read(size).decode("utf-8"))
                    result = collector.submit(event)
                    payload = {"ok": True, "result": result}
                    self.send_response(200)
                except (EventValidationError, UnicodeError, json.JSONDecodeError):
                    payload = {"ok": False, "error": "invalid_worker_event"}
                    self.send_response(400)
                except Exception:
                    collector.diagnostics.append("event sink failed")
                    payload = {"ok": False, "error": "event_recording_failed"}
                    self.send_response(502)
                encoded = json.dumps(payload).encode("utf-8")
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)

            def log_message(self, _format: str, *_args: Any) -> None:
                return

        return EventHandler

    def start(self) -> None:
        if self._thread is None:
            self._thread = Thread(target=self._server.serve_forever, daemon=True)
            self._thread.start()

    def close(self) -> None:
        with self._lock:
            self._active = False
        if self._thread is not None:
            self._server.shutdown()
        self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=5)

    def worker_environment(self, base_environment: dict[str, str]) -> dict[str, str]:
        environment = base_environment.copy()
        environment.update({
            "FLOW_BI_RUN_ID": self.context.run_id,
            "FLOW_BI_TASK_NUMBER": str(self.context.task_number),
            "FLOW_BI_WORKER_AREA": self.context.area,
            "FLOW_BI_WORKER_EVENT_URL": self.url,
            "FLOW_BI_WORKER_EVENT_TOKEN": self.context.token,
        })
        return environment

    def submit(self, event: object) -> dict[str, object]:
        if not isinstance(event, dict):
            raise EventValidationError("Worker event must be an object.")
        with self._lock:
            if not self._active:
                raise EventValidationError("Worker run is already closed.")
            event_type = event.get("event_type")
            if event_type not in EVENT_TYPES:
                raise EventValidationError("Worker event type is not allowed.")
            if event.get("run_id") != self.context.run_id or not secrets.compare_digest(
                str(event.get("token", "")), self.context.token
            ):
                raise EventValidationError("Worker event authentication failed.")
            for name, expected in (("area", self.context.area), ("task_number", self.context.task_number), ("parent_session_id", self.context.parent_session_id)):
                if name in event and event[name] != expected:
                    raise EventValidationError(f"Worker event {name} does not match this run.")
            phase = event.get("phase")
            if event_type == "phase" and phase not in PHASES:
                raise EventValidationError("Worker phase is not allowed.")
            if event_type in {"tool_start", "tool_end"} and not isinstance(event.get("tool_id"), str):
                raise EventValidationError("Tool events require a tool_id.")
            if event_type == "end":
                if (
                    event.get("status") not in TERMINAL_STATUSES
                    or type(event.get("exit_code")) is not int
                ):
                    raise EventValidationError("Terminal event is invalid.")
            if event_type == "tool_end" and event["tool_id"] not in self._open_tools:
                return {"status": "duplicate_or_missing_tool_end"}

            normalized = self._normalize(event)
            sink_result = self._sink(normalized)
            if event_type == "end":
                self.timing_summary = self._timing_summary_from_sink(sink_result)
            if event_type == "phase":
                self._current_phase = str(phase)
            elif event_type == "tool_start":
                self._open_tools.add(event["tool_id"])
            elif event_type == "tool_end":
                self._open_tools.discard(event["tool_id"])
            elif event_type == "end":
                self._active = False
            return {"status": "recorded"}

    @staticmethod
    def _timing_summary_from_sink(result: object) -> object | None:
        """Keep the Node-confirmed terminal summary opaque for gateway validation."""

        if not isinstance(result, dict):
            return None
        summary = result.get("timing_summary")
        if summary is not None:
            return summary
        nested = result.get("result")
        return nested.get("timing_summary") if isinstance(nested, dict) else None

    def _normalize(self, event: dict[str, object]) -> dict[str, object]:
        event_type = str(event["event_type"])
        phase = self._current_phase
        source = "explicit" if phase else "inferred"
        if event_type == "phase":
            phase = str(event["phase"])
            source = "explicit"
        elif event_type in {"tool_start", "tool_end"} and phase is None:
            phase = infer_phase(event.get("tool_name"), event.get("classification"))
        safe = {
            key: value for key, value in event.items()
            if key in {"event_type", "tool_id", "tool_name", "classification", "status", "exit_code", "summary"}
        }
        return {
            **safe,
            "run_id": self.context.run_id,
            "task_number": self.context.task_number,
            "area": self.context.area,
            "parent_session_id": self.context.parent_session_id,
            "run_purpose": self.context.run_purpose,
            "attempt": self.context.attempt,
            "phase": phase,
            "phase_source": source,
            "occurred_at": datetime.now(UTC).isoformat(),
        }


def validate_loopback_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"} or not parsed.port:
        raise EventValidationError("Worker event URL must be a loopback HTTP URL.")
    return url
