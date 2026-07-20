import { PROJECT_ROOT } from "./config.mjs";
import { commonRecord } from "./records.mjs";
import { withStorage } from "./storage.mjs";

export async function handleSubagentStart(
  input,
  { projectRoot = PROJECT_ROOT, now = () => new Date() } = {},
) {
  const result = await withStorage(projectRoot, ({ records, pending }) => {
    const turnNode = `turn:${input.turn_id}`;
    const candidates = pending.filter(
      (item) => item.node_id === turnNode || (item.kind === "agent" && item.turn_id === input.turn_id),
    );
    const parent = candidates.length === 1 && candidates[0].node_id === turnNode ? candidates[0] : null;
    const state = {
      kind: "agent",
      session_id: input.session_id,
      turn_id: input.turn_id,
      node_id: `agent:${input.agent_id}`,
      parent_id: parent?.node_id ?? null,
      parent_session_id: input.session_id,
      depth: parent ? parent.depth + 1 : 0,
      hierarchy_resolved: Boolean(parent),
      worker: "primary",
      agent_type: input.agent_type,
      agent_id: input.agent_id,
    };
    records.push({
      record_type: "agent_start",
      ...commonRecord(state, now().toISOString()),
    });
    pending.push(state);
    return state;
  });
  return {
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext:
        "End your final response with a short work summary stating the outcome and verification performed.",
    },
    state: result,
  };
}

export async function handleSubagentStop(
  input,
  { projectRoot = PROJECT_ROOT, now = () => new Date() } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const index = pending.findIndex(
      (item) => item.kind === "agent" && item.agent_id === input.agent_id,
    );
    if (index < 0) return {};
    const state = pending[index];
    records.push({
      record_type: "agent_end",
      ...commonRecord(state, now().toISOString()),
      status: "completed",
      summary: input.last_assistant_message || "Subagent completed without a captured final summary.",
    });
    pending.splice(index, 1);
    return {};
  });
}
