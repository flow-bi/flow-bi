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

function captureUsage(sessionId, usageReader) {
  try { return usageReader(sessionId); }
  catch { return { usage: null, usage_status: "SESSION_READ_FAILED" }; }
}

function usageForTerminal(state, usageReader) {
  return terminalUsage(
    { usage: state.usage_baseline ?? null, usage_status: state.usage_baseline_status },
    captureUsage(state.session_id, usageReader),
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
    const state = {
      kind: "task", turn_id: input.turn_id, session_id: input.session_id, node_id: `turn:${input.turn_id}`,
      parent_id: parent?.node_id ?? null, depth: parent ? parent.depth + 1 : 0,
      parent_session_id: parentSessionId, hierarchy_resolved: parentSessionId ? Boolean(parent) : true,
      executor, tree_version: parent ? parent.tree_version : TREE_VERSION,
      run_id: environment.FLOW_BI_RUN_ID || null, summary_requested: false,
      usage_baseline: usageBaseline.usage, usage_baseline_status: usageBaseline.usage_status,
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
