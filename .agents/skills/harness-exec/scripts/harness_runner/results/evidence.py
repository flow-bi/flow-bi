from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import tempfile
from typing import Any

from ..models.plan import Task


RECORD_VERSION = 1


class EvidenceError(ValueError):
    """Raised when a stored execution record cannot prove a prior success."""


def _json_bytes(value: object) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def task_contract_fingerprint(plan_id: str, task: Task) -> str:
    """Hash only the task contract that the recorded TDD evidence proves."""
    return hashlib.sha256(_json_bytes({
        "plan_id": plan_id,
        "task_number": task.number,
        "title": task.title,
        "prerequisite_numbers": task.prerequisite_numbers,
        "task_prompt": task.task_prompt,
        "implementation_items": task.implementation_items,
        "verification_items": task.verification_items,
        "allowed_paths": task.allowed_paths,
        "read_only_paths": task.read_only_paths,
        "minimum_quality_score": task.minimum_quality_score,
        "tdd_policy": task.tdd_policy,
    })).hexdigest()


def _non_empty(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _valid_evidence(value: object) -> bool:
    return (
        isinstance(value, dict)
        and value.get("result") == "PASS"
        and _non_empty(value.get("evidence"))
    )


def _valid_tdd_evidence(value: object, policy: object) -> bool:
    if (
        not isinstance(value, dict)
        or not _non_empty(value.get("evidence"))
        or not _non_empty(value.get("current_verification_evidence"))
    ):
        return False
    if policy == "NOT_APPLICABLE":
        return value.get("result") == "N/A" and _non_empty(value.get("reason"))
    if value.get("result") != "PASS":
        return False
    if policy == "REUSE_ALLOWED":
        reused = value.get("reused_evidence")
        return (
            isinstance(reused, dict)
            and _non_empty(reused.get("record_id"))
            and _non_empty(reused.get("fingerprint"))
        )
    return policy in {"REQUIRED", "REGRESSION_ONLY"}


def _valid_record(value: object, fingerprint: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise EvidenceError("실행 기록 형식이 올바르지 않습니다.")
    required = {
        "version", "plan_id", "task_number", "fingerprint", "tdd_policy",
        "mandatory_gates", "tdd_evidence", "verification", "quality_score",
    }
    if (
        set(value) != required
        or value.get("version") != RECORD_VERSION
        or value.get("fingerprint") != fingerprint
    ):
        raise EvidenceError(
            "실행 기록이 불완전하거나 현재 리비전과 일치하지 않습니다."
        )
    gates = value["mandatory_gates"]
    ordinary_gates = (
        "permission_security", "scope", "requirements",
        "automated_verification", "contract_sync", "critical_findings",
    )
    if (
        not isinstance(gates, dict)
        or not all(_valid_evidence(gates.get(name)) for name in ordinary_gates)
        or not _valid_tdd_evidence(gates.get("tdd"), value["tdd_policy"])
    ):
        raise EvidenceError("실행 기록의 Mandatory Gate 증거가 불완전합니다.")
    if not _valid_tdd_evidence(value["tdd_evidence"], value["tdd_policy"]):
        raise EvidenceError("실행 기록의 TDD 증거가 불완전합니다.")
    verification = value["verification"]
    if (
        not isinstance(verification, list)
        or not verification
        or not all(
            isinstance(item, dict)
            and item.get("result") == "PASS"
            and _non_empty(item.get("evidence"))
            for item in verification
        )
    ):
        raise EvidenceError("실행 기록의 검증 증거가 불완전합니다.")
    if type(value["quality_score"]) is not int:
        raise EvidenceError("실행 기록의 quality_score 형식이 올바르지 않습니다.")
    return value


class TaskEvidenceStore:
    def __init__(self, root: Path) -> None:
        self.root = root

    def path_for(self, plan_id: str, task_number: int) -> Path:
        safe_plan_id = hashlib.sha256(plan_id.encode("utf-8")).hexdigest()
        return self.root / safe_plan_id / f"task-{task_number}.json"

    def load_valid_evidence(
        self, plan_id: str, task_number: int, fingerprint: str
    ) -> dict[str, Any] | None:
        path = self.path_for(plan_id, task_number)
        if not path.exists():
            return None
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(value, dict) and value.get("fingerprint") != fingerprint:
                return None
            return _valid_record(value, fingerprint)
        except (OSError, json.JSONDecodeError, EvidenceError) as error:
            raise EvidenceError(f"실행 기록을 신뢰할 수 없습니다: {error}") from error

    def save_success_evidence(
        self,
        plan_id: str,
        task: Task,
        fingerprint: str,
        output: dict[str, object],
    ) -> None:
        tdd_evidence = output["mandatory_gates"]["tdd"]
        record = {
            "version": RECORD_VERSION,
            "plan_id": plan_id,
            "task_number": task.number,
            "fingerprint": fingerprint,
            "tdd_policy": tdd_evidence.get("effective_policy", task.tdd_policy),
            "mandatory_gates": output["mandatory_gates"],
            "tdd_evidence": tdd_evidence,
            "verification": output["verification"],
            "quality_score": output["quality_score"],
        }
        _valid_record(record, fingerprint)
        path = self.path_for(plan_id, task.number)
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
        )
        try:
            with os.fdopen(descriptor, "wb") as temporary:
                temporary.write(_json_bytes(record))
                temporary.flush()
                os.fsync(temporary.fileno())
            os.replace(temporary_name, path)
        except OSError:
            try:
                os.unlink(temporary_name)
            except FileNotFoundError:
                pass
            raise
