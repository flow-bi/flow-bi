import { PROJECT_ROOT, TREE_VERSION } from "./config.mjs";
import { commonRecord } from "./records.mjs";
import { withStorage } from "./storage.mjs";

export const WORKER_PHASES = Object.freeze([
  "analysis",
  "test_code",
  "implementation",
  "implementation_and_test",
  "refactor",
  "documentation",
  "verification",
  "finalization",
]);

const WORKER_PHASE_SET = new Set(WORKER_PHASES);
const PHASE_MARKER = /(?:^|[\s"'])(?:[^\s"']*\/)?phase_marker\.py["']?\s+(analysis|test_code|implementation|implementation_and_test|refactor|documentation|verification|finalization)(?=\s|$|["'])/;
const PATCH_FILE = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm;
const TEST_PATH = /(?:^|\/)(?:test|tests|__tests__|spec)(?:\/|$)|(?:\.test|\.spec)\.[cm]?[jt]sx?$|Test\.java$/i;
const DOCUMENT_PATH = /(?:^|\/)(?:docs?|documentation)(?:\/|$)|\.(?:md|mdx|rst|adoc)$/i;
const VERIFICATION_COMMAND = /(?:^|\s)(?:pytest|vitest|jest|mvnw?|gradlew?|gradle|npm|pnpm|yarn|npx|python(?:3)?\s+-m\s+(?:unittest|pytest|compileall)|git\s+diff\s+--check)(?:\s|$)|\b(?:test|check|lint|typecheck|build|spotlessCheck|compileall|cypress)\b/i;

function milliseconds(start, end) {
  const duration = Date.parse(end) - Date.parse(start);
  return Number.isFinite(duration) && duration >= 0 ? duration : 0;
}

function inputText(toolInput) {
  if (typeof toolInput === "string") return toolInput;
  if (!toolInput || typeof toolInput !== "object") return "";
  for (const key of ["cmd", "command", "patch", "input"]) {
    if (typeof toolInput[key] === "string") return toolInput[key];
  }
  try { return JSON.stringify(toolInput); }
  catch { return ""; }
}

function patchPaths(toolInput) {
  const patch = typeof toolInput?.patch === "string" ? toolInput.patch : inputText(toolInput);
  return [...patch.matchAll(PATCH_FILE)].map((match) => match[1].trim());
}

export function explicitPhase(toolName, toolInput) {
  if (!/exec|shell/i.test(toolName ?? "")) return null;
  return PHASE_MARKER.exec(inputText(toolInput))?.[1] ?? null;
}

export function classifyToolPhase(toolName, toolInput) {
  const marker = explicitPhase(toolName, toolInput);
  if (marker) return marker;
  const normalizedName = String(toolName ?? "").toLowerCase();
  if (normalizedName.includes("apply_patch") || normalizedName === "applypatch") {
    const paths = patchPaths(toolInput);
    if (paths.length === 0) return "implementation";
    const hasTests = paths.some((path) => TEST_PATH.test(path));
    const hasImplementation = paths.some((path) => !TEST_PATH.test(path) && !DOCUMENT_PATH.test(path));
    if (hasTests && hasImplementation) return "implementation_and_test";
    if (hasTests) return "test_code";
    if (paths.every((path) => DOCUMENT_PATH.test(path))) return "documentation";
    return "implementation";
  }
  if (/exec|shell/.test(normalizedName) && VERIFICATION_COMMAND.test(inputText(toolInput))) {
    return "verification";
  }
  return "analysis";
}

function workerState(pending, input, environment) {
  const runId = environment?.FLOW_BI_RUN_ID;
  if (runId) {
    const byRun = pending.find((item) => item.kind === "task" && item.run_id === runId);
    if (byRun) return byRun;
  }
  return pending.find(
    (item) => item.kind === "task" && item.session_id === input?.session_id,
  ) ?? null;
}

function phaseRecord(state, occurredAt, recordType, phase, extra = {}) {
  return {
    record_type: recordType,
    tree_version: state.tree_version ?? TREE_VERSION,
    ...commonRecord(state, occurredAt),
    phase,
    ...extra,
  };
}

export function startWorkerTiming(records, state, occurredAt) {
  if (state.executor?.kind !== "task") return;
  state.worker_phase = "analysis";
  state.worker_phase_started_at = occurredAt;
  state.worker_phase_classification = "inferred";
  state.active_tools = {};
  records.push(phaseRecord(state, occurredAt, "worker_phase_start", "analysis", {
    classification: "inferred",
  }));
}

function ensureWorkerTiming(records, state, occurredAt) {
  if (!WORKER_PHASE_SET.has(state.worker_phase) || !state.worker_phase_started_at) {
    startWorkerTiming(records, state, occurredAt);
  }
  if (!state.active_tools || typeof state.active_tools !== "object") state.active_tools = {};
}

function transitionPhase(records, state, nextPhase, occurredAt, classification) {
  ensureWorkerTiming(records, state, occurredAt);
  if (!WORKER_PHASE_SET.has(nextPhase)) return;
  if (classification === "explicit") state.worker_phase_classification = "explicit";
  if (state.worker_phase === nextPhase) return;
  records.push(phaseRecord(state, occurredAt, "worker_phase_end", state.worker_phase, {
    duration_ms: milliseconds(state.worker_phase_started_at, occurredAt),
  }));
  state.worker_phase = nextPhase;
  state.worker_phase_started_at = occurredAt;
  records.push(phaseRecord(state, occurredAt, "worker_phase_start", nextPhase, {
    classification,
  }));
}

export function closeWorkerTiming(records, state, occurredAt) {
  if (state.executor?.kind !== "task") return;
  ensureWorkerTiming(records, state, occurredAt);
  const alreadyClosed = records.some(
    (record) => record.record_type === "worker_phase_end" && record.run_id === state.run_id
      && record.phase === state.worker_phase && record.occurred_at === occurredAt,
  );
  if (!alreadyClosed) {
    records.push(phaseRecord(state, occurredAt, "worker_phase_end", state.worker_phase, {
      duration_ms: milliseconds(state.worker_phase_started_at, occurredAt),
    }));
  }
}

export function summarizeWorkerTiming(records, state, endedAt) {
  const taskStart = records.find(
    (record) => record.record_type === "task_start" && record.run_id === state.run_id,
  );
  const totalDuration = taskStart ? milliseconds(taskStart.occurred_at, endedAt) : 0;
  const phases = new Map();
  for (const record of records) {
    if (record.run_id !== state.run_id) continue;
    if (record.record_type === "worker_phase_end" && WORKER_PHASE_SET.has(record.phase)) {
      const value = phases.get(record.phase) ?? {
        phase: record.phase, duration_ms: 0, tool_calls: 0, tool_duration_ms: 0,
      };
      value.duration_ms += Number.isSafeInteger(record.duration_ms) ? record.duration_ms : 0;
      phases.set(record.phase, value);
    }
    if (record.record_type === "worker_tool_end" && WORKER_PHASE_SET.has(record.phase)) {
      const value = phases.get(record.phase) ?? {
        phase: record.phase, duration_ms: 0, tool_calls: 0, tool_duration_ms: 0,
      };
      value.tool_calls += 1;
      value.tool_duration_ms += Number.isSafeInteger(record.duration_ms) ? record.duration_ms : 0;
      phases.set(record.phase, value);
    }
  }
  const values = [...phases.values()];
  const attributed = values.reduce((sum, value) => sum + value.duration_ms, 0);
  return {
    total_duration_ms: totalDuration,
    phases: values,
    unattributed_duration_ms: Math.max(totalDuration - attributed, 0),
    classification: state.worker_phase_classification === "explicit" ? "explicit" : "inferred",
  };
}

export async function handlePreToolUse(
  input,
  { projectRoot = PROJECT_ROOT, environment = process.env, now = () => new Date(), storageOptions } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const state = workerState(pending, input, environment);
    if (!state) return {};
    const occurredAt = now().toISOString();
    ensureWorkerTiming(records, state, occurredAt);
    const markedPhase = explicitPhase(input.tool_name, input.tool_input);
    if (markedPhase) {
      transitionPhase(records, state, markedPhase, occurredAt, "explicit");
      return {};
    }
    if (state.worker_phase_classification !== "explicit") {
      transitionPhase(
        records,
        state,
        classifyToolPhase(input.tool_name, input.tool_input),
        occurredAt,
        "inferred",
      );
    }
    if (typeof input.tool_use_id !== "string" || state.active_tools[input.tool_use_id]) return {};
    state.active_tools[input.tool_use_id] = {
      started_at: occurredAt,
      phase: state.worker_phase,
      tool_name: input.tool_name ?? null,
    };
    records.push({
      ...phaseRecord(state, occurredAt, "worker_tool_start", state.worker_phase),
      tool_use_id: input.tool_use_id,
      tool_name: input.tool_name ?? null,
    });
    return {};
  }, {
    ...storageOptions,
    diagnosticContext: {
      event: "PreToolUse",
      session_id: input?.session_id ?? null,
      turn_id: input?.turn_id ?? null,
      run_id: environment?.FLOW_BI_RUN_ID ?? null,
      task_number: stateTaskNumber(environment),
    },
  });
}

function stateTaskNumber(environment) {
  const value = Number.parseInt(environment?.FLOW_BI_TASK_NUMBER ?? "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function handlePostToolUse(
  input,
  { projectRoot = PROJECT_ROOT, environment = process.env, now = () => new Date(), storageOptions } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const state = workerState(pending, input, environment);
    const active = state?.active_tools?.[input?.tool_use_id];
    if (!state || !active) return {};
    const occurredAt = now().toISOString();
    records.push({
      ...phaseRecord(state, occurredAt, "worker_tool_end", active.phase),
      tool_use_id: input.tool_use_id,
      tool_name: active.tool_name,
      duration_ms: milliseconds(active.started_at, occurredAt),
    });
    delete state.active_tools[input.tool_use_id];
    return {};
  }, {
    ...storageOptions,
    diagnosticContext: {
      event: "PostToolUse",
      session_id: input?.session_id ?? null,
      turn_id: input?.turn_id ?? null,
      run_id: environment?.FLOW_BI_RUN_ID ?? null,
      task_number: stateTaskNumber(environment),
    },
  });
}

export async function recordWorkerPhase(
  { runId, phase },
  { projectRoot = PROJECT_ROOT, now = () => new Date(), storageOptions } = {},
) {
  if (typeof runId !== "string" || runId.length === 0) {
    throw new TypeError("runId is required");
  }
  if (!WORKER_PHASE_SET.has(phase)) {
    throw new TypeError(`Unsupported worker phase: ${phase}`);
  }
  return withStorage(projectRoot, ({ records, pending }) => {
    const state = pending.find((item) => item.kind === "task" && item.run_id === runId);
    if (!state) {
      return records.some(
        (record) => record.record_type === "task_end" && record.run_id === runId,
      ) ? { status: "already_completed" } : { status: "start_not_found" };
    }
    const occurredAt = now().toISOString();
    const previousPhase = state.worker_phase;
    transitionPhase(records, state, phase, occurredAt, "explicit");
    return { status: previousPhase === phase ? "phase_unchanged" : "recorded" };
  }, {
    ...storageOptions,
    diagnosticContext: {
      event: "worker_phase",
      session_id: null,
      turn_id: null,
      run_id: runId,
      task_number: null,
    },
  });
}
