from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request


FRONTEND_VERIFIER_URL = "FLOW_BI_FRONTEND_VERIFIER_URL"
FRONTEND_VERIFIER_TOKEN = "FLOW_BI_FRONTEND_VERIFIER_TOKEN"
DEFAULT_FRONTEND_TIMEOUT_SECONDS = 15 * 60
MAX_REQUEST_BYTES = 4096
MAX_PACKAGES = 32
PACKAGE_NAME = re.compile(
    r"(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*)$"
)
SCRIPT_NAMES = frozenset({"test:unit", "typecheck", "check"})

SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]


@dataclass(frozen=True)
class FrontendVerificationResult:
    returncode: int
    output: str
    timed_out: bool = False


class FrontendVerifierClientError(RuntimeError):
    """Worker가 부모의 Frontend 검증기를 호출할 수 없을 때 발생한다."""


def _resolve_npm_executable() -> str:
    for candidate in ("npm.cmd", "npm"):
        executable = shutil.which(candidate)
        if executable is not None:
            return executable
    raise RuntimeError("PATH에서 npm 실행 파일을 찾을 수 없습니다.")


def _validate_npm_arguments(arguments: object) -> tuple[str, ...]:
    if not isinstance(arguments, list) or not all(
        isinstance(argument, str) and argument for argument in arguments
    ):
        raise ValueError("허용된 npm 인자 형식이 아닙니다.")
    if arguments[:1] == ["ls"]:
        packages = arguments[1:]
        if len(packages) > MAX_PACKAGES or not all(PACKAGE_NAME.fullmatch(name) for name in packages):
            raise ValueError("허용되지 않은 npm package 이름입니다.")
        return tuple(arguments)
    if len(arguments) == 2 and arguments[0] == "run" and arguments[1] in SCRIPT_NAMES:
        return tuple(arguments)
    raise ValueError("허용되지 않은 npm 검증 명령입니다.")


def _timeout_output(error: subprocess.TimeoutExpired) -> str:
    output = error.stdout if error.stdout is not None else error.output
    return output.decode("utf-8", errors="replace") if isinstance(output, bytes) else output or ""


class FrontendVerifier:
    """Harness 부모에서 고정된 Frontend npm 검증만 수행하는 loopback 서비스."""

    def __init__(
        self,
        project_root: Path,
        *,
        runner: SubprocessRunner = subprocess.run,
        npm_executable: str | None = None,
        timeout: int = DEFAULT_FRONTEND_TIMEOUT_SECONDS,
    ) -> None:
        self._frontend_directory = (project_root.resolve() / "frontend").resolve()
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
            raise RuntimeError("Frontend 검증기가 시작되지 않았습니다.")
        host, port = self._server.server_address
        return {
            FRONTEND_VERIFIER_URL: f"http://{host}:{port}/verify/npm",
            FRONTEND_VERIFIER_TOKEN: self._token,
        }

    def _subprocess_environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        environment.pop(FRONTEND_VERIFIER_URL, None)
        environment.pop(FRONTEND_VERIFIER_TOKEN, None)
        return environment

    def _verify_npm(self, arguments: tuple[str, ...]) -> FrontendVerificationResult | None:
        if not self._execution_lock.acquire(blocking=False):
            return None
        try:
            try:
                result = self._runner(
                    [self._npm_executable or _resolve_npm_executable(), *arguments],
                    cwd=self._frontend_directory,
                    env=self._subprocess_environment(),
                    timeout=self._timeout,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    check=False,
                )
            except subprocess.TimeoutExpired as error:
                return FrontendVerificationResult(124, _timeout_output(error), timed_out=True)
            except OSError:
                return FrontendVerificationResult(1, "Frontend npm 검증을 시작할 수 없습니다.")
            return FrontendVerificationResult(result.returncode, result.stdout or "")
        finally:
            self._execution_lock.release()

    def __enter__(self) -> FrontendVerifier:
        verifier = self

        class RequestHandler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                authorization = self.headers.get("Authorization", "")
                if self.path != "/verify/npm" or not secrets.compare_digest(
                    authorization, f"Bearer {verifier._token}"
                ):
                    self.send_error(401)
                    return
                try:
                    content_length = int(self.headers.get("Content-Length", "0"))
                except ValueError:
                    self.send_error(400)
                    return
                if content_length < 0 or content_length > MAX_REQUEST_BYTES:
                    self.send_error(413)
                    return
                try:
                    payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
                    result = verifier._verify_npm(_validate_npm_arguments(payload.get("arguments")))
                except (AttributeError, UnicodeError, ValueError, json.JSONDecodeError):
                    self.send_error(400)
                    return
                if result is None:
                    self.send_error(429)
                    return
                response = json.dumps(
                    {
                        "returncode": result.returncode,
                        "output": result.output,
                        "timed_out": result.timed_out,
                    },
                    ensure_ascii=False,
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(response)))
                self.end_headers()
                self.wfile.write(response)

            def log_message(self, _format: str, *_args: object) -> None:
                return

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), RequestHandler)
        self._server_thread = threading.Thread(
            target=self._server.serve_forever,
            name="flow-bi-frontend-verifier",
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


def _validate_verifier_url(url: str) -> None:
    try:
        parsed = urllib.parse.urlparse(url)
        port = parsed.port
    except ValueError as error:
        raise FrontendVerifierClientError("Frontend 검증기 URL이 허용된 localhost 주소가 아닙니다.") from error
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or port is None
        or not 1 <= port <= 65535
        or parsed.path != "/verify/npm"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise FrontendVerifierClientError("Frontend 검증기 URL이 허용된 localhost 주소가 아닙니다.")


def request_frontend_verification(
    arguments: Sequence[str], environment: Mapping[str, str] = os.environ
) -> FrontendVerificationResult:
    url = environment.get(FRONTEND_VERIFIER_URL)
    token = environment.get(FRONTEND_VERIFIER_TOKEN)
    if not url or not token:
        raise FrontendVerifierClientError("Frontend 검증기 연결 정보가 없습니다. harness-exec Worker에서 실행하십시오.")
    _validate_verifier_url(url)
    try:
        payload = json.dumps({"arguments": list(arguments)}).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=DEFAULT_FRONTEND_TIMEOUT_SECONDS + 30) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
        if (
            not isinstance(response_payload, dict)
            or type(response_payload.get("returncode")) is not int
            or not isinstance(response_payload.get("output", ""), str)
            or type(response_payload.get("timed_out", False)) is not bool
        ):
            raise ValueError("응답 계약이 유효하지 않습니다.")
    except urllib.error.HTTPError as error:
        error.close()
        raise FrontendVerifierClientError(f"Frontend 검증기 요청이 거부되었습니다: HTTP {error.code}") from error
    except (OSError, UnicodeError, ValueError) as error:
        raise FrontendVerifierClientError(f"Frontend 검증기 호출에 실패했습니다: {error}") from error
    return FrontendVerificationResult(
        returncode=response_payload["returncode"],
        output=response_payload.get("output", ""),
        timed_out=response_payload.get("timed_out", False),
    )


def main(arguments: Sequence[str] | None = None) -> int:
    values = list(sys.argv[1:] if arguments is None else arguments)
    if not values:
        print("사용법: python .agents/scripts/worker_runner/frontend_verifier.py <npm 인자...>", file=sys.stderr)
        return 2
    try:
        result = request_frontend_verification(values)
    except FrontendVerifierClientError as error:
        print(str(error), file=sys.stderr)
        return 2
    if result.output:
        sys.stdout.write(result.output)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
