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
    worker, prompt = read_invocation()
    execute_worker(worker, prompt)


if __name__ == "__main__":
    main()
