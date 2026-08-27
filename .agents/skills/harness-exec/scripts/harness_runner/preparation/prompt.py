from __future__ import annotations

from dataclasses import dataclass
import json
import re
from pathlib import Path
from typing import Mapping

from ..models import TaskExecutionContext, TaskInvocation


HARNESS_PROMPT_FILE = Path(__file__).with_name("prompt.md")
WORKER_GUIDANCE_FILE = Path(__file__).resolve().parents[5] / "scripts" / "worker_runner" / "worker-guidance.md"
_HARNESS_SECTIONS = ("discovery-guidance", "context-efficiency-guidance", "execution-context", "execution-rerun", "execution-new-or-changed", "execution-existing-without-evidence", "decision-correction", "result-contract")
_WORKER_SECTIONS = ("worker-execution-guidance", "backend-verification-guidance", "backend-formatting-guidance", "frontend-verification-guidance")


def _load_sections(path: Path, required: tuple[str, ...]) -> dict[str, str]:
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"unable to read prompt guidance: {path}") from error
    headings = tuple(re.finditer(r"^## ([a-z0-9-]+)\s*$", content, re.MULTILINE))
    sections: dict[str, str] = {}
    for index, heading in enumerate(headings):
        name = heading.group(1)
        if name in sections:
            raise ValueError(f"duplicate prompt section: {name}")
        end = headings[index + 1].start() if index + 1 < len(headings) else len(content)
        sections[name] = content[heading.end():end].strip()
    for name in required:
        if not sections.get(name):
            raise ValueError(f"missing required prompt section: {name}")
    return sections


def validate_execution_context(context: TaskExecutionContext | None, number: int) -> dict[str, object]:
    if context is None:
        return {"plan_id": "unknown", "fingerprint": "unknown", "mode": "existing_without_evidence", "prior_tdd_evidence": None, "prior_evidence_id": None}
    if not isinstance(context.plan_id, str) or not context.plan_id.strip() or not isinstance(context.fingerprint, str) or not context.fingerprint.strip():
        raise ValueError("execution context requires plan_id and fingerprint")
    if context.mode not in {"rerun", "new_or_changed", "existing_without_evidence"}:
        raise ValueError("execution context has invalid mode")
    prior = context.prior_tdd_evidence
    valid_prior = isinstance(prior, dict) and prior.get("result") == "PASS" and isinstance(prior.get("evidence"), str) and bool(prior["evidence"].strip())
    if context.mode == "rerun" and not valid_prior:
        raise ValueError("rerun requires verified prior TDD evidence")
    if context.mode != "rerun" and prior is not None:
        raise ValueError("only rerun may use prior TDD evidence")
    return {"plan_id": context.plan_id, "fingerprint": context.fingerprint, "mode": context.mode, "prior_tdd_evidence": prior, "prior_evidence_id": f"plan:{context.plan_id}:task:{number}:fingerprint:{context.fingerprint}" if context.mode == "rerun" else None}


def build_result_contract(number: int, verification_items: tuple[str, ...], *, sections: Mapping[str, str]) -> str:
    verification = [{"item": item, "result": "PASS | FAIL | NOT_RUN", "evidence": "execution command, output, or confirmation"} for item in verification_items]
    return sections["result-contract"].replace("{{TASK_NUMBER}}", str(number)).replace("{{VERIFICATION_ITEMS}}", json.dumps(verification, ensure_ascii=False, indent=2))


def select_worker_guidance(task_paths: tuple[str, ...], sections: Mapping[str, str]) -> tuple[str, ...]:
    selected = [sections["worker-execution-guidance"]]
    if any(path == "backend" or path.startswith("backend/") for path in task_paths):
        selected.extend((sections["backend-verification-guidance"], sections["backend-formatting-guidance"]))
    if any(path == "frontend" or path.startswith("frontend/") for path in task_paths):
        selected.append(sections["frontend-verification-guidance"])
    return tuple(selected)


@dataclass(frozen=True)
class PreparedWorkerPrompt:
    task_number: int
    guidance: tuple[str, ...]
    result_contract: str


@dataclass(frozen=True)
class WorkerPromptTemplate:
    harness_sections: Mapping[str, str]
    worker_guidance_sections: Mapping[str, str]

    @classmethod
    def load(cls, harness_prompt_file: Path = HARNESS_PROMPT_FILE, worker_guidance_file: Path = WORKER_GUIDANCE_FILE) -> "WorkerPromptTemplate":
        return cls(_load_sections(harness_prompt_file, _HARNESS_SECTIONS), _load_sections(worker_guidance_file, _WORKER_SECTIONS))

    def prepare_task(self, invocation: TaskInvocation) -> PreparedWorkerPrompt:
        task = invocation.task
        return PreparedWorkerPrompt(task.number, select_worker_guidance(task.allowed_paths, self.worker_guidance_sections), build_result_contract(task.number, task.verification_items, sections=self.harness_sections))

    def render(self, invocation: TaskInvocation, prepared: PreparedWorkerPrompt) -> str:
        context = validate_execution_context(invocation.execution_context, invocation.task.number)
        execution_section = {"rerun": "execution-rerun", "new_or_changed": "execution-new-or-changed", "existing_without_evidence": "execution-existing-without-evidence"}[context["mode"]]
        parts = [invocation.common_prompt, self.harness_sections["discovery-guidance"], self.harness_sections["context-efficiency-guidance"], *prepared.guidance, self.harness_sections["execution-context"] + "\n" + json.dumps(context, ensure_ascii=False, indent=2), self.harness_sections[execution_section]]
        if invocation.decision_correction is not None:
            correction = invocation.decision_correction
            if not isinstance(correction, dict) or not isinstance(correction.get("objective_evidence"), dict):
                raise ValueError("decision correction requires objective evidence")
            parts.append(self.harness_sections["decision-correction"] + "\n" + json.dumps({"prior_decision": correction.get("prior_decision"), "objective_evidence": correction["objective_evidence"]}, ensure_ascii=False, indent=2))
        if invocation.additional_request:
            parts.append(invocation.additional_request)
        parts.extend((invocation.task.title, invocation.task.task_prompt, prepared.result_contract))
        return "\n\n".join(parts)
