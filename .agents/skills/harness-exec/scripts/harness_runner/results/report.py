from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from ..models import ExecutionReport, TaskResult


SEOUL = timezone(timedelta(hours=9), "Asia/Seoul")


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


def _task_section(result: TaskResult) -> str:
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

    sections = "\n\n".join(_task_section(item) for item in ordered)
    body = "\n".join((
        "# Harness 실행 보고서",
        "",
        "## 실행 메타데이터",
        f"- Plan ID: {plan_id}",
        f"- 실행 결과: {status}",
        f"- 실행 시간: {timestamp.isoformat(timespec='seconds')}",
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
