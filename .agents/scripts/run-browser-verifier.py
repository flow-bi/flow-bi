from __future__ import annotations

from pathlib import Path
import sys


SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from worker_runner.browser_verifier import (
    BrowserVerifierClientError,
    request_cypress_verification,
)


def main(arguments: list[str] | None = None) -> int:
    values = sys.argv[1:] if arguments is None else arguments
    if values != ["cypress"]:
        print(
            "사용법: python .agents/scripts/run-browser-verifier.py cypress",
            file=sys.stderr,
        )
        return 2

    try:
        result = request_cypress_verification()
    except BrowserVerifierClientError as error:
        print(str(error), file=sys.stderr)
        return 2

    if result.output:
        print(result.output, end="" if result.output.endswith("\n") else "\n")
    if result.timed_out:
        print("Cypress 검증 시간이 초과되었습니다.", file=sys.stderr)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
