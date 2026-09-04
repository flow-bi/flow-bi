from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from ..models.result import ExecutionReport, TaskResult


SEOUL = timezone(timedelta(hours=9), "Asia/Seoul")
CANONICAL_PHASES = (
    "analysis",
    "test_code",
    "implementation",
    "implementation_and_test",
    "refactor",
    "documentation",
    "verification",
    "finalization",
)


def _recorded_timings(result: TaskResult) -> tuple:
    """Prefer all preserved Worker attempts; retain legacy single-run records."""
    attempts = result.run_timings
    if attempts:
        return tuple(item.timing for item in attempts if item.timing is not None)
    return (result.timing,) if result.timing is not None else ()


@dataclass(frozen=True)
class RenderedReport:
    title: str
    body: str
    status: str
    executed_at: datetime


def _overall_status(report: ExecutionReport) -> str:
    statuses = {result.status for result in report.results}
    if "failed" in statuses:
        return "FAILED"
    if "blocked" in statuses:
        return "BLOCKED"
    if report.succeeded:
        return "PASS"
    return "FAILED"


def _task_status(result: TaskResult) -> str:
    return {"succeeded": "PASS", "failed": "FAILED", "blocked": "BLOCKED"}.get(
        result.status,
        "FAILED",
    )


def _verification_lines(result: TaskResult) -> list[str]:
    if not result.verification:
        return ["- 실행 결과 없음"]
    return [
        f"- {item.item}: {item.result} — {item.evidence}"
        for item in result.verification
    ]


def _issue_lines(result: TaskResult) -> list[str]:
    issues = list(result.remaining_issues)
    if result.message and result.message not in issues:
        issues.append(result.message)
    return [f"- {issue}" for issue in issues] or ["- 없음"]


def _duration(milliseconds: int) -> str:
    minutes, remainder = divmod(milliseconds, 60_000)
    seconds = f"{remainder / 1000:g}초"
    readable = f"{minutes}분 {seconds}" if minutes else seconds
    return f"{readable} ({milliseconds}ms)"


