from __future__ import annotations

from pathlib import Path
import sys


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
if str(SCRIPT_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIRECTORY))

from worker_runner import (
    execute_worker,
    read_invocation,
)


def main() -> None:
    prompt, allowed_paths, forbidden_paths = read_invocation()
    execute_worker(prompt, allowed_paths, forbidden_paths)


if __name__ == "__main__":
    main()
