from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
from collections.abc import Mapping, Sequence


PROMPTS_DIR = Path(__file__).with_name("prompts")
EXECUTION_POLICY_FILE = PROMPTS_DIR / "prompt.md"
VERIFICATION_GUIDANCE_FILE = PROMPTS_DIR / "worker-guidance.md"

_EXECUTION_SECTIONS = (
    "discovery-guidance",
    "context-efficiency-guidance",
    "execution-context",
    "execution-rerun",
    "execution-new-or-changed",
    "execution-existing-without-evidence",
    "decision-correction",
    "result-contract",
)
_VERIFICATION_SECTIONS = (
    "worker-execution-guidance",
    "backend-verification-guidance",
    "backend-formatting-guidance",
    "frontend-verification-guidance",
)


def _load_sections(path: Path, required: tuple[str, ...]) -> dict[str, str]:
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"unable to read prompt guidance: {path}") from error

    headings = tuple(
        re.finditer(r"^## ([a-z0-9-]+)\s*$", content, re.MULTILINE)
    )
    sections: dict[str, str] = {}
    for index, heading in enumerate(headings):
        name = heading.group(1)
        if name in sections:
            raise ValueError(f"duplicate prompt section: {name}")
        end = (
            headings[index + 1].start()
            if index + 1 < len(headings)
            else len(content)
        )
        sections[name] = content[heading.end():end].strip()

    for name in required:
        if not sections.get(name):
            raise ValueError(f"missing required prompt section: {name}")
    return sections


def validate_execution_context(
    context: Mapping[str, object] | None,
    task_number: int,
) -> dict[str, object]:
    if context is None:
        return {
            "plan_id": "unknown",
            "fingerprint": "unknown",
            "mode": "existing_without_evidence",
            "prior_tdd_evidence": None,
            "prior_evidence_id": None,
        }

    plan_id = context.get("plan_id")
    fingerprint = context.get("fingerprint")
    mode = context.get("mode")
    if (
        not isinstance(plan_id, str)
        or not plan_id.strip()
        or not isinstance(fingerprint, str)
        or not fingerprint.strip()
    ):
        raise ValueError("execution context requires plan_id and fingerprint")
    if mode not in {
        "rerun",
        "new_or_changed",
        "existing_without_evidence",
    }:
        raise ValueError("execution context has invalid mode")

    prior = context.get("prior_tdd_evidence")
    valid_prior = (
        isinstance(prior, dict)
        and prior.get("result") == "PASS"
        and isinstance(prior.get("evidence"), str)
        and bool(prior["evidence"].strip())
    )
    if mode == "rerun" and not valid_prior:
        raise ValueError("rerun requires verified prior TDD evidence")
    if mode != "rerun" and prior is not None:
        raise ValueError("only rerun may use prior TDD evidence")

    return {
        "plan_id": plan_id,
        "fingerprint": fingerprint,
        "mode": mode,
        "prior_tdd_evidence": prior,
        "prior_evidence_id": (
            f"plan:{plan_id}:task:{task_number}:fingerprint:{fingerprint}"
            if mode == "rerun"
            else None
        ),
    }


def build_result_contract(
    task_number: int,
    verification_items: Sequence[str],
    *,
    sections: Mapping[str, str],
) -> str:
    verification = [
        {
            "item": item,
            "result": "PASS | FAIL | NOT_RUN",
            "evidence": "실행 명령, 출력 또는 확인 근거",
        }
        for item in verification_items
    ]
    return (
        sections["result-contract"]
        .replace("{{TASK_NUMBER}}", str(task_number))
        .replace(
            "{{VERIFICATION_ITEMS}}",
            json.dumps(verification, ensure_ascii=False, indent=2),
        )
    )


def select_worker_guidance(
    task_paths: Sequence[str],
    sections: Mapping[str, str],
) -> tuple[str, ...]:
    selected = [sections["worker-execution-guidance"]]
    if any(
        path == "backend" or path.startswith("backend/")
        for path in task_paths
    ):
        selected.extend(
            (
                sections["backend-verification-guidance"],
                sections["backend-formatting-guidance"],
            )
        )
    if any(
        path == "frontend" or path.startswith("frontend/")
        for path in task_paths
    ):
        selected.append(sections["frontend-verification-guidance"])
    return tuple(selected)


@dataclass(frozen=True)
class PreparedWorkerPrompt:
    task_number: int
    guidance: tuple[str, ...]
    result_contract: str


@dataclass(frozen=True)
class WorkerPromptTemplate:
    execution_sections: Mapping[str, str]
    verification_sections: Mapping[str, str]

    @classmethod
    def load(
        cls,
        execution_policy_file: Path = EXECUTION_POLICY_FILE,
        verification_guidance_file: Path = VERIFICATION_GUIDANCE_FILE,
    ) -> "WorkerPromptTemplate":
        return cls(
            _load_sections(execution_policy_file, _EXECUTION_SECTIONS),
            _load_sections(
                verification_guidance_file,
                _VERIFICATION_SECTIONS,
            ),
        )

    def prepare_task(
        self,
        task_number: int,
        task_paths: Sequence[str],
        verification_items: Sequence[str],
    ) -> PreparedWorkerPrompt:
        return PreparedWorkerPrompt(
            task_number,
            select_worker_guidance(task_paths, self.verification_sections),
            build_result_contract(
                task_number,
                verification_items,
                sections=self.execution_sections,
            ),
        )

    def render(
        self,
        prepared: PreparedWorkerPrompt,
        *,
        task_number: int,
        common_prompt: str,
        additional_request: str,
        title: str,
        task_prompt: str,
        execution_context: Mapping[str, object] | None,
        decision_correction: Mapping[str, object] | None,
    ) -> str:
        if prepared.task_number != task_number:
            raise ValueError("prepared prompt does not match Task number")

        context = validate_execution_context(execution_context, task_number)
        execution_section = {
            "rerun": "execution-rerun",
            "new_or_changed": "execution-new-or-changed",
            "existing_without_evidence": "execution-existing-without-evidence",
        }[context["mode"]]
        parts = [
            common_prompt,
            self.execution_sections["discovery-guidance"],
            self.execution_sections["context-efficiency-guidance"],
            *prepared.guidance,
            self.execution_sections["execution-context"]
            + "\n"
            + json.dumps(context, ensure_ascii=False, indent=2),
            self.execution_sections[execution_section],
        ]

        if decision_correction is not None:
            objective_evidence = decision_correction.get("objective_evidence")
            if not isinstance(objective_evidence, dict):
                raise ValueError(
                    "decision correction requires objective evidence"
                )
            parts.append(
                self.execution_sections["decision-correction"]
                + "\n"
                + json.dumps(
                    {
                        "prior_decision": decision_correction.get(
                            "prior_decision"
                        ),
                        "objective_evidence": objective_evidence,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )

        if additional_request:
            parts.append(additional_request)
        parts.extend((title, task_prompt, prepared.result_contract))
        return "\n\n".join(parts)
