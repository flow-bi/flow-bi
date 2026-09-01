from __future__ import annotations

import json
from pathlib import Path

from .request import WorkerExecutionRequest


PROMPTS_DIR = Path(__file__).with_name("prompts")
GUIDANCE_FILES = (
    PROMPTS_DIR / "common-guidance.md",
    PROMPTS_DIR / "execution-guidance.md",
    PROMPTS_DIR / "verification-guidance.md",
)
RESULT_GUIDANCE_FILE = PROMPTS_DIR / "result-guidance.md"


def build_worker_prompt(request: WorkerExecutionRequest) -> str:
    """Markdown 지침과 Task 실행 정보를 순서대로 조립한다."""
    parts = [
        request.common_prompt,
        *(path.read_text(encoding="utf-8").strip() for path in GUIDANCE_FILES),
        "## Task 실행 정보\n\n"
        + json.dumps(
            {
                "task_number": request.task_number,
                "execution_context": request.task_execution_context,
                "decision_correction": request.decision_correction,
            },
            ensure_ascii=False,
            indent=2,
        ),
    ]
    if request.additional_request:
        parts.append(request.additional_request)
    parts.extend((request.title, request.task_prompt))
    parts.append(RESULT_GUIDANCE_FILE.read_text(encoding="utf-8").strip())
    return "\n\n".join(part for part in parts if part)
