import { SUMMARY_REQUEST } from "./config.mjs";

export function resolveWorker(environment = process.env) {
  if (["fe-worker", "be-worker"].includes(environment.FLOW_BI_WORKER)) {
    return environment.FLOW_BI_WORKER;
  }
  if (
    ["fe-worker", "be-worker"].includes(environment.CODEX_PERMISSION_PROFILE)
  ) {
    return environment.CODEX_PERMISSION_PROFILE;
  }
  return "primary";
}

export function isSyntheticPrompt(input) {
  return (
    input?.prompt === SUMMARY_REQUEST ||
    input?.is_fake_user_prompt === true ||
    input?.synthetic === true ||
    ["hook", "system"].includes(input?.prompt_source)
  );
}

export function pendingForSession(pending, sessionId) {
  const matches = pending.filter(
    (item) => item.session_id === sessionId && item.kind === "task",
  );
  return matches.length === 1 ? matches[0] : null;
}

export function commonRecord(state, occurredAt) {
  return {
    detail: {
      occurred_at: occurredAt,
      session_id: state.session_id,
      turn_id: state.turn_id,
      parent_id: state.parent_id,
      ...(state.parent_session_id
        ? { parent_session_id: state.parent_session_id }
        : {}),
      depth: state.depth,
      hierarchy_resolved: state.hierarchy_resolved,
    },

    worker: state.worker,
    ...(state.agent_type ? { agent_type: state.agent_type } : {}),
  };
}
