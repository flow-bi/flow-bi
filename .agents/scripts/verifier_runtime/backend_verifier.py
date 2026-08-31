"""Backend verifier Worker CLI."""
from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from verifier_runtime.backend_client import (
    BackendVerifierClientError,
    request_backend_formatting,
    request_backend_verification,
)
from verifier_runtime.backend_formatting import FormatterScope
from verifier_runtime.backend_service import (
    BACKEND_FORMATTER_URL,
    BACKEND_VERIFIER_TOKEN,
    BACKEND_VERIFIER_URL,
    BackendVerifier,
    BackendVerificationResult,
    validate_gradle_arguments,
)


def main(arguments: Sequence[str] | None = None) -> int:
    values = list(sys.argv[1:] if arguments is None else arguments)
    if not values:
        print("Usage: backend_verifier.py <Gradle arguments...> | format-java <Backend Java paths...>", file=sys.stderr)
        return 2
    try:
        result = request_backend_formatting(values[1:]) if values[0] == "format-java" else request_backend_verification(values)
    except BackendVerifierClientError as error:
        print(str(error), file=sys.stderr)
        return 2
    if result.output:
        print(result.output, end="" if result.output.endswith("\n") else "\n")
    if result.timed_out:
        print("Backend Gradle verification timed out.", file=sys.stderr)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
