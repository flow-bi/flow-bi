from __future__ import annotations

from collections.abc import Mapping
import json
import urllib.error
import urllib.parse
import urllib.request


def validate_loopback_http_url(url: str, endpoint: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or parsed.port is None
        or not 1 <= parsed.port <= 65535
        or parsed.path != endpoint
        or parsed.username is not None
        or parsed.password is not None
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("URL is not an allowed localhost loopback endpoint")


def post_json(
    url: str, token: str, payload: Mapping[str, object], *, timeout: int
) -> dict[str, object]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        response_payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(response_payload, dict):
        raise ValueError("response contract is invalid")
    return response_payload
