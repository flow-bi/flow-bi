from __future__ import annotations

from ..models.result import PhaseTiming, WorkerTiming


AREAS = frozenset(("fe-worker", "be-worker"))
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


def _nonnegative_integer(value: object, field: str) -> int:
    if type(value) is not int or value < 0:
        raise ValueError(f"{field}는 0 이상의 정수여야 합니다.")
    return value


def _classification(value: object, field: str) -> tuple[bool, bool]:
    if (
        not isinstance(value, dict)
        or type(value.get("explicit")) is not bool
        or type(value.get("inferred")) is not bool
    ):
        raise ValueError(f"{field} classification이 유효하지 않습니다.")
    return value["explicit"], value["inferred"]


def parse_timing_summary(
    payload: object,
    task_number: int,
    expected_run_id: str | None = None,
) -> WorkerTiming:
    """Node가 확정한 run-scoped timing summary를 Report 모델로 변환한다."""

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
    if area not in AREAS:
        raise ValueError("timing summary area가 유효하지 않습니다.")
    explicit, inferred = _classification(payload.get("classification"), "timing summary")
    phase_values = payload.get("phases")
    if not isinstance(phase_values, list):
        raise ValueError("timing summary phases가 배열이 아닙니다.")

    phases: list[PhaseTiming] = []
    for index, value in enumerate(phase_values):
        if not isinstance(value, dict) or value.get("phase") not in PHASES:
            raise ValueError(f"timing summary phases[{index}]가 유효하지 않습니다.")
        phase_explicit, phase_inferred = _classification(
            value.get("classification"), f"timing summary phases[{index}]"
        )
        phases.append(PhaseTiming(
            phase=value["phase"],
            duration_ms=_nonnegative_integer(
                value.get("duration_ms"), f"timing summary phases[{index}].duration_ms"
            ),
            tool_calls=_nonnegative_integer(
                value.get("tool_calls"), f"timing summary phases[{index}].tool_calls"
            ),
            tool_duration_ms=_nonnegative_integer(
                value.get("tool_duration_ms"),
                f"timing summary phases[{index}].tool_duration_ms",
            ),
            explicit=phase_explicit,
            inferred=phase_inferred,
        ))

    return WorkerTiming(
        run_id=run_id,
        task_number=task_number,
        area=area,
        total_duration_ms=_nonnegative_integer(
            payload.get("total_duration_ms"), "timing summary total_duration_ms"
        ),
        unattributed_duration_ms=_nonnegative_integer(
            payload.get("unattributed_duration_ms"),
            "timing summary unattributed_duration_ms",
        ),
        phases=tuple(phases),
        explicit=explicit,
        inferred=inferred,
    )


def timing_from_observation(
    summary: object,
    task_number: int,
    expected_run_id: str | None = None,
) -> tuple[WorkerTiming | None, str]:
    if summary is None:
        return None, ""
    try:
        return parse_timing_summary(summary, task_number, expected_run_id), ""
    except ValueError as error:
        return None, f"Worker timing 관측 실패: {error}"
