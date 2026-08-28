import { PROJECT_ROOT, TREE_VERSION } from "./config.mjs";
import {
  commonRecord,
  isSyntheticPrompt,
  pendingForSession,
  pendingKey,
  resolveExecutor,
  terminalRecordForState,
} from "./records.mjs";
import { withStorage } from "./storage.mjs";
import { readSessionUsage, terminalUsage } from "./usage.mjs";

const WORKER_EVENT_TYPES = new Set(["start", "phase", "tool_start", "tool_end", "end"]);
const WORKER_PHASES = new Set(["analysis", "test_code", "implementation", "implementation_and_test", "refactor", "documentation", "verification", "finalization"]);
const WORKER_STATUSES = new Set(["completed", "failed", "timeout"]);

function eventTime(event, now) {
  const parsed = typeof event.occurred_at === "string" ? Date.parse(event.occurred_at) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : now().toISOString();
}
function elapsed(startedAt, endedAt) {
  return Math.max(0, Date.parse(endedAt) - Date.parse(startedAt));
}
function workerRecord(state, event, recordType, occurredAt, extra = {}) {
  return {
    record_type: recordType, tree_version: state.tree_version, ...commonRecord(state, occurredAt),
    area: state.worker_area, task_number: state.executor.task_number,
    parent_session_id: state.parent_session_id ?? null,
    phase: event.phase ?? null, phase_source: event.phase_source ?? null, phase_id: event.phase_id ?? null,
    tool_id: event.tool_id ?? null, tool_name: typeof event.tool_name === "string" ? event.tool_name.slice(0, 128) : null,
    ...extra,
  };
}
function closeOpenWorkerIntervals(records, state, event, occurredAt) {
  const timing = state.worker_timing ?? { tools: {}, current_phase: null };
  for (const tool of Object.values(timing.tools ?? {})) {
    records.push(workerRecord(state, { ...tool, phase: tool.phase, phase_source: tool.phase_source }, "worker_tool_end", occurredAt, {
      duration_ms: elapsed(tool.started_at, occurredAt), closed_by: "worker_end",
    }));
  }
  if (timing.current_phase) {
    records.push(workerRecord(state, timing.current_phase, "worker_phase_end", occurredAt, {
      duration_ms: elapsed(timing.current_phase.started_at, occurredAt), closed_by: "worker_end",
    }));
  }
  state.worker_timing = { tools: {}, current_phase: null };
}

function captureUsage(sessionId, usageReader) {
  try { return usageReader(sessionId); }
  catch { return { usage: null, usage_status: "SESSION_READ_FAILED" }; }
}

function usageForTerminal(state, usageReader) {
  const terminal = captureUsage(state.session_id, usageReader);
  if (!state.usage_baseline && terminal.usage
    && (state.executor?.kind === "task" || state.use_terminal_usage_directly)) return terminal;
  return terminalUsage(
    { usage: state.usage_baseline ?? null, usage_status: state.usage_baseline_status },
    terminal,
  );
}

