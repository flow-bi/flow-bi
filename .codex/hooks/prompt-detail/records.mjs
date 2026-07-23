import { SUMMARY_REQUEST } from "./config.mjs";

// 하네스가 명시적으로 전달한 worker 환경변수를 먼저 확인하고 없으면 primary
export function resolveWorker(environment = process.env) {
  if (["fe-worker", "be-worker"].includes(environment.FLOW_BI_WORKER)) {
    return environment.FLOW_BI_WORKER;
  }
  return "primary";
}

// 훅이나 시스템이 생성하면 pass
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
  return matches.at(-1) ?? null;
}

export function commonRecord(state, occurredAt) {
  return {
    occurred_at: occurredAt,

    context: {
      session_id: state.session_id,
      turn_id: state.turn_id,
      node_id: state.node_id,
    },
    hierarchy: {
      parent_id: state.parent_id,
      parent_session_id: state.parent_session_id ?? null,
      depth: state.depth,
      resolved: state.hierarchy_resolved,
    },
    executor: {
      worker: state.worker,
      agent_type: state.agent_type ?? null,
    },
  };
}
