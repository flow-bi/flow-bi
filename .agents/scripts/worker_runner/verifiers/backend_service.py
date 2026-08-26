from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import re
import secrets
import subprocess
import threading

from .backend_formatting import BackendFormatter, FormatterScope

BACKEND_VERIFIER_URL = "FLOW_BI_BACKEND_VERIFIER_URL"
BACKEND_VERIFIER_TOKEN = "FLOW_BI_BACKEND_VERIFIER_TOKEN"
BACKEND_FORMATTER_URL = "FLOW_BI_BACKEND_FORMATTER_URL"
DEFAULT_GRADLE_TIMEOUT_SECONDS = 15 * 60
DEFAULT_FORMATTER_TIMEOUT_SECONDS = 5 * 60
MAX_ARGUMENTS = 16
MAX_REQUEST_BYTES = 4096
GRADLE_TASKS = frozenset({"test", "spotlessCheck", "build", "assemble", "compileJava"})
GRADLE_FLAGS = frozenset({"--no-daemon", "--stacktrace", "--info", "--quiet", "--rerun-tasks"})
TEST_FILTER = re.compile(r"^[A-Za-z0-9_.$*?\[\]-]+$")


@dataclass(frozen=True)
class BackendVerificationResult:
    returncode: int
    output: str
    timed_out: bool = False


@dataclass
class _InFlightVerification:
    completed: threading.Event
    result: BackendVerificationResult | None = None


def validate_gradle_arguments(arguments: object) -> tuple[str, ...]:
    if not isinstance(arguments, list) or not arguments or len(arguments) > MAX_ARGUMENTS:
        raise ValueError("Gradle arguments are invalid")
    if not all(isinstance(argument, str) and argument for argument in arguments):
        raise ValueError("Gradle arguments are invalid")
    has_task, index = False, 0
    while index < len(arguments):
        argument = arguments[index]
        if argument in GRADLE_TASKS:
            has_task = True
        elif argument in GRADLE_FLAGS:
            pass
        elif argument == "--tests":
            index += 1
            if index == len(arguments) or not TEST_FILTER.fullmatch(arguments[index]):
                raise ValueError("Gradle test filter is invalid")
        elif argument.startswith("--tests="):
            if not TEST_FILTER.fullmatch(argument.removeprefix("--tests=")):
                raise ValueError("Gradle test filter is invalid")
        else:
            raise ValueError("Gradle task or option is not allowed")
        index += 1
    if not has_task:
        raise ValueError("Gradle verification task is required")
    return tuple(arguments)


