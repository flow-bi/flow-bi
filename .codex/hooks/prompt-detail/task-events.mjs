import { PROJECT_ROOT, SUMMARY_REQUEST } from "./config.mjs";
import {
  commonRecord,
  isSyntheticPrompt,
  pendingForSession,
  resolveWorker,
} from "./records.mjs";
import { withStorage } from "./storage.mjs";

export async function handleUserPromptSubmit(
  input,
  { projectRoot = PROJECT_ROOT, environment = process.env, now = () => new Date() } = {},
) {
  if (typeof input?.prompt !== "string" || isSyntheticPrompt(input)) return null;
  const worker = resolveWorker(environment);
  const parentSessionId = environment.FLOW_BI_PARENT_SESSION_ID || null;
  const occurredAt = now().toISOString();

  return withStorage(projectRoot, ({ records, pending }) => {
    const parent = parentSessionId ? pendingForSession(pending, parentSessionId) : null;
    const hierarchyResolved = parentSessionId ? Boolean(parent) : true;
    const state = {
      kind: "task",
      session_id: input.session_id,
      turn_id: input.turn_id,
      node_id: `turn:${input.turn_id}`,
      parent_id: parent?.node_id ?? null,
      parent_session_id: parentSessionId,
      depth: parent ? parent.depth + 1 : 0,
      hierarchy_resolved: hierarchyResolved,
      worker,
      run_id: environment.FLOW_BI_RUN_ID || null,
      summary_requested: false,
    };
    records.push({
      record_type: "task_start",
      ...commonRecord(state, occurredAt),
      prompt: input.prompt,
      cwd: input.cwd,
      model: input.model,
      permission_mode: input.permission_mode,
    });
    pending.push(state);
    return state;
  });
}

export async function handleStop(
  input,
  { projectRoot = PROJECT_ROOT, now = () => new Date() } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const index = pending.findIndex(
      (item) => item.kind === "task" && item.session_id === input.session_id && item.turn_id === input.turn_id,
    );
    if (index < 0 || pending[index].worker !== "primary") return {};
    const state = pending[index];
    if (!state.summary_requested && input.stop_hook_active !== true) {
      state.summary_requested = true;
      return { decision: "block", reason: SUMMARY_REQUEST };
    }

    records.push({
      record_type: "task_end",
      ...commonRecord(state, now().toISOString()),
      status: "completed",
      exit_code: 0,
      summary: input.last_assistant_message || "Task completed without a captured final summary.",
    });
    pending.splice(index, 1);
    return {};
  });
}

export async function recordWorkerEnd(
  { runId, exitCode, summary },
  { projectRoot = PROJECT_ROOT, now = () => new Date() } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const index = pending.findIndex((item) => item.kind === "task" && item.run_id === runId);
    if (index < 0) return false;
    const state = pending[index];
    records.push({
      record_type: "task_end",
      ...commonRecord(state, now().toISOString()),
      status: exitCode === 0 ? "completed" : "failed",
      exit_code: exitCode,
      summary:
        summary?.trim() ||
        (exitCode === 0
          ? "Worker completed without a captured final message."
          : `Worker failed with exit code ${exitCode} without a captured final message.`),
    });
    pending.splice(index, 1);
    return true;
  });
}
