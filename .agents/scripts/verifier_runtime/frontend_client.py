from __future__ import annotations
from collections.abc import Mapping, Sequence
import os
import urllib.error
from .frontend_service import DEFAULT_FRONTEND_TIMEOUT_SECONDS, FRONTEND_VERIFIER_TOKEN, FRONTEND_VERIFIER_URL, FrontendVerificationResult
from .transport import post_json, validate_loopback_http_url
class FrontendVerifierClientError(RuntimeError): pass
def request_frontend_verification(arguments: Sequence[str], environment: Mapping[str, str] = os.environ) -> FrontendVerificationResult:
    url, token = environment.get(FRONTEND_VERIFIER_URL), environment.get(FRONTEND_VERIFIER_TOKEN)
    if not url or not token: raise FrontendVerifierClientError("Frontend verifier connection details are unavailable. Run from a harness Worker.")
    try:
        validate_loopback_http_url(url, "/verify/npm"); response = post_json(url, token, {"arguments": list(arguments)}, timeout=DEFAULT_FRONTEND_TIMEOUT_SECONDS + 30)
        if type(response.get("returncode")) is not int or not isinstance(response.get("output", ""), str) or type(response.get("timed_out", False)) is not bool: raise ValueError("응답 계약이 유효하지 않습니다.")
    except urllib.error.HTTPError as error:
        error.close(); raise FrontendVerifierClientError(f"Frontend 검증기 요청이 거부되었습니다: HTTP {error.code}") from error
    except (OSError, UnicodeError, ValueError) as error: raise FrontendVerifierClientError(f"Frontend verifier call failed: {error}") from error
    return FrontendVerificationResult(response["returncode"], response.get("output", ""), response.get("timed_out", False))
