"""Worker-facing CLI for explicit phase and structured tool timing markers."""

from __future__ import annotations

import json
import os
import sys
from urllib.error import URLError
from urllib.request import Request, urlopen

from .timing import EventValidationError, PHASES, validate_loopback_url


def emit_worker_event(event: dict[str, object], environment: dict[str, str] | None = None) -> dict[str, object]:
    env = environment or os.environ
    url = validate_loopback_url(env.get("FLOW_BI_WORKER_EVENT_URL", ""))
    run_id = env.get("FLOW_BI_RUN_ID")
    token = env.get("FLOW_BI_WORKER_EVENT_TOKEN")
    if not run_id or not token:
        raise EventValidationError("Worker event credentials are missing.")
    payload = json.dumps({**event, "run_id": run_id, "token": token}).encode("utf-8")
    request = Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=5) as response:  # noqa: S310 - URL is validated above
            result = json.loads(response.read().decode("utf-8"))
    except (URLError, OSError, UnicodeError, json.JSONDecodeError) as error:
        raise EventValidationError("Worker event was not accepted.") from error
    if not isinstance(result, dict) or result.get("ok") is not True:
        raise EventValidationError("Worker event was rejected.")
    return result


def main(arguments: list[str] | None = None) -> int:
    values = list(sys.argv[1:] if arguments is None else arguments)
    if len(values) != 1 or values[0] not in PHASES:
        print("usage: phase_marker.py <phase>", file=sys.stderr)
        return 2
    try:
        emit_worker_event({"event_type": "phase", "phase": values[0]})
    except EventValidationError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
