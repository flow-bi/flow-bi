from __future__ import annotations

from dataclasses import replace
import json
import os
from pathlib import Path
import subprocess

from .prompt import build_worker_prompt
from .request import WorkerExecutionRequest
from .timing import CollectionService, EventSink, NodeEventSink, RunContext
from .worker_process import (
    SubprocessRunner,
    WorkerExecutionResult,
    WorkerLogger,
    run_worker_process,
)


def _submit_event(
    service: CollectionService,
    context: RunContext,
    event: dict[str, object],
    diagnostic: str,
) -> None:
    try:
        service.submit({**event, "run_id": context.run_id, "token": context.token})
    except Exception:
        service.diagnostics.append(diagnostic)


def _node_timing_summary(project_root: Path, run_id: str) -> object | None:
    """Read only the completed task node for the current Worker run."""

    try:
        tree = json.loads(
            (project_root / ".codex-logs" / "user-prompt-detail-tree.json")
            .read_text(encoding="utf-8")
        )
    except FileNotFoundError:
        return None
    except (OSError, UnicodeError, ValueError):
        return {"run_id": run_id}

    pending = (
        list(tree.get("roots", ())) + list(tree.get("unresolved", ()))
        if isinstance(tree, dict)
        else []
    )
    while pending:
        node = pending.pop()
        if not isinstance(node, dict):
            continue
        children = node.get("children")
        pending.extend(children if isinstance(children, list) else ())
        executor = node.get("executor")
        if (
            node.get("run_id") != run_id
            or not isinstance(executor, dict)
            or executor.get("kind") != "task"
        ):
            continue
        return {
            "run_id": run_id,
            "task_number": executor.get("task_number"),
            "area": node.get("area"),
            "total_duration_ms": node.get("total_duration_ms"),
            "unattributed_duration_ms": node.get("unattributed_duration_ms"),
            "classification": node.get("classification"),
            "phases": node.get("phases"),
        }
    return None


def _timing_summary(
    service: CollectionService,
    project_root: Path,
    run_id: str,
) -> object | None:
    return service.timing_summary or _node_timing_summary(project_root, run_id)


def execute_worker(
    request: WorkerExecutionRequest,
    *,
    process_runner: SubprocessRunner = subprocess.run,
    logger: WorkerLogger | None = None,
    event_sink: EventSink | None = None,
    timeout: int = 30 * 60,
) -> WorkerExecutionResult:
    """완성된 요청 하나로 Worker 실행과 run-scoped timing 수집을 수행한다."""

    prompt = build_worker_prompt(request)
    context = RunContext.create(
        task_number=request.task_number,
        area=request.worker_area,
        parent_session_id=request.environment.get("CODEX_THREAD_ID")
        or os.environ.get("CODEX_THREAD_ID"),
        run_id=request.run_id,
    )
    service = CollectionService(
        context,
        event_sink or NodeEventSink(request.project_root),
    )
    try:
        service.start()
        execution_environment = service.worker_environment(request.environment)
        _submit_event(
            service,
            context,
            {"event_type": "start"},
            "start event failed",
        )
        result = run_worker_process(
            executable=request.executable,
            config_overrides=request.config_overrides,
            prompt=prompt,
            run_id=context.run_id,
            environment=execution_environment,
            project_root=request.project_root,
            runner=process_runner,
            logger=logger,
            timeout=timeout,
            on_tool_event=lambda event: _submit_event(
                service, context, event, "tool event failed"
            ),
        )
        status = (
            "completed"
            if result.returncode == 0
            and not result.output_error
            and isinstance(result.output, dict)
            and result.output.get("final_status") == "PASS"
            else "failed"
        )
        summary = (
            result.output.get("work_summary", "")
            if isinstance(result.output, dict)
            else ""
        )
        _submit_event(
            service,
            context,
            {
                "event_type": "end",
                "status": status,
                "exit_code": result.returncode,
                "summary": str(summary)[:4096],
            },
            "terminal event failed",
        )
        return replace(
            result,
            timing_summary=_timing_summary(
                service, request.project_root, context.run_id
            ),
            run_id=context.run_id,
        )
    except subprocess.TimeoutExpired as error:
        _submit_event(
            service,
            context,
            {
                "event_type": "end",
                "status": "timeout",
                "exit_code": 124,
                "summary": "Worker timed out.",
            },
            "timeout event failed",
        )
        error.timing_summary = _timing_summary(
            service, request.project_root, context.run_id
        )
        error.run_id = context.run_id
        raise
    except Exception as error:
        _submit_event(
            service,
            context,
            {
                "event_type": "end",
                "status": "failed",
                "exit_code": 1,
                "summary": "Worker subprocess failed.",
            },
            "failure event failed",
        )
        error.timing_summary = _timing_summary(
            service, request.project_root, context.run_id
        )
        error.run_id = context.run_id
        raise
    finally:
        service.close()
