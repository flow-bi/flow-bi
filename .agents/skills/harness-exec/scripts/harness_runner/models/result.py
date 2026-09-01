from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VerificationResult:
    item: str
    result: str
    evidence: str


@dataclass(frozen=True)
class PhaseTiming:
    phase: str
    duration_ms: int
    tool_calls: int
    tool_duration_ms: int
    explicit: bool
    inferred: bool


@dataclass(frozen=True)
class WorkerTiming:
    run_id: str
    task_number: int
    area: str
    total_duration_ms: int
    unattributed_duration_ms: int
    phases: tuple[PhaseTiming, ...]
    explicit: bool
    inferred: bool


@dataclass(frozen=True)
class TaskResult:
    task_number: int
    title: str
    status: str
    return_code: int | None = None
    timed_out: bool = False
    message: str = ""
    work_summary: str = ""
    verification: tuple[VerificationResult, ...] = ()
    quality_score: int | None = None
    remaining_issues: tuple[str, ...] = ()
    restored: bool = False
    timing: WorkerTiming | None = None
    timing_observation_error: str = ""


@dataclass(frozen=True)
class ExecutionReport:
    results: tuple[TaskResult, ...]

    @property
    def succeeded(self) -> bool:
        return bool(self.results) and all(
            result.status == "succeeded" for result in self.results
        )

    @property
    def failures(self) -> tuple[TaskResult, ...]:
        return tuple(
            result
            for result in self.results
            if result.status in {"failed", "blocked"}
        )
