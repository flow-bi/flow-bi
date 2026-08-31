"""Frontend verifier Worker CLI."""
from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from verifier_runtime.frontend_client import FrontendVerifierClientError, request_frontend_verification
from verifier_runtime.frontend_service import (
    FRONTEND_VERIFIER_TOKEN,
    FRONTEND_VERIFIER_URL,
    FrontendVerifier,
    FrontendVerificationResult,
    validate_npm_arguments,
)


def main(arguments: Sequence[str] | None = None) -> int:
    values = list(sys.argv[1:] if arguments is None else arguments)
    if not values:
        print("Usage: frontend_verifier.py <npm arguments...>", file=sys.stderr)
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