export async function handleUserPromptSubmit(
  input,
  { projectRoot = PROJECT_ROOT, environment = process.env, now = () => new Date(), storageOptions, usageReader = readSessionUsage } = {},
) {
  if (typeof input?.prompt !== "string" || isSyntheticPrompt(input)) return null;
  const executor = resolveExecutor(environment);
  const parentSessionId = environment.FLOW_BI_PARENT_SESSION_ID || null;
  const occurredAt = now().toISOString();
  const usageBaseline = captureUsage(input.session_id, usageReader);
  return withStorage(projectRoot, ({ records, pending }) => {
    const parent = parentSessionId ? pendingForSession(pending, parentSessionId) : null;
    const isFirstRecordedSessionTurn = !records.some((record) => record.context?.session_id === input.session_id);
    const state = {
      kind: "task", turn_id: input.turn_id, session_id: input.session_id, node_id: `turn:${input.turn_id}`,
      parent_id: parent?.node_id ?? null, depth: parent ? parent.depth + 1 : 0,
      parent_session_id: parentSessionId, hierarchy_resolved: parentSessionId ? Boolean(parent) : true,
      executor, tree_version: parent ? parent.tree_version : TREE_VERSION,
      run_id: environment.FLOW_BI_RUN_ID || null, summary_requested: false,
      usage_baseline: usageBaseline.usage, usage_baseline_status: usageBaseline.usage_status,
      use_terminal_usage_directly: executor.kind === "primary" && !usageBaseline.usage && isFirstRecordedSessionTurn,
    };
    state.pending_key = pendingKey(state);
    const existing = pending.find((item) => item.pending_key === state.pending_key);
    if (existing) return existing;
    records.push({
      record_type: "task_start", tree_version: state.tree_version, ...commonRecord(state, occurredAt),
      prompt: input.prompt, cwd: input.cwd, model: input.model, permission_mode: input.permission_mode,
    });
    pending.push(state);
    return state;
  }, {
    ...storageOptions,
    diagnosticContext: { event: "UserPromptSubmit", session_id: input.session_id ?? null, turn_id: input.turn_id ?? null, run_id: environment.FLOW_BI_RUN_ID ?? null, task_number: executor.task_number },
  });
}

export async function handleStop(
  input,
  { projectRoot = PROJECT_ROOT, now = () => new Date(), storageOptions, usageReader = readSessionUsage } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const index = pending.findIndex((item) => item.pending_key === `primary:${input.session_id}:${input.turn_id}`);
    if (index < 0 || pending[index].executor?.kind !== "primary") return {};
    const state = pending[index];
    if (!terminalRecordForState(records, state)) {
      records.push({
        record_type: "task_end", tree_version: state.tree_version, ...commonRecord(state, now().toISOString()),
        status: "completed", exit_code: 0, ...usageForTerminal(state, usageReader),
        summary: input.last_assistant_message || "Task completed without a captured final summary.",
      });
    }
    pending.splice(index, 1);
    return {};
  }, { ...storageOptions, diagnosticContext: { event: "Stop", session_id: input.session_id ?? null, turn_id: input.turn_id ?? null, run_id: null, task_number: null } });
}

export async function recordWorkerEnd(
  { runId, exitCode, summary, status },
  { projectRoot = PROJECT_ROOT, now = () => new Date(), storageOptions, usageReader = readSessionUsage } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const index = pending.findIndex((item) => item.kind === "task" && item.run_id === runId);
    if (index < 0) return records.some((record) => record.record_type === "task_end" && record.run_id === runId)
      ? { status: "already_completed" } : { status: "start_not_found" };
    const state = pending[index];
    if (terminalRecordForState(records, state)) {
      pending.splice(index, 1);
      return { status: "cleanup_retry" };
    }
    const terminalStatus = status || (exitCode === 0 ? "completed" : "failed");
    records.push({
      record_type: "task_end", tree_version: state.tree_version, ...commonRecord(state, now().toISOString()),
      status: { type: terminalStatus, exit_code: exitCode }, ...usageForTerminal(state, usageReader),
      summary: summary?.trim() || (exitCode === 0 ? "Worker completed without a captured final summary." : `Worker failed with exit code ${exitCode}.`),
    });
    pending.splice(index, 1);
    return { status: terminalStatus };
  }, { ...storageOptions, diagnosticContext: { event: "worker_end", session_id: null, turn_id: null, run_id: runId ?? null, task_number: null } });
}