def _ratio(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "분석 불가"
    return f"{numerator / denominator * 100:.1f}%"


def _classification(*, explicit: bool, inferred: bool) -> str:
    return ", ".join(
        name for name, enabled in (("명시", explicit), ("추론", inferred)) if enabled
    ) or "없음"


def _table(headers: tuple[str, ...], rows: list[tuple[str, ...]]) -> list[str]:
    return [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
        *("| " + " | ".join(row) + " |" for row in rows),
    ]


def _missing_phase_row(phase_name: str) -> tuple[str, ...]:
    return (phase_name, "미기록", "미기록", "미기록", "미기록", "미기록")


def _phases_by_name(results: tuple[TaskResult, ...]) -> dict[str, tuple]:
    grouped: dict[str, list] = {}
    for result in results:
        for timing in _recorded_timings(result):
            for phase in timing.phases:
                grouped.setdefault(phase.phase, []).append(phase)
    return {name: tuple(phases) for name, phases in grouped.items()}


def _phase_row(phase_name: str, phases: tuple, duration_total_ms: int) -> tuple[str, ...]:
    if not phases:
        return _missing_phase_row(phase_name)
    duration = sum(phase.duration_ms for phase in phases)
    return (
        phase_name, _duration(duration), _ratio(duration, duration_total_ms),
        f"{sum(phase.tool_calls for phase in phases)}회",
        _duration(sum(phase.tool_duration_ms for phase in phases)),
        _classification(
            explicit=any(phase.explicit for phase in phases),
            inferred=any(phase.inferred for phase in phases),
        ),
    )


def _phase_rows(results: tuple[TaskResult, ...], total_duration_ms: int) -> list[tuple[str, ...]]:
    phases_by_name = _phases_by_name(results)
    return [
        _phase_row(phase_name, phases_by_name.get(phase_name, ()), total_duration_ms)
        for phase_name in CANONICAL_PHASES
    ]


def _task_time_row(result: TaskResult, report_total_duration_ms: int) -> tuple[str, ...]:
    timings = _recorded_timings(result)
    if not timings:
        return (str(result.task_number), result.title, _task_status(result), *("미기록",) * 5)
    total = sum(item.total_duration_ms for item in timings)
    unattributed = sum(item.unattributed_duration_ms for item in timings)
    return (
        str(result.task_number), result.title, _task_status(result),
        _duration(total), _ratio(total, report_total_duration_ms),
        _duration(unattributed), _ratio(unattributed, total),
        _classification(explicit=any(item.explicit for item in timings), inferred=any(item.inferred for item in timings)),
    )


def _time_analysis_lines(results: tuple[TaskResult, ...]) -> list[str]:
    recorded = tuple(timing for result in results for timing in _recorded_timings(result))
    total_duration = sum(timing.total_duration_ms for timing in recorded)
    unattributed = sum(timing.unattributed_duration_ms for timing in recorded)
    return [
        "### 실행 시간 요약",
        *_table(
            ("timing 기록 Task", "timing 미기록 Task", "전체 Worker 시간", "전체 미귀속 시간"),
            [(
                f"{sum(bool(_recorded_timings(result)) for result in results)}개", f"{sum(not _recorded_timings(result) for result in results)}개",
                _duration(total_duration) if recorded else "분석 불가 (timing 기록 없음)",
                f"{_duration(unattributed)}, {_ratio(unattributed, total_duration)}" if recorded else "분석 불가 (timing 기록 없음)",
            )],
        ),
        "",
        "### Task별 소요 시간",
        *_table(
            ("Task 번호", "제목", "실행 상태", "Worker 시간", "전체 대비", "미귀속 시간", "Task 대비", "timing 분류"),
            [_task_time_row(result, total_duration) for result in results],
        ),
        "",
        "### 전체 phase 분석",
        *_table(
            ("phase", "소요 시간", "전체 Worker 시간 대비", "tool 호출 수", "tool 실행 시간", "분류"),
            _phase_rows(results, total_duration),
        ),
        "",
        "### 해석 메모",
        *_table(
            ("항목", "설명"),
            [
                ("미기록", "timing이 없는 Task와 관측되지 않은 phase는 실제 0ms가 아니라 미기록으로 표시합니다."),
                ("비율", "전체 또는 Task 시간이 0ms이면 비율은 분석 불가로 표시합니다."),
                ("중복 시간", "phase.duration_ms는 경과 시간 구간이고 tool 실행 시간은 phase 경계를 걸쳐 중복될 수 있으며, phase.duration_ms와 서로 더하거나 Worker 전체 시간에 가산하지 않습니다."),
            ],
        ),
    ]


def _timing_lines(result: TaskResult, report_total_duration_ms: int) -> list[str]:
    attempts = result.run_timings
    timings = _recorded_timings(result)
    if not timings:
        lines = _table(
            ("Area", "Run ID", "Worker 시간", "전체 대비", "미귀속 시간", "Task 대비", "timing 분류"),
            [("미기록",) * 7],
        )
        errors = [item.observation_error for item in attempts if item.observation_error]
        if result.timing_observation_error:
            errors.append(result.timing_observation_error)
        for error in dict.fromkeys(errors):
            lines.append(f"- 관측 상태: 오류 — {error}")
        return lines
    rows: list[tuple[str, ...]] = []
    if attempts:
        for item in attempts:
            timing = item.timing
            if timing is None:
                rows.append((
                    f"{item.purpose} #{item.attempt}", "미기록", "미기록", "미기록",
                    "미기록", "미기록", "미기록",
                ))
                continue
            rows.append((
                f"{item.purpose} #{item.attempt}", f"{timing.area} / {timing.run_id}",
                _duration(timing.total_duration_ms), _ratio(timing.total_duration_ms, report_total_duration_ms),
                _duration(timing.unattributed_duration_ms), _ratio(timing.unattributed_duration_ms, timing.total_duration_ms),
                _classification(explicit=timing.explicit, inferred=timing.inferred),
            ))
    else:
        timing = timings[0]
        rows.append((
            timing.area, timing.run_id, _duration(timing.total_duration_ms),
            _ratio(timing.total_duration_ms, report_total_duration_ms),
            _duration(timing.unattributed_duration_ms), _ratio(timing.unattributed_duration_ms, timing.total_duration_ms),
            _classification(explicit=timing.explicit, inferred=timing.inferred),
        ))
    lines = _table(
        ("실행 목적 / Area", "Run ID", "Worker 시간", "전체 대비", "미귀속 시간", "Task 대비", "timing 분류"), rows,
    )
    for item in attempts:
        if item.observation_error:
            lines.append(f"- {item.purpose} #{item.attempt} 관측 상태: 오류 — {item.observation_error}")
    lines.extend(("", "##### Phase별 소요 시간"))
    phases_by_name = _phases_by_name((result,))
    phase_rows = [
        _phase_row(phase_name, phases_by_name.get(phase_name, ()), sum(item.total_duration_ms for item in timings))
        for phase_name in CANONICAL_PHASES
    ]
    lines.extend(_table(
        ("phase", "소요 시간", "Task 대비", "tool 호출 수", "tool 실행 시간", "분류"), phase_rows,
    ))
    return lines


def _task_section(result: TaskResult, report_total_duration_ms: int) -> str:
    summary = result.work_summary.strip() or (
        "Worker 실행이 완료되지 않아 수행 내용을 확인할 수 없습니다."
    )
    score = str(result.quality_score) if result.quality_score is not None else "N/A"
    return "\n".join((
        f"### Task {result.task_number}. {result.title}",
        f"- 상태: {_task_status(result)}",
        "#### 수행 내용",
        summary,
        "#### 검증 결과",
        *_verification_lines(result),
        "#### Worker 시간",
        *_timing_lines(result, report_total_duration_ms),
        "#### Quality Score",
        f"- {score}",
        "#### 남은 문제",
        *_issue_lines(result),
    ))


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def build_execution_report(
    plan_id: str,
    report: ExecutionReport,
    *,
    executed_at: datetime | None = None,
) -> RenderedReport:
    timestamp = (executed_at or datetime.now(SEOUL)).astimezone(SEOUL)
    status = _overall_status(report)
    ordered = tuple(sorted(report.results, key=lambda result: result.task_number))
    report_total_duration_ms = sum(
        timing.total_duration_ms for result in ordered for timing in _recorded_timings(result)
    )
    completed = [
        f"Task {item.task_number}. {item.title}"
        for item in ordered
        if item.status == "succeeded"
    ]
    incomplete = [
        f"Task {item.task_number}. {item.title}: {item.message or _task_status(item)}"
        for item in ordered
        if item.status in {"failed", "blocked"}
    ]
    issues = _unique([
        issue
        for item in ordered
        for issue in (
            *item.remaining_issues,
            *((item.message,) if item.message else ()),
        )
    ])
    next_actions = [
        f"Task {item.task_number}. {item.title}의 실패·차단 원인을 해결한 뒤 Harness를 다시 실행"
        for item in ordered
        if item.status in {"failed", "blocked"}
    ] or [issue for item in ordered for issue in item.remaining_issues] or ["없음"]

    sections = "\n\n".join(
        _task_section(item, report_total_duration_ms) for item in ordered
    )
    body = "\n".join((
        "# Harness 실행 보고서",
        "",
        "## 실행 메타데이터",
        f"- Plan ID: {plan_id}",
        f"- 실행 결과: {status}",
        f"- 실행 시간: {timestamp.isoformat(timespec='seconds')}",
        "",
        "## Worker 시간 분석",
        *_time_analysis_lines(ordered),
        "",
        "## 최종 피드백",
        f"- 전체 결과: {status}",
        "### 완료된 작업",
        *(f"- {item}" for item in completed or ["없음"]),
        "### 실패 또는 차단된 작업",
        *(f"- {item}" for item in incomplete or ["없음"]),
        "### 주요 문제",
        *(f"- {item}" for item in issues or ["없음"]),
        "### 다음 작업",
        *(f"- {item}" for item in next_actions),
        "",
        "## Worker 결과",
        sections or "Worker 결과 없음",
    ))
    safe_timestamp = timestamp.strftime("%Y-%m-%d %H:%M:%S KST")
    return RenderedReport(
        title=f"Harness Report - {plan_id} - {safe_timestamp}",
        body=body,
        status=status,
        executed_at=timestamp,
    )
