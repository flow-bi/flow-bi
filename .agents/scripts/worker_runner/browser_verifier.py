from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import secrets
import shutil
import subprocess
import tempfile
import threading
import urllib.error
import urllib.request


BROWSER_VERIFIER_URL = "FLOW_BI_BROWSER_VERIFIER_URL"
BROWSER_VERIFIER_TOKEN = "FLOW_BI_BROWSER_VERIFIER_TOKEN"
DEFAULT_CYPRESS_TIMEOUT_SECONDS = 15 * 60

SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]


@dataclass(frozen=True)
class BrowserVerificationResult:
    returncode: int
    output: str
    timed_out: bool = False


class BrowserVerifierClientError(RuntimeError):
    """Worker가 부모의 브라우저 검증기를 호출할 수 없을 때 발생한다."""


def _resolve_npm_executable() -> str:
    for candidate in ("npm.cmd", "npm"):
        executable = shutil.which(candidate)
        if executable is not None:
            return executable
    raise RuntimeError("PATH에서 npm 실행 파일을 찾을 수 없습니다.")


class BrowserVerifier:
    """Harness 부모에서 고정된 Cypress 검증만 수행하는 loopback 서비스."""

    def __init__(
        self,
        project_root: Path,
        *,
        runner: SubprocessRunner = subprocess.run,
        npm_executable: str | None = None,
        timeout: int = DEFAULT_CYPRESS_TIMEOUT_SECONDS,
    ) -> None:
        self._project_root = project_root.resolve()
        self._runner = runner
        self._npm_executable = npm_executable
        self._timeout = timeout
        self._token = secrets.token_urlsafe(32)
        self._execution_lock = threading.Lock()
        self._server: ThreadingHTTPServer | None = None
        self._server_thread: threading.Thread | None = None

    @property
    def environment(self) -> dict[str, str]:
        if self._server is None:
            raise RuntimeError("브라우저 검증기가 시작되지 않았습니다.")
        host, port = self._server.server_address
        return {
            BROWSER_VERIFIER_URL: f"http://{host}:{port}/verify/cypress",
            BROWSER_VERIFIER_TOKEN: self._token,
        }

    def _verify_cypress(self) -> BrowserVerificationResult:
        with self._execution_lock:
            executable = self._npm_executable or _resolve_npm_executable()
            environment = os.environ.copy()
            environment.pop(BROWSER_VERIFIER_URL, None)
            environment.pop(BROWSER_VERIFIER_TOKEN, None)
            with tempfile.TemporaryDirectory(
                prefix="flow-bi-cypress-artifacts-"
            ) as artifact_root:
                environment["CYPRESS_screenshotsFolder"] = str(
                    Path(artifact_root) / "screenshots"
                )
                try:
                    result = self._runner(
                        [executable, "run", "test:e2e"],
                        cwd=self._project_root / "frontend",
                        env=environment,
                        timeout=self._timeout,
                        text=True,
                        encoding="utf-8",
                        errors="replace",
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        check=False,
                    )
                except subprocess.TimeoutExpired as error:
                    output = error.stdout or ""
                    if isinstance(output, bytes):
                        output = output.decode("utf-8", errors="replace")
                    return BrowserVerificationResult(124, output, timed_out=True)

        return BrowserVerificationResult(
            result.returncode,
            result.stdout or "",
        )

    def __enter__(self) -> BrowserVerifier:
        verifier = self

        class RequestHandler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                authorization = self.headers.get("Authorization", "")
                if (
                    self.path != "/verify/cypress"
                    or not secrets.compare_digest(
                        authorization,
                        f"Bearer {verifier._token}",
                    )
                ):
                    self.send_error(401)
                    return

                content_length = int(self.headers.get("Content-Length", "0"))
                if content_length > 1024:
                    self.send_error(413)
                    return
                if content_length:
                    self.rfile.read(content_length)

                result = verifier._verify_cypress()
                payload = json.dumps(
                    {
                        "returncode": result.returncode,
                        "output": result.output,
                        "timed_out": result.timed_out,
                    },
                    ensure_ascii=False,
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, _format: str, *_args: object) -> None:
                return

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), RequestHandler)
        self._server_thread = threading.Thread(
            target=self._server.serve_forever,
            name="flow-bi-browser-verifier",
            daemon=True,
        )
        self._server_thread.start()
        return self

    def __exit__(self, *_args: object) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._server_thread is not None:
            self._server_thread.join()
        self._server = None
        self._server_thread = None


def request_cypress_verification(
    environment: Mapping[str, str] = os.environ,
) -> BrowserVerificationResult:
    url = environment.get(BROWSER_VERIFIER_URL)
    token = environment.get(BROWSER_VERIFIER_TOKEN)
    if not url or not token:
        raise BrowserVerifierClientError(
            "브라우저 검증기 연결 정보가 없습니다. harness-exec Worker에서 실행하십시오."
        )

    request = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(
            request,
            timeout=DEFAULT_CYPRESS_TIMEOUT_SECONDS + 30,
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error.close()
        raise BrowserVerifierClientError(
            f"브라우저 검증기 요청이 거부되었습니다: HTTP {error.code}"
        ) from error
    except (OSError, UnicodeError, ValueError) as error:
        raise BrowserVerifierClientError(
            f"브라우저 검증기 호출에 실패했습니다: {error}"
        ) from error

    return BrowserVerificationResult(
        returncode=int(payload["returncode"]),
        output=str(payload.get("output", "")),
        timed_out=bool(payload.get("timed_out", False)),
    )