export async function recordWorkerEvent(
  event,
  { projectRoot = PROJECT_ROOT, now = () => new Date(), storageOptions, usageReader = readSessionUsage } = {},
) {
  if (!event || typeof event !== "object" || !WORKER_EVENT_TYPES.has(event.event_type)) {
    throw new Error("Invalid worker event.");
  }
  if (typeof event.run_id !== "string" || !Number.isSafeInteger(event.task_number) || !["fe-worker", "be-worker"].includes(event.area)) {
    throw new Error("Invalid worker event identity.");
  }
  if (event.event_type === "phase" && !WORKER_PHASES.has(event.phase)) throw new Error("Invalid worker event phase.");
  if (["tool_start", "tool_end"].includes(event.event_type) && typeof event.tool_id !== "string") throw new Error("Invalid worker event tool.");
  if (event.event_type === "end" && (!WORKER_STATUSES.has(event.status) || !Number.isInteger(event.exit_code))) throw new Error("Invalid worker event terminal status.");

  const result = await withStorage(projectRoot, ({ records, pending }) => {
    const state = pending.find((item) => item.kind === "task" && item.run_id === event.run_id);
    if (!state || state.executor.task_number !== event.task_number) throw new Error("Worker event run was not found.");
    if (event.parent_session_id !== undefined && event.parent_session_id !== state.parent_session_id) throw new Error("Worker event session does not match run.");
    if (state.worker_area && state.worker_area !== event.area) throw new Error("Worker event area does not match run.");
    state.worker_area = event.area;
    state.worker_timing ??= { tools: {}, current_phase: null };
    const occurredAt = eventTime(event, now);
    const timing = state.worker_timing;
    if (event.event_type === "start") {
      if (timing.started_at) return { status: "already_started" };
      timing.started_at = occurredAt;
      records.push(workerRecord(state, event, "worker_start", occurredAt));
    } else if (event.event_type === "phase") {
      if (timing.current_phase) records.push(workerRecord(state, timing.current_phase, "worker_phase_end", occurredAt, {
        duration_ms: elapsed(timing.current_phase.started_at, occurredAt), closed_by: "phase_transition",
      }));
      timing.current_phase = { phase: event.phase, phase_source: "explicit", started_at: occurredAt, phase_id: `${event.run_id}:${records.length}` };
      records.push(workerRecord(state, timing.current_phase, "worker_phase_start", occurredAt));
    } else if (event.event_type === "tool_start") {
      if (timing.tools[event.tool_id]) return { status: "already_started" };
      if (!timing.current_phase) {
        if (!WORKER_PHASES.has(event.phase) || event.phase_source !== "inferred") throw new Error("Invalid worker event phase context.");
        timing.current_phase = { phase: event.phase, phase_source: "inferred", started_at: occurredAt, phase_id: `${event.run_id}:${records.length}` };
        records.push(workerRecord(state, timing.current_phase, "worker_phase_start", occurredAt));
      }
      const phase = timing.current_phase?.phase ?? event.phase;
      const phaseSource = timing.current_phase?.phase_source ?? event.phase_source;
      if (!WORKER_PHASES.has(phase) || !["explicit", "inferred"].includes(phaseSource)) throw new Error("Invalid worker event phase context.");
      const tool = { tool_id: event.tool_id, tool_name: event.tool_name, phase, phase_source: phaseSource, started_at: occurredAt };
      timing.tools[event.tool_id] = tool;
      records.push(workerRecord(state, tool, "worker_tool_start", occurredAt));
    } else if (event.event_type === "tool_end") {
      const tool = timing.tools[event.tool_id];
      if (!tool) return { status: "duplicate_or_missing_tool_end" };
      records.push(workerRecord(state, tool, "worker_tool_end", occurredAt, { duration_ms: elapsed(tool.started_at, occurredAt) }));
      delete timing.tools[event.tool_id];
    } else {
      closeOpenWorkerIntervals(records, state, event, occurredAt);
      records.push(workerRecord(state, event, "worker_end", occurredAt, {
        status: event.status, exit_code: event.exit_code,
        summary: typeof event.summary === "string" ? event.summary.slice(0, 4096) : null,
        total_duration_ms: elapsed(timing.started_at ?? occurredAt, occurredAt),
      }));
    }
    return { status: "recorded" };
  }, { ...storageOptions, diagnosticContext: { event: "worker_event", run_id: event.run_id, task_number: event.task_number } });

  if (event.event_type === "end" && result.status === "recorded") {
    await recordWorkerEnd({ runId: event.run_id, exitCode: event.exit_code, summary: event.summary, status: event.status }, { projectRoot, now, storageOptions, usageReader });
  }
  return result;
}
