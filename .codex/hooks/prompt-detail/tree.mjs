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

function executorFor(record) {
  return {
    kind: record.executor?.kind === "task" ? "task" : "primary",
    task_number:
      Number.isSafeInteger(record.executor?.task_number) &&
      record.executor.task_number > 0
        ? record.executor.task_number
        : null,
    agent_type: record.executor?.agent_type ?? null,
  };
}

function nodeFor(record, kind) {
  return {
    kind,
    id: nodeId(record),
    started_at: record.occurred_at ?? null,
    ended_at: null,
    run_id: record.run_id ?? null,
    context: contextFor(record),
    executor: executorFor(record),
    request: { prompt: record.prompt ?? null },
    usage: null,
    usage_status: null,
    result: normalizedResult(null),
    children: [],
  };
}

function workerTiming(records, runId) {
  const related = records.filter((record) => record?.run_id === runId && typeof record.record_type === "string" && record.record_type.startsWith("worker_"));
  const start = related.find((record) => record.record_type === "worker_start");
  const end = related.find((record) => record.record_type === "worker_end");
  if (!start) return null;
  const duration = Math.max(0, Date.parse(end?.occurred_at ?? start.occurred_at) - Date.parse(start.occurred_at));
  const phaseStarts = new Map();
  const phases = new Map();
  for (const record of related) {
    if (record.record_type === "worker_phase_start") phaseStarts.set(record.phase_id, record);
    if (record.record_type === "worker_phase_end") {
      const started = phaseStarts.get(record.phase_id);
      const key = `${record.phase}:${record.phase_source}`;
      const aggregate = phases.get(key) ?? { phase: record.phase, duration_ms: 0, tool_calls: 0, tool_duration_ms: 0, classification: { explicit: false, inferred: false } };
      aggregate.duration_ms += Math.max(0, Number(record.duration_ms) || (started ? Date.parse(record.occurred_at) - Date.parse(started.occurred_at) : 0));
      aggregate.classification[record.phase_source] = true;
      phases.set(key, aggregate);
    }
  }
  for (const record of related) {
    if (record.record_type !== "worker_tool_end") continue;
    const key = `${record.phase}:${record.phase_source}`;
    const aggregate = phases.get(key) ?? { phase: record.phase, duration_ms: 0, tool_calls: 0, tool_duration_ms: 0, classification: { explicit: false, inferred: false } };
    aggregate.tool_calls += 1;
    aggregate.tool_duration_ms += Math.max(0, Number(record.duration_ms) || 0);
    aggregate.classification[record.phase_source] = true;
    phases.set(key, aggregate);
  }
  const values = [...phases.values()];
  return { area: start.area ?? null, total_duration_ms: duration, phases: values, unattributed_duration_ms: Math.max(0, duration - values.reduce((total, item) => total + item.duration_ms, 0)), classification: { explicit: values.some((item) => item.classification.explicit), inferred: values.some((item) => item.classification.inferred) } };
}

function compareChildren(left, right) {
  const leftTaskNumber = left.executor.task_number;
  const rightTaskNumber = right.executor.task_number;
  if (leftTaskNumber !== null && rightTaskNumber !== null && leftTaskNumber !== rightTaskNumber) {
    return leftTaskNumber - rightTaskNumber;
  }
  if (leftTaskNumber !== null && rightTaskNumber === null) return -1;
  if (leftTaskNumber === null && rightTaskNumber !== null) return 1;
  const startedAt = (left.started_at ?? "").localeCompare(right.started_at ?? "");
  if (startedAt !== 0) return startedAt;
  return (left.run_id ?? "").localeCompare(right.run_id ?? "");
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
    node.usage = record.usage ?? null;
    node.usage_status = record.usage_status ?? null;
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
      (entry.node.kind === "agent" || entry.node.executor.kind !== "primary")
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
      entry.node.executor = {
        ...parent.node.executor,
        agent_type: entry.node.executor.agent_type,
      };
      entry.node.run_id = parent.node.run_id;
    }
    parent.node.children.push(entry.node);
  }

  for (const entry of entries.values()) {
    if (entry.node.executor.kind !== "task") continue;
    const timing = workerTiming(records, entry.node.run_id);
    if (timing) Object.assign(entry.node, timing);
  }

  for (const entry of entries.values()) {
    entry.node.children.sort(compareChildren);
  }
  tree.roots.sort(compareChildren);

  return tree;
}
