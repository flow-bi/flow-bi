from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from collections.abc import Mapping
from typing import Any


PHASES = frozenset((
    "analysis",
    "test_code",
    "implementation",
    "implementation_and_test",
    "refactor",
    "documentation",
    "verification",
    "finalization",
))


def _error(message: str) -> int:
    print(message, file=sys.stderr)
    return 3


def record_phase(
    phase: str,
    *,
    environment: Mapping[str, str],
    runner: Any = None,
) -> int:
    run_id = environment.get("FLOW_BI_RUN_ID", "").strip()
    task_number = environment.get("FLOW_BI_TASK_NUMBER", "").strip()
    if not run_id or not task_number.isdigit() or int(task_number) < 1:
        return _error(
            "phase marker는 FLOW_BI_RUN_ID와 유효한 FLOW_BI_TASK_NUMBER가 필요합니다."
        )

    source_root = Path(__file__).resolve().parents[3]
    project_root = Path(
        environment.get("FLOW_BI_PROJECT_ROOT")
        or source_root
    ).resolve()
    hook_script = source_root / ".codex" / "hooks" / "log-prompt-detail.mjs"
    if not hook_script.is_file():
        return _error(f"phase 기록 Hook을 찾을 수 없습니다: {hook_script}")

    node = shutil.which("node", path=environment.get("PATH"))
    if node is None:
        return _error("phase 기록에 필요한 node 실행 파일을 찾을 수 없습니다.")

    completed = (subprocess.run if runner is None else runner)(
        [
            node,
            str(hook_script),
            "--worker-phase",
            run_id,
            phase,
            str(project_root),
        ],
        cwd=project_root,
        env=dict(environment),
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or "알 수 없는 Node 실행 오류"
        return _error(f"phase 기록에 실패했습니다: {detail}")
    try:
        result = json.loads(completed.stdout)
    except (json.JSONDecodeError, TypeError):
        return _error("phase 기록기가 유효한 JSON 결과를 반환하지 않았습니다.")
    if result.get("status") not in {"recorded", "phase_unchanged"}:
        return _error(f"phase 기록에 실패했습니다: {result.get('status', 'unknown')}")
    return 0


def main(
    arguments: list[str] | None = None,
    *,
    environment: Mapping[str, str] | None = None,
) -> int:
    values = sys.argv[1:] if arguments is None else arguments
    if len(values) != 1 or values[0] not in PHASES:
        print(
            "사용법: phase_marker.py <analysis|test_code|implementation|"
            "implementation_and_test|refactor|documentation|verification|finalization>",
            file=sys.stderr,
        )
        return 2
    return record_phase(
        values[0],
        environment=os.environ if environment is None else environment,
    )


if __name__ == "__main__":
    raise SystemExit(main())
