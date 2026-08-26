from __future__ import annotations

from collections.abc import Mapping, Sequence
import os
import urllib.error

from .backend_service import BACKEND_FORMATTER_URL, BACKEND_VERIFIER_TOKEN, BACKEND_VERIFIER_URL, DEFAULT_FORMATTER_TIMEOUT_SECONDS, DEFAULT_GRADLE_TIMEOUT_SECONDS, BackendVerificationResult
from .transport import post_json, validate_loopback_http_url


class BackendVerifierClientError(RuntimeError):
    """The Worker cannot safely call its parent Backend verifier."""


def _request(endpoint: str, payload: dict[str, object], environment: Mapping[str, str], *, formatter: bool) -> BackendVerificationResult:
    url = environment.get(BACKEND_FORMATTER_URL if formatter else BACKEND_VERIFIER_URL)
    token = environment.get(BACKEND_VERIFIER_TOKEN)
    name = "Backend formatter" if formatter else "Backend verifier"
    if not url or not token:
        raise BackendVerifierClientError(f"{name} connection details are unavailable. Run from a harness Worker.")
    try:
        validate_loopback_http_url(url, endpoint)
        response = post_json(url, token, payload, timeout=(DEFAULT_FORMATTER_TIMEOUT_SECONDS if formatter else DEFAULT_GRADLE_TIMEOUT_SECONDS) + 30)
        if type(response.get("returncode")) is not int or not isinstance(response.get("output", ""), str) or type(response.get("timed_out", False)) is not bool:
            raise ValueError("response contract is invalid")
    except urllib.error.HTTPError as error:
        error.close()
        raise BackendVerifierClientError(f"{name} 요청이 거부되었습니다: HTTP {error.code}") from error
    except (OSError, UnicodeError, ValueError) as error:
        raise BackendVerifierClientError(f"{name} call failed: {error}") from error
    return BackendVerificationResult(response["returncode"], response.get("output", ""), response.get("timed_out", False))


def request_backend_verification(arguments: Sequence[str], environment: Mapping[str, str] = os.environ) -> BackendVerificationResult:
    return _request("/verify/gradle", {"arguments": list(arguments)}, environment, formatter=False)


def request_backend_formatting(paths: Sequence[str], environment: Mapping[str, str] = os.environ) -> BackendVerificationResult:
    return _request("/format/java", {"paths": list(paths)}, environment, formatter=True)
