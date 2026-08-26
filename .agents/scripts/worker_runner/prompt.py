from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Mapping


PROMPT_FILE = Path(__file__).with_name("worker-prompt.md")
_REQUIRED_SECTIONS = (
    "discovery-guidance",
    "context-efficiency-guidance",
    "task-worker-guidance",
    "backend-verification-guidance",
    "backend-formatting-guidance",
    "frontend-verification-guidance",
    "execution-context",
    "execution-rerun",
    "execution-new-or-changed",
    "execution-existing-without-evidence",
    "decision-correction",
    "result-contract",
)


@lru_cache(maxsize=None)
def load_prompt_sections(prompt_file: Path = PROMPT_FILE) -> dict[str, str]:
    """Load the named Worker prompt sections from its single Markdown source."""
    try:
        content = prompt_file.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"unable to read worker prompt: {prompt_file}") from error

    headings = tuple(re.finditer(r"^## ([a-z0-9-]+)\s*$", content, re.MULTILINE))
    sections: dict[str, str] = {}
    for index, heading in enumerate(headings):
        name = heading.group(1)
        if name in sections:
            raise ValueError(f"duplicate prompt section: {name}")
        start = heading.end()
        end = headings[index + 1].start() if index + 1 < len(headings) else len(content)
        sections[name] = content[start:end].strip()

    for name in _REQUIRED_SECTIONS:
        if name not in sections:
            raise ValueError(f"missing required prompt section: {name}")
    return sections


def build_result_contract(number: int, verification_items: tuple[str, ...], *, sections: Mapping[str, str]) -> str:
    verification = [
        {
            "item": item,
            "result": "PASS | FAIL | NOT_RUN",
            "evidence": "실행 명령, 출력 또는 확인 근거",
        }
        for item in verification_items
    ]
    return sections["result-contract"].replace(
        "{{TASK_NUMBER}}", str(number)
    ).replace(
        "{{VERIFICATION_ITEMS}}",
        json.dumps(verification, ensure_ascii=False, indent=2),
    )


def build_worker_prompt(
    *,
    sections: Mapping[str, str],
    common_prompt: str,
    additional_request: str,
    title: str,
    task_prompt: str,
    number: int,
    verification_items: tuple[str, ...],
    execution_context: Mapping[str, object],
    decision_correction: object,
) -> str:
    """Assemble a Worker prompt from already-loaded sections and invocation data."""
    mode = execution_context["mode"]
    execution_section = {
        "rerun": "execution-rerun",
        "new_or_changed": "execution-new-or-changed",
        "existing_without_evidence": "execution-existing-without-evidence",
    }[mode]
    prompt_parts = [
        common_prompt,
        sections["discovery-guidance"],
        sections["context-efficiency-guidance"],
        sections["task-worker-guidance"],
        sections["backend-verification-guidance"],
        sections["backend-formatting-guidance"],
        sections["frontend-verification-guidance"],
        sections["execution-context"] + "\n" + json.dumps(execution_context, ensure_ascii=False, indent=2),
        sections[execution_section],
    ]
    if decision_correction is not None:
        if not isinstance(decision_correction, dict):
            raise ValueError("판정 교정 컨텍스트 형식이 유효하지 않습니다.")
        evidence = decision_correction.get("objective_evidence")
        if not isinstance(evidence, dict):
            raise ValueError("판정 교정에는 기존 검증 증거가 필요합니다.")
        prompt_parts.append(sections["decision-correction"] + "\n" + json.dumps(
            {
                "prior_decision": decision_correction.get("prior_decision"),
                "objective_evidence": evidence,
            },
            ensure_ascii=False,
            indent=2,
        ))
    if additional_request:
        prompt_parts.append(additional_request)
    prompt_parts.extend((
        title,
        task_prompt,
        build_result_contract(number, verification_items, sections=sections),
    ))
    return "\n\n".join(prompt_parts)
