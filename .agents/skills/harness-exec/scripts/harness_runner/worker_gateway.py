from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import json
import os
import subprocess
import sys

from .models import PhaseTiming, TaskInvocation, WorkerTiming
from .plan import repository_root


WORKER_SCRIPTS = Path(__file__).resolve().parents[4] / "scripts"
if str(WORKER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(WORKER_SCRIPTS))

from worker_runner import execute_worker, parse_invocation


_AREAS = frozenset(("fe-worker", "be-worker"))
_PHASES = frozenset((
    "analysis", "test_code", "implementation", "implementation_and_test",
    "refactor", "documentation", "verification", "finalization",
))


@dataclass(frozen=True)
class WorkerGatewayResult:
    """Worker outcome plus optional, independently validated observation data."""

    returncode: int
    output: object | None
    output_error: str = ""
    timing: WorkerTiming | None = None
    timing_observation_error: str = ""


def _nonnegative_integer(value: object, field: str) -> int:
    if type(value) is not int or value < 0:
        raise ValueError(f"{field}는 0 이상의 정수여야 합니다.")
    return value


def _classification(value: object, field: str) -> tuple[bool, bool]:
    if not isinstance(value, dict) or type(value.get("explicit")) is not bool or type(value.get("inferred")) is not bool:
        raise ValueError(f"{field} classification이 유효하지 않습니다.")
    return value["explicit"], value["inferred"]


def parse_timing_summary(
    payload: object, task_number: int, expected_run_id: str | None = None,
) -> WorkerTiming:
    """Validate the run-scoped Node timing summary before it reaches reports."""

    if not isinstance(payload, dict):
        raise ValueError("timing summary가 객체가 아닙니다.")
    run_id = payload.get("run_id")
    if not isinstance(run_id, str) or not run_id.strip():
        raise ValueError("timing summary run_id가 유효하지 않습니다.")
    if expected_run_id is not None and run_id != expected_run_id:
        raise ValueError("timing summary run_id가 현재 Worker 실행과 일치하지 않습니다.")
    if type(payload.get("task_number")) is not int or payload["task_number"] != task_number:
        raise ValueError("timing summary task_number가 현재 Task와 일치하지 않습니다.")
    area = payload.get("area")
    if area not in _AREAS:
        raise ValueError("timing summary area가 유효하지 않습니다.")
    explicit, inferred = _classification(payload.get("classification"), "timing summary")
    phases_value = payload.get("phases")
    if not isinstance(phases_value, list):
        raise ValueError("timing summary phases가 배열이 아닙니다.")
    phases: list[PhaseTiming] = []
    for index, value in enumerate(phases_value):
        if not isinstance(value, dict) or value.get("phase") not in _PHASES:
            raise ValueError(f"timing summary phases[{index}]가 유효하지 않습니다.")
        phase_explicit, phase_inferred = _classification(value.get("classification"), f"timing summary phases[{index}]")
        phases.append(PhaseTiming(
            phase=value["phase"],
            duration_ms=_nonnegative_integer(value.get("duration_ms"), f"timing summary phases[{index}].duration_ms"),
            tool_calls=_nonnegative_integer(value.get("tool_calls"), f"timing summary phases[{index}].tool_calls"),
            tool_duration_ms=_nonnegative_integer(value.get("tool_duration_ms"), f"timing summary phases[{index}].tool_duration_ms"),
            explicit=phase_explicit,
            inferred=phase_inferred,
        ))
    return WorkerTiming(
        run_id=run_id,
        task_number=task_number,
        area=area,
        total_duration_ms=_nonnegative_integer(payload.get("total_duration_ms"), "timing summary total_duration_ms"),
        unattributed_duration_ms=_nonnegative_integer(payload.get("unattributed_duration_ms"), "timing summary unattributed_duration_ms"),
        phases=tuple(phases),
        explicit=explicit,
        inferred=inferred,
    )


def _timing_from_summary(
    summary: object, task_number: int, expected_run_id: str | None = None,
) -> tuple[WorkerTiming | None, str]:
    if summary is None:
        return None, ""
    try:
        return parse_timing_summary(summary, task_number, expected_run_id), ""
    except ValueError as error:
        return None, f"Worker timing 관측 실패: {error}"


def invoke_task(
    invocation: TaskInvocation,
    *,
    environment_overrides: dict[str, str] | None = None,
) -> WorkerGatewayResult:
    root = repository_root().resolve()
    payload = json.dumps(asdict(invocation), ensure_ascii=False)
    prompt, allowed_paths, forbidden_paths = parse_invocation(payload)
    environment = os.environ.copy()
    if environment_overrides:
        environment.update(environment_overrides)
    try:
        result = execute_worker(
            prompt,
            allowed_paths,
            forbidden_paths,
            task_number=invocation.task.number,
            project_root=root,
            base_environment=environment,
        )
    except subprocess.TimeoutExpired as error:
        timing, timing_error = _timing_from_summary(
            getattr(error, "timing_summary", None), invocation.task.number,
            getattr(error, "run_id", None) or None,
        )
        error.timing = timing
        error.timing_observation_error = timing_error
        raise
    timing, timing_error = _timing_from_summary(
        getattr(result, "timing_summary", None), invocation.task.number,
        getattr(result, "run_id", None) or None,
    )
    return WorkerGatewayResult(
        returncode=result.returncode,
        output=result.output,
        output_error=result.output_error,
        timing=timing,
        timing_observation_error=timing_error,
    )
