from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import unittest


VERIFIER = (
    Path(__file__).resolve().parents[3]
    / "scripts"
    / "verifier_runtime"
    / "frontend_verifier.py"
)


class FrontendVerifierRuntimeCliTests(unittest.TestCase):
    def test_no_arguments_prints_usage_without_import_error(self) -> None:
        result = subprocess.run(
            [sys.executable, str(VERIFIER)],
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertEqual(
            result.stderr,
            "Usage: frontend_verifier.py <npm arguments...>\n",
        )


if __name__ == "__main__":
    unittest.main()
