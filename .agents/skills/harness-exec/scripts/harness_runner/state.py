from __future__ import annotations

import json
from pathlib import Path
import re
import tempfile
import threading
from typing import Any

from .models import Task


PLAN_ID_PATTERN = re.compile(r"^(?P<feature>[a-z0-9]+(?:-[a-z0-9]+)*)-(?P<number>\d{2})$")
TASK_KEY_PATTERN = re.compile(r"^task[1-9]\d*$")
PLAN_KEY_PATTERN = re.compile(r"^\d{2}$")

ALLOWED_STATUSES = frozenset(("pending", "running", "succeeded", "failed", "blocked"))
REASON_STATUSES = frozenset(("failed", "blocked"))

class StateRecordError(ValueError):
    """Raised when a plan status record cannot be safely read or written."""


class PlanStateStore:
    _locks_guard = threading.Lock()
    _locks: dict[Path, threading.Lock] = {}

    def __init__(self, root: Path) -> None:
        self.root = root

    @staticmethod
    def _parts(plan_id: str) -> tuple[str, str]:
        match = PLAN_ID_PATTERN.fullmatch(plan_id)
        if match is None:
            raise StateRecordError("Plan ID는 '<feature>-NN' 형식이어야 합니다.")
        return match.group("feature"), match.group("number")

    def path_for(self, plan_id: str) -> Path:
        feature, _ = self._parts(plan_id)
        return self.root / f"{feature}.json"

    @classmethod
    def _lock_for(cls, path: Path) -> threading.Lock:
        resolved = path.resolve()
        with cls._locks_guard:
            return cls._locks.setdefault(resolved, threading.Lock())

    @staticmethod
    def _validate_task_record(value: object) -> None:
        if not isinstance(value, dict) or set(value) - {"status", "reason"}:
            raise StateRecordError("Task 상태는 status와 조건부 reason만 가진 객체여야 합니다.")

        status = value.get("status")
        if status not in ALLOWED_STATUSES:
            raise StateRecordError("Task 상태 값이 허용 목록에 없습니다.")

        reason = value.get("reason")
        if status in REASON_STATUSES:
            if not isinstance(reason, str) or not reason.strip():
                raise StateRecordError("failed 및 blocked 상태에는 비어 있지 않은 reason이 필요합니다.")
        elif "reason" in value:
            raise StateRecordError("failed 및 blocked 이외 상태에는 reason을 저장할 수 없습니다.")

    @classmethod
    def _validate_document(cls, document: object) -> dict[str, Any]:
        if not isinstance(document, dict):
            raise StateRecordError("상태 파일의 루트는 하나의 JSON 객체여야 합니다.")

        for plan_number, plan in document.items():
            if not isinstance(plan_number, str) or PLAN_KEY_PATTERN.fullmatch(plan_number) is None:
                raise StateRecordError("Plan 키는 두 자리 숫자여야 합니다.")

            if not isinstance(plan, dict):
                raise StateRecordError("Plan 값은 객체여야 합니다.")

            for task_key, record in plan.items():
                if not isinstance(task_key, str) or TASK_KEY_PATTERN.fullmatch(task_key) is None:
                    raise StateRecordError("Task 키는 taskN 형식이어야 합니다.")

                cls._validate_task_record(record)
        return document

    def _read(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}

        try:
            with path.open(encoding="utf-8") as file:
                return self._validate_document(json.load(file))

        except json.JSONDecodeError as error:
            raise StateRecordError(f"상태 JSON 파싱 실패: {error}") from error
        except OSError as error:
            raise StateRecordError(f"상태 파일 읽기 실패: {error}") from error

    @staticmethod
    def _task_key(task: Task) -> str:
        return f"task{task.number}"

    def load_task_records(self, plan_id: str, tasks: tuple[Task, ...]) -> dict[str, Any]:
        """Read and return only the current plan's validated task records."""
        path = self.path_for(plan_id)
        _, plan_number = self._parts(plan_id)

        with self._lock_for(path):
            document = self._read(path)

        plan = document.get(plan_number, {})
        task_keys = {self._task_key(task) for task in tasks}

        if any(task_key not in task_keys for task_key in plan):
            raise StateRecordError("현재 Plan에 없는 Task 상태가 저장되어 있습니다.")
        return plan

    def update(self, plan_id: str, task: Task, status: str, *, reason: str | None = None) -> None:
        if status not in ALLOWED_STATUSES:
            raise ValueError("허용되지 않은 Task 상태입니다.")

        if status in REASON_STATUSES:
            if not isinstance(reason, str) or not reason.strip():
                raise ValueError("failed 및 blocked 상태에는 비어 있지 않은 reason이 필요합니다.")

        elif reason is not None:
            raise ValueError("failed 및 blocked 이외 상태에는 reason을 저장할 수 없습니다.")

        path = self.path_for(plan_id)
        _, plan_number = self._parts(plan_id)
        record: dict[str, str] = {"status": status}

        if reason is not None:
            record["reason"] = reason.strip()
        with self._lock_for(path):
            document = self._read(path)
            document.setdefault(plan_number, {})[self._task_key(task)] = record
            self._write(path, document)

    def _write(self, path: Path, document: dict[str, Any]) -> None:
        self._validate_document(document)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as file:
                temporary_path = Path(file.name)
                json.dump(document, file, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                file.write("\n")
            temporary_path.replace(path)

        except OSError as error:
            try:
                temporary_path.unlink(missing_ok=True)
            except UnboundLocalError:
                pass
            raise StateRecordError(f"상태 파일 저장 실패: {error}") from error
