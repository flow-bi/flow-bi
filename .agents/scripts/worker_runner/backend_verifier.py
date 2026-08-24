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
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request


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

SubprocessRunner = Callable[..., subprocess.CompletedProcess[str]]


@dataclass(frozen=True)
class BackendVerificationResult:
    returncode: int
    output: str
    timed_out: bool = False


@dataclass(frozen=True)
class FormatterScope:
    allowed_paths: tuple[Path, ...]
    forbidden_paths: tuple[Path, ...]


@dataclass
class _InFlightVerification:
    completed: threading.Event
    result: BackendVerificationResult | None = None


class BackendVerifierClientError(RuntimeError):
    """Worker가 부모의 Backend 검증기를 호출할 수 없을 때 발생한다."""


def _validate_gradle_arguments(arguments: object) -> tuple[str, ...]:
    if not isinstance(arguments, list) or not arguments or len(arguments) > MAX_ARGUMENTS:
        raise ValueError("허용된 Gradle 인자 형식이 아닙니다.")
    if not all(isinstance(argument, str) and argument for argument in arguments):
        raise ValueError("Gradle 인자는 비어 있지 않은 문자열이어야 합니다.")

    has_task = False
    index = 0
    while index < len(arguments):
        argument = arguments[index]
        if argument in GRADLE_TASKS:
            has_task = True
        elif argument in GRADLE_FLAGS:
            pass
        elif argument == "--tests":
            index += 1
            if index == len(arguments) or not TEST_FILTER.fullmatch(arguments[index]):
                raise ValueError("허용되지 않은 Gradle 테스트 필터입니다.")
        elif argument.startswith("--tests="):
            if not TEST_FILTER.fullmatch(argument.removeprefix("--tests=")):
                raise ValueError("허용되지 않은 Gradle 테스트 필터입니다.")
        else:
            raise ValueError("허용되지 않은 Gradle Task 또는 옵션입니다.")
        index += 1

    if not has_task:
        raise ValueError("Gradle 검증 Task가 필요합니다.")
    return tuple(arguments)


def _output_from_timeout(error: subprocess.TimeoutExpired) -> str:
    output = error.stdout if error.stdout is not None else error.output
    if isinstance(output, bytes):
        return output.decode("utf-8", errors="replace")
    return output or ""


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def _is_within_contract(path: Path, contracts: Sequence[Path]) -> bool:
    return any(_is_within(path, contract) for contract in contracts)


