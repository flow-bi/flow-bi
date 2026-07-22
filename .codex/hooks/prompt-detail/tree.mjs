import { TREE_VERSION } from "./config.mjs";

const START_TYPES = new Map([
  ["task_start", "task"],
  ["agent_start", "agent"],
]);

const END_TYPES = new Set(["task_end", "agent_end"]);

function nodeId(record) {
  return record?.context?.node_id ?? null;
}

function normalizedResult(record) {
  if (!record) {
    return { status: "in_progress", exit_code: null, summary: null };
  }

  const structuredStatus =
    record.status && typeof record.status === "object" ? record.status : null;
  return {
    status: structuredStatus?.type ?? record.status ?? "completed",
    exit_code: structuredStatus?.exit_code ?? record.exit_code ?? null,
    summary: record.summary ?? null,
  };
}

function contextFor(record) {
  return {
    session_id: record.context?.session_id ?? null,
    turn_id: record.context?.turn_id ?? null,
    cwd: record.cwd ?? null,
    model: record.model ?? null,
    permission_mode: record.permission_mode ?? null,
  };
}

function nodeFor(record, kind) {
  return {
    kind,
    id: nodeId(record),
    started_at: record.occurred_at ?? null,
    ended_at: null,
    context: contextFor(record),
    executor: {
      worker: record.executor?.worker ?? "primary",
      agent_type: record.executor?.agent_type ?? null,
    },
    request: { prompt: record.prompt ?? null },
    result: normalizedResult(null),
    children: [],
  };
}

export function buildPromptDetailTree(records) {
  const tree = { schema_version: 1, roots: [], unresolved: [] };
  const entries = new Map();

  for (const record of records) {
    const kind = START_TYPES.get(record?.record_type);
    const id = nodeId(record);
    if (!kind || record.tree_version !== TREE_VERSION || !id || entries.has(id)) {
      continue;
    }
    entries.set(id, {
      node: nodeFor(record, kind),
      parentId: record.hierarchy?.parent_id ?? null,
      parentSessionId: record.hierarchy?.parent_session_id ?? null,
      resolved: record.hierarchy?.resolved === true,
    });
  }

  for (const record of records) {
    const id = nodeId(record);
    if (!END_TYPES.has(record?.record_type) || !id || !entries.has(id)) continue;
    const node = entries.get(id).node;
    node.ended_at = record.occurred_at ?? null;
    node.result = normalizedResult(record);
  }

  for (const entry of entries.values()) {
    if (!entry.parentId && entry.resolved) {
      tree.roots.push(entry.node);
      continue;
    }

    let parent = entry.parentId ? entries.get(entry.parentId) : null;
    if (
      !parent &&
      entry.parentSessionId &&
      (entry.node.kind === "agent" || entry.node.executor.worker !== "primary")
    ) {
      parent = [...entries.values()]
        .filter(
          (candidate) =>
            candidate !== entry &&
            candidate.node.kind === "task" &&
            candidate.node.context.session_id === entry.parentSessionId &&
            candidate.node.started_at <= entry.node.started_at,
        )
        .sort((left, right) =>
          left.node.started_at.localeCompare(right.node.started_at),
        )
        .at(-1);
    }
    if (!parent) {
      entry.node.connection_error = "parent_not_found";
      tree.unresolved.push(entry.node);
      continue;
    }

    if (entry.node.kind === "agent") {
      entry.node.executor.worker = parent.node.executor.worker;
    }
    parent.node.children.push(entry.node);
  }

  return tree;
}
