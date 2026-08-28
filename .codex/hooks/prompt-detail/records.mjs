import { SUMMARY_REQUEST } from "./config.mjs";

export const WORKER_AREAS = Object.freeze(["frontend", "backend", "harness", "shared"]);
const WORKER_AREA_SET = new Set(WORKER_AREAS);

// 하네스가 명시적으로 전달한 worker 환경변수를 먼저 확인하고 없으면 primary
export class ExecutorValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExecutorValidationError";
    this.code = "INVALID_TASK_EXECUTOR";
  }
}

export function resolveExecutor(environment = process.env) {
  const taskNumber = environment.FLOW_BI_TASK_NUMBER;
  const runId = environment.FLOW_BI_RUN_ID;
  if (taskNumber === undefined && !runId) {
    return { kind: "primary", task_number: null, area: null };
  }
  if (typeof taskNumber !== "string" || !/^[1-9]\d*$/.test(taskNumber)) {
    throw new ExecutorValidationError(
      "Task executions require FLOW_BI_TASK_NUMBER as a positive integer",
    );
  }
  const parsedTaskNumber = Number.parseInt(taskNumber, 10);
  if (!Number.isSafeInteger(parsedTaskNumber)) {
    throw new ExecutorValidationError(
      "FLOW_BI_TASK_NUMBER must be a safe positive integer",
    );
  }
  const area = environment.FLOW_BI_WORKER_AREA ?? null;
  if (area !== null && !WORKER_AREA_SET.has(area)) {
    throw new ExecutorValidationError(
      `FLOW_BI_WORKER_AREA must be one of: ${WORKER_AREAS.join(", ")}`,
    );
  }
  return { kind: "task", task_number: parsedTaskNumber, area };
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

export function pendingKey({ session_id: sessionId, turn_id: turnId, run_id: runId, executor }) {
  return executor?.kind === "task"
    ? `task:${runId}:${sessionId}:${turnId}`
    : `primary:${sessionId}:${turnId}`;
}

export function terminalRecordForState(records, state) {
  return records.find(
    (record) =>
      record.record_type === "task_end" &&
      record.run_id === (state.run_id ?? null) &&
      record.context?.session_id === state.session_id &&
      record.context?.turn_id === state.turn_id,
  );
}

export function commonRecord(state, occurredAt) {
  return {
    occurred_at: occurredAt,
    run_id: state.run_id ?? null,

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
      kind: state.executor.kind,
      task_number: state.executor.task_number,
      area: state.executor.area ?? null,
      agent_type: state.agent_type ?? null,
    },
  };
}
