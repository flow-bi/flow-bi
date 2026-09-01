# Worker timing log schema

Worker events are accepted only from the authenticated parent collector. `worker_start`,
`worker_phase_start`/`worker_phase_end`, `worker_tool_start`/`worker_tool_end`, and
`worker_end` retain the existing task and agent records without changing their meanings.

Every Worker record carries `run_id`, `task_number`, `area`, `parent_session_id`, and
`occurred_at`. Phase values are `analysis`, `test_code`, `implementation`,
`implementation_and_test`, `refactor`, `documentation`, `verification`, and
`finalization`. `phase_source` is `explicit` or `inferred`; tool input bodies and
authentication tokens are never stored.

The parent invokes `codex exec --json` and consumes JSONL stdout separately from stderr.
Only supported item lifecycle IDs and enum-like tool types are converted to tool events;
commands, patches, file contents, outputs, and tokens are discarded. Parent-observed event
times are the duration clock. A `worker_start` arriving before the worker
`UserPromptSubmit` session is buffered by `run_id` and bound once when its task number,
area, and parent session match; phase, tool, and end events still require that bound
session. Duplicate tool ends and partial/open intervals are idempotently closed at worker
end. Older logs without a start remain readable without synthesized timing.

Worker tree nodes add `area`, `total_duration_ms`, `phases`,
`unattributed_duration_ms`, and `classification`. Each phase has `phase`,
`duration_ms`, `tool_calls`, `tool_duration_ms`, and source booleans in
`classification`. Run IDs, not task numbers, identify independent executions. Parent and
subagent nodes do not receive Worker timing aggregates. Logs without Worker records remain
readable and preserve their legacy tree shape.
