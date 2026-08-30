from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VerificationResult:
    item: str
    result: str
    evidence: str


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