class BackendVerifier:
    """부모 프로세스에서 allowlist된 Gradle 검증만 실행하는 loopback 서비스."""

    def __init__(
        self,
        project_root: Path,
        *,
        runner: SubprocessRunner = subprocess.run,
        timeout: int = DEFAULT_GRADLE_TIMEOUT_SECONDS,
        os_name: str = os.name,
    ) -> None:
        self._project_root = project_root.resolve()
        self._backend_directory = (self._project_root / "backend").resolve()
        self._wrapper_name = "gradlew.bat" if os_name == "nt" else "gradlew"
        self._gradlew = self._backend_directory / self._wrapper_name
        self._runner = runner
        self._timeout = timeout
        self._token = secrets.token_urlsafe(32)
        self._formatter_tokens: dict[str, FormatterScope] = {}
        self._execution_lock = threading.Lock()
        self._in_flight_lock = threading.Lock()
        self._in_flight: dict[tuple[object, ...], _InFlightVerification] = {}
        self._server: ThreadingHTTPServer | None = None
        self._server_thread: threading.Thread | None = None

    @property
    def environment(self) -> dict[str, str]:
        if self._server is None:
            raise RuntimeError("Backend 검증기가 시작되지 않았습니다.")
        host, port = self._server.server_address
        return {
            BACKEND_VERIFIER_URL: f"http://{host}:{port}/verify/gradle",
            BACKEND_VERIFIER_TOKEN: self._token,
        }

    def environment_for_task(
        self,
        allowed_paths: Sequence[str],
        forbidden_paths: Sequence[str],
    ) -> dict[str, str]:
        """현재 Task의 경로 계약에만 유효한 formatter 연결 정보를 발급한다."""
        scope = self._formatter_scope(allowed_paths, forbidden_paths)
        if self._server is None:
            raise RuntimeError("Backend 검증기가 시작되지 않았습니다.")
        token = secrets.token_urlsafe(32)
        self._formatter_tokens[token] = scope
        host, port = self._server.server_address
        return {
            **self.environment,
            BACKEND_FORMATTER_URL: f"http://{host}:{port}/format/java",
            BACKEND_VERIFIER_TOKEN: token,
        }

    def _formatter_scope(
        self, allowed_paths: Sequence[str], forbidden_paths: Sequence[str]
    ) -> FormatterScope:
        return FormatterScope(
            tuple(self._contract_path(value) for value in allowed_paths),
            tuple(self._contract_path(value) for value in forbidden_paths),
        )

    def _contract_path(self, value: str) -> Path:
        if not isinstance(value, str) or not value:
            raise ValueError("Formatter Task 경로 계약이 유효하지 않습니다.")
        path = Path(value)
        if (
            path.is_absolute()
            or any(part in {"", ".", ".."} for part in path.parts)
        ):
            raise ValueError("Formatter Task 경로 계약이 유효하지 않습니다.")
        relative = Path(*path.parts)
        if relative.parts[0] != "backend":
            return relative
        return relative

    def _format_targets(self, values: object, scope: FormatterScope) -> tuple[Path, ...]:
        if not isinstance(values, list) or not values:
            raise ValueError("포맷할 Backend Java 파일이 필요합니다.")
        targets: list[Path] = []
        for value in values:
            if not isinstance(value, str):
                raise ValueError("Formatter 경로가 유효하지 않습니다.")
            relative = self._contract_path(value)
            if relative.suffix != ".java" or relative.parts[0] != "backend":
                raise ValueError("Backend Java 파일만 포맷할 수 있습니다.")
            if not _is_within_contract(relative, scope.allowed_paths) or _is_within_contract(
                relative, scope.forbidden_paths
            ):
                raise ValueError("Formatter 경로가 Task 범위를 벗어났습니다.")
            target = self._project_root / relative
            if target.is_symlink() or not target.is_file() or not _is_within(target, self._backend_directory):
                raise ValueError("Formatter 대상은 backend 아래의 일반 파일이어야 합니다.")
            resolved = target.resolve()
            if not _is_within(resolved, self._backend_directory) or resolved != target:
                raise ValueError("Formatter 대상이 저장소를 벗어났습니다.")
            if target not in targets:
                targets.append(target)
        return tuple(targets)

    def _run_single_flight(
        self,
        key: tuple[object, ...],
        operation: Callable[[], BackendVerificationResult],
    ) -> BackendVerificationResult | None:
        with self._in_flight_lock:
            in_flight = self._in_flight.get(key)
            if in_flight is not None:
                is_owner = False
            elif not self._execution_lock.acquire(blocking=False):
                return None
            else:
                in_flight = _InFlightVerification(threading.Event())
                self._in_flight[key] = in_flight
                is_owner = True

        if not is_owner:
            in_flight.completed.wait()
            if in_flight.result is None:
                return BackendVerificationResult(1, "Backend 검증 실행이 완료되지 않았습니다.")
            return in_flight.result

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

    def _format_java(self, targets: tuple[Path, ...]) -> BackendVerificationResult | None:
        return self._run_single_flight(
            ("format-java", *(str(target) for target in targets)),
            lambda: self._format_java_once(targets),
        )

    def _format_java_once(self, targets: tuple[Path, ...]) -> BackendVerificationResult:
        with tempfile.TemporaryDirectory(prefix="flow-bi-spotless-") as temporary:
            workspace = Path(temporary) / "backend"
            try:
                self._create_formatter_workspace(workspace, targets)
                result = self._runner(
                    [str(workspace / self._wrapper_name), "spotlessApply", "--no-daemon"],
                    cwd=workspace,
                    env=self._subprocess_environment(),
                    timeout=DEFAULT_FORMATTER_TIMEOUT_SECONDS,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    check=False,
                )
            except subprocess.TimeoutExpired as error:
                return BackendVerificationResult(124, _output_from_timeout(error), timed_out=True)
            except (OSError, shutil.Error) as error:
                return BackendVerificationResult(
                    1,
                    self._process_start_failure("Backend Java formatter", error),
                )
            if result.returncode != 0:
                return BackendVerificationResult(result.returncode, result.stdout or "")
            try:
                self._apply_formatted_targets(workspace, targets)
            except OSError:
                return BackendVerificationResult(1, "포맷 결과를 안전하게 반영할 수 없습니다.")
            return BackendVerificationResult(0, result.stdout or "")

    def _subprocess_environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        environment.pop(BACKEND_VERIFIER_URL, None)
        environment.pop(BACKEND_VERIFIER_TOKEN, None)
        environment.pop(BACKEND_FORMATTER_URL, None)
        return environment

    def _create_formatter_workspace(self, workspace: Path, targets: tuple[Path, ...]) -> None:
        workspace.mkdir(parents=True)
        for relative in (
            self._wrapper_name,
            "settings.gradle",
            "build.gradle",
            "gradle",
            "config",
        ):
            source = self._backend_directory / relative
            destination = workspace / relative
            if source.is_symlink() or not source.exists():
                raise OSError("Formatter 설정 파일이 유효하지 않습니다.")
            if source.is_dir():
                shutil.copytree(source, destination, symlinks=False)
            else:
                shutil.copy2(source, destination)
        for target in targets:
            relative = target.relative_to(self._backend_directory)
            destination = workspace / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, destination)

    def _apply_formatted_targets(self, workspace: Path, targets: tuple[Path, ...]) -> None:
        replacements: list[tuple[Path, Path]] = []
        for target in targets:
            if target.is_symlink() or not target.is_file() or target.resolve() != target:
                raise OSError("Formatter 대상이 변경되었습니다.")
            formatted = workspace / target.relative_to(self._backend_directory)
            if formatted.is_symlink() or not formatted.is_file():
                raise OSError("Formatter 결과가 유효하지 않습니다.")
            staged = target.with_name(f".{target.name}.{secrets.token_hex(8)}.tmp")
            shutil.copy2(formatted, staged)
            replacements.append((target, staged))
        try:
            for target, staged in replacements:
                os.replace(staged, target)
        finally:
            for _target, staged in replacements:
                staged.unlink(missing_ok=True)

    def _verify_gradle(self, arguments: tuple[str, ...]) -> BackendVerificationResult | None:
        return self._run_single_flight(
            ("gradle", *arguments), lambda: self._verify_gradle_once(arguments)
        )

    def _verify_gradle_once(self, arguments: tuple[str, ...]) -> BackendVerificationResult:
        try:
            result = self._runner(
                [str(self._gradlew), *arguments],
                cwd=self._backend_directory,
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
            return BackendVerificationResult(124, _output_from_timeout(error), timed_out=True)
        except OSError as error:
            return BackendVerificationResult(
                1,
                self._process_start_failure("Backend Gradle", error),
            )
        return BackendVerificationResult(result.returncode, result.stdout or "")

    def _process_start_failure(self, operation: str, error: OSError) -> str:
        error_code = getattr(error, "winerror", None) or error.errno
        code_detail = f" (OS 오류 {error_code})" if error_code is not None else ""
        return f"{operation} 실행 파일 {self._wrapper_name}을 시작할 수 없습니다{code_detail}."

    def __enter__(self) -> BackendVerifier:
        verifier = self

        class RequestHandler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                authorization = self.headers.get("Authorization", "")
                token = authorization.removeprefix("Bearer ")
                is_gradle_request = self.path == "/verify/gradle" and (
                    secrets.compare_digest(token, verifier._token) or token in verifier._formatter_tokens
                )
                is_format_request = self.path == "/format/java" and token in verifier._formatter_tokens
                if not is_gradle_request and not is_format_request:
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
                    if is_gradle_request:
                        result = verifier._verify_gradle(_validate_gradle_arguments(payload.get("arguments")))
                    else:
                        result = verifier._format_java(
                            verifier._format_targets(payload.get("paths"), verifier._formatter_tokens[token])
                        )
                except (UnicodeError, ValueError, json.JSONDecodeError, AttributeError):
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
            name="flow-bi-backend-verifier",
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
        self._formatter_tokens.clear()


def _validate_verifier_url(url: str) -> None:
    try:
        parsed = urllib.parse.urlparse(url)
        port = parsed.port
    except ValueError as error:
        raise BackendVerifierClientError(
            "Backend 검증기 URL이 허용된 localhost 주소가 아닙니다."
        ) from error
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or port is None
        or parsed.path != "/verify/gradle"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise BackendVerifierClientError("Backend 검증기 URL이 허용된 localhost 주소가 아닙니다.")


def _validate_formatter_url(url: str) -> None:
    try:
        parsed = urllib.parse.urlparse(url)
        port = parsed.port
    except ValueError as error:
        raise BackendVerifierClientError(
            "Backend formatter URL이 허용된 localhost 주소가 아닙니다."
        ) from error
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or port is None
        or parsed.path != "/format/java"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise BackendVerifierClientError("Backend formatter URL이 허용된 localhost 주소가 아닙니다.")


def request_backend_verification(
    arguments: Sequence[str], environment: Mapping[str, str] = os.environ
) -> BackendVerificationResult:
    url = environment.get(BACKEND_VERIFIER_URL)
    token = environment.get(BACKEND_VERIFIER_TOKEN)
    if not url or not token:
        raise BackendVerifierClientError(
            "Backend 검증기 연결 정보가 없습니다. harness-exec Worker에서 실행하십시오."
        )
    _validate_verifier_url(url)
    try:
        payload = json.dumps({"arguments": list(arguments)}).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=DEFAULT_GRADLE_TIMEOUT_SECONDS + 30) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error.close()
        raise BackendVerifierClientError(f"Backend 검증기 요청이 거부되었습니다: HTTP {error.code}") from error
    except (OSError, UnicodeError, ValueError) as error:
        raise BackendVerifierClientError(f"Backend 검증기 호출에 실패했습니다: {error}") from error
    return BackendVerificationResult(
        returncode=int(response_payload["returncode"]),
        output=str(response_payload.get("output", "")),
        timed_out=bool(response_payload.get("timed_out", False)),
    )