class BackendVerifier:
    def __init__(self, project_root: Path, *, runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
                 timeout: int = DEFAULT_GRADLE_TIMEOUT_SECONDS, os_name: str = os.name) -> None:
        self._root = project_root.resolve()
        self._backend = (self._root / "backend").resolve()
        self._wrapper_name = "gradlew.bat" if os_name == "nt" else "gradlew"
        self._gradlew = self._backend / self._wrapper_name
        self._runner, self._timeout = runner, timeout
        self._token = secrets.token_urlsafe(32)
        self._formatter_tokens: dict[str, FormatterScope] = {}
        self._formatter = BackendFormatter(self._root, self._backend, self._wrapper_name, runner, self._subprocess_environment)
        self._execution_lock, self._in_flight_lock = threading.Lock(), threading.Lock()
        self._in_flight: dict[tuple[object, ...], _InFlightVerification] = {}
        self._server: ThreadingHTTPServer | None = None
        self._server_thread: threading.Thread | None = None

    @property
    def environment(self) -> dict[str, str]:
        if self._server is None:
            raise RuntimeError("Backend verifier has not started")
        host, port = self._server.server_address
        return {BACKEND_VERIFIER_URL: f"http://{host}:{port}/verify/gradle", BACKEND_VERIFIER_TOKEN: self._token}

    def environment_for_task(self, allowed_paths: Sequence[str], read_only_paths: Sequence[str]) -> dict[str, str]:
        scope = self._formatter.scope(allowed_paths, read_only_paths)
        if self._server is None:
            raise RuntimeError("Backend verifier has not started")
        token = secrets.token_urlsafe(32)
        self._formatter_tokens[token] = scope
        host, port = self._server.server_address
        return {**self.environment, BACKEND_FORMATTER_URL: f"http://{host}:{port}/format/java", BACKEND_VERIFIER_TOKEN: token}

    def _subprocess_environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        for key in (BACKEND_VERIFIER_URL, BACKEND_VERIFIER_TOKEN, BACKEND_FORMATTER_URL):
            environment.pop(key, None)
        return environment

    def _run_single_flight(self, key: tuple[object, ...], operation: Callable[[], BackendVerificationResult]) -> BackendVerificationResult | None:
        with self._in_flight_lock:
            in_flight = self._in_flight.get(key)
            if in_flight is not None:
                owner = False
            elif not self._execution_lock.acquire(blocking=False):
                return None
            else:
                in_flight, owner = _InFlightVerification(threading.Event()), True
                self._in_flight[key] = in_flight
        if not owner:
            in_flight.completed.wait()
            return in_flight.result or BackendVerificationResult(1, "Backend verification did not complete")
        try:
            try:
                in_flight.result = operation()
            except Exception:
                in_flight.result = BackendVerificationResult(1, "Backend 검증 실행 중 예외가 발생했습니다.")
            return in_flight.result
        finally:
            with self._in_flight_lock:
                self._execution_lock.release()
                self._in_flight.pop(key, None)
                in_flight.completed.set()

    def _verify_gradle(self, arguments: tuple[str, ...]) -> BackendVerificationResult | None:
        return self._run_single_flight(("gradle", *arguments), lambda: self._verify_gradle_once(arguments))

    def _verify_gradle_once(self, arguments: tuple[str, ...]) -> BackendVerificationResult:
        try:
            result = self._runner([str(self._gradlew), *arguments], cwd=self._backend, env=self._subprocess_environment(), timeout=self._timeout, text=True, encoding="utf-8", errors="replace", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
        except subprocess.TimeoutExpired as error:
            return BackendVerificationResult(124, _timeout_output(error), timed_out=True)
        except OSError as error:
            code = getattr(error, "winerror", None) or error.errno
            detail = f" (OS error {code})" if code is not None else ""
            return BackendVerificationResult(1, f"Backend Gradle could not start {self._wrapper_name}{detail}.")
        return BackendVerificationResult(result.returncode, result.stdout or "")

    def _format_java(self, targets: tuple[Path, ...]) -> BackendVerificationResult | None:
        return self._run_single_flight(("format-java", *(str(target) for target in targets)), lambda: self._formatter.format(targets, DEFAULT_FORMATTER_TIMEOUT_SECONDS))

    def __enter__(self):
        verifier = self
        class RequestHandler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                token = self.headers.get("Authorization", "").removeprefix("Bearer ")
                gradle = self.path == "/verify/gradle" and (secrets.compare_digest(token, verifier._token) or token in verifier._formatter_tokens)
                formatting = self.path == "/format/java" and token in verifier._formatter_tokens
                if not gradle and not formatting:
                    self.send_error(401); return
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length < 0 or length > MAX_REQUEST_BYTES: self.send_error(413); return
                    payload = json.loads(self.rfile.read(length).decode("utf-8"))
                    result = verifier._verify_gradle(validate_gradle_arguments(payload.get("arguments"))) if gradle else verifier._format_java(verifier._formatter.targets(payload.get("paths"), verifier._formatter_tokens[token]))
                except (AttributeError, UnicodeError, ValueError, json.JSONDecodeError):
                    self.send_error(400); return
                if result is None: self.send_error(429); return
                response = json.dumps({"returncode": result.returncode, "output": result.output, "timed_out": result.timed_out}, ensure_ascii=False).encode("utf-8")
                self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(response))); self.end_headers(); self.wfile.write(response)
            def log_message(self, _format: str, *_args: object) -> None: return
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), RequestHandler)
        self._server_thread = threading.Thread(target=self._server.serve_forever, name="flow-bi-backend-verifier", daemon=True)
        self._server_thread.start()
        return self

    def __exit__(self, *_args: object) -> None:
        if self._server is not None: self._server.shutdown(); self._server.server_close()
        if self._server_thread is not None: self._server_thread.join()
        self._server = self._server_thread = None
        self._formatter_tokens.clear()


def _timeout_output(error: subprocess.TimeoutExpired) -> str:
    output = error.stdout if error.stdout is not None else error.output
    return output.decode("utf-8", errors="replace") if isinstance(output, bytes) else output or ""
