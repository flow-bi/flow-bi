from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import re
import secrets
import shutil
import subprocess
import threading

FRONTEND_VERIFIER_URL = "FLOW_BI_FRONTEND_VERIFIER_URL"
FRONTEND_VERIFIER_TOKEN = "FLOW_BI_FRONTEND_VERIFIER_TOKEN"
DEFAULT_FRONTEND_TIMEOUT_SECONDS = 15 * 60
MAX_REQUEST_BYTES = 4096
MAX_PACKAGES = 32
PACKAGE_NAME = re.compile(r"(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*)$")
SCRIPT_NAMES = frozenset({"test:unit", "typecheck", "check"})

@dataclass(frozen=True)
class FrontendVerificationResult:
    returncode: int
    output: str
    timed_out: bool = False

def validate_npm_arguments(arguments: object) -> tuple[str, ...]:
    if not isinstance(arguments, list) or not all(isinstance(value, str) and value for value in arguments): raise ValueError("npm arguments are invalid")
    if arguments[:1] == ["ls"]:
        packages = arguments[1:]
        if len(packages) > MAX_PACKAGES or not all(PACKAGE_NAME.fullmatch(value) for value in packages): raise ValueError("npm package name is not allowed")
        return tuple(arguments)
    if len(arguments) == 2 and arguments[0] == "run" and arguments[1] in SCRIPT_NAMES: return tuple(arguments)
    raise ValueError("npm verification command is not allowed")

class FrontendVerifier:
    def __init__(self, project_root: Path, *, runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run, npm_executable: str | None = None, timeout: int = DEFAULT_FRONTEND_TIMEOUT_SECONDS) -> None:
        self._frontend, self._runner, self._npm, self._timeout = (project_root.resolve() / "frontend").resolve(), runner, npm_executable or _resolve_npm_executable(), timeout
        self._base_environment = self._prepare_base_environment()
        self._token, self._lock = secrets.token_urlsafe(32), threading.Lock()
        self._server: ThreadingHTTPServer | None = None; self._server_thread: threading.Thread | None = None
    @property
    def environment(self) -> dict[str, str]:
        if self._server is None: raise RuntimeError("Frontend verifier has not started")
        host, port = self._server.server_address
        return {FRONTEND_VERIFIER_URL: f"http://{host}:{port}/verify/npm", FRONTEND_VERIFIER_TOKEN: self._token}
    @staticmethod
    def _prepare_base_environment() -> dict[str, str]:
        environment = os.environ.copy(); environment.pop(FRONTEND_VERIFIER_URL, None); environment.pop(FRONTEND_VERIFIER_TOKEN, None); return environment
    def _environment(self) -> dict[str, str]:
        return self._base_environment.copy()
    def _verify_npm(self, arguments: tuple[str, ...]) -> FrontendVerificationResult | None:
        if not self._lock.acquire(blocking=False): return None
        try:
            try: result = self._runner([self._npm, *arguments], cwd=self._frontend, env=self._environment(), timeout=self._timeout, text=True, encoding="utf-8", errors="replace", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
            except subprocess.TimeoutExpired as error: return FrontendVerificationResult(124, _timeout_output(error), timed_out=True)
            except OSError: return FrontendVerificationResult(1, "Frontend npm verification could not start.")
            return FrontendVerificationResult(result.returncode, result.stdout or "")
        finally: self._lock.release()
    def __enter__(self):
        verifier = self
        class RequestHandler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                if self.path != "/verify/npm" or not secrets.compare_digest(self.headers.get("Authorization", ""), f"Bearer {verifier._token}"): self.send_error(401); return
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length < 0 or length > MAX_REQUEST_BYTES: self.send_error(413); return
                    result = verifier._verify_npm(validate_npm_arguments(json.loads(self.rfile.read(length).decode("utf-8")).get("arguments")))
                except (AttributeError, UnicodeError, ValueError, json.JSONDecodeError): self.send_error(400); return
                if result is None: self.send_error(429); return
                response = json.dumps({"returncode": result.returncode, "output": result.output, "timed_out": result.timed_out}, ensure_ascii=False).encode("utf-8")
                self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(response))); self.end_headers(); self.wfile.write(response)
            def log_message(self, _format: str, *_args: object) -> None: return
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), RequestHandler); self._server_thread = threading.Thread(target=self._server.serve_forever, name="flow-bi-frontend-verifier", daemon=True); self._server_thread.start(); return self
    def __exit__(self, *_args: object) -> None:
        if self._server is not None: self._server.shutdown(); self._server.server_close()
        if self._server_thread is not None: self._server_thread.join()
        self._server = self._server_thread = None

def _resolve_npm_executable() -> str:
    for candidate in ("npm.cmd", "npm"):
        if executable := shutil.which(candidate): return executable
    raise OSError("npm executable was not found")
def _timeout_output(error: subprocess.TimeoutExpired) -> str:
    output = error.stdout if error.stdout is not None else error.output
    return output.decode("utf-8", errors="replace") if isinstance(output, bytes) else output or ""