def request_backend_formatting(
    paths: Sequence[str], environment: Mapping[str, str] = os.environ
) -> BackendVerificationResult:
    url = environment.get(BACKEND_FORMATTER_URL)
    token = environment.get(BACKEND_VERIFIER_TOKEN)
    if not url or not token:
        raise BackendVerifierClientError(
            "Backend formatter 연결 정보가 없습니다. harness-exec Worker에서 실행하십시오."
        )
    _validate_formatter_url(url)
    try:
        payload = json.dumps({"paths": list(paths)}).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(
            request, timeout=DEFAULT_FORMATTER_TIMEOUT_SECONDS + 30
        ) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error.close()
        raise BackendVerifierClientError(
            f"Backend formatter 요청이 거부되었습니다: HTTP {error.code}"
        ) from error
    except (OSError, UnicodeError, ValueError) as error:
        raise BackendVerifierClientError(f"Backend formatter 호출에 실패했습니다: {error}") from error
    return BackendVerificationResult(
        returncode=int(response_payload["returncode"]),
        output=str(response_payload.get("output", "")),
        timed_out=bool(response_payload.get("timed_out", False)),
    )


def main(arguments: Sequence[str] | None = None) -> int:
    values = list(sys.argv[1:] if arguments is None else arguments)
    if not values:
        print(
            "사용법: python .agents/scripts/worker_runner/backend_verifier.py "
            "<Gradle 인자...> | format-java <backend Java 경로...>",
            file=sys.stderr,
        )
        return 2
    try:
        result = (
            request_backend_formatting(values[1:])
            if values[0] == "format-java"
            else request_backend_verification(values)
        )
    except BackendVerifierClientError as error:
        print(str(error), file=sys.stderr)
        return 2
    if result.output:
        print(result.output, end="" if result.output.endswith("\n") else "\n")
    if result.timed_out:
        print("Backend Gradle 검증 시간이 초과되었습니다.", file=sys.stderr)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
