import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const CORE_FIELDS = ["input_tokens", "output_tokens", "total_tokens"];
const DETAIL_FIELDS = ["cached_input_tokens", "cache_creation_input_tokens", "reasoning_output_tokens"];
const ALL_FIELDS = [...CORE_FIELDS, ...DETAIL_FIELDS];

function totalTokenUsage(value) {
  return value?.token_count?.info?.total_token_usage
    ?? value?.payload?.token_count?.info?.total_token_usage
    ?? null;
}
function numberAt(value, field) {
  const number = value?.[field];
  return typeof number === "number" && Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeCumulativeUsage(value) {
  const total = totalTokenUsage(value);
  if (!total || typeof total !== "object") return null;
  const usage = Object.fromEntries(ALL_FIELDS.map((field) => [field, numberAt(total, field)]));
  return CORE_FIELDS.some((field) => usage[field] === null) ? null : usage;
}

export function usageSnapshot(value) {
  const total = totalTokenUsage(value);
  if (!total || typeof total !== "object") return { usage: null, usage_status: "USAGE_MISSING" };
  if (CORE_FIELDS.some((field) => numberAt(total, field) === null)) return { usage: null, usage_status: "USAGE_PARTIAL" };
  return { usage: normalizeCumulativeUsage(value), usage_status: "AVAILABLE" };
}

export function deltaUsage(baseline, terminal) {
  if (!baseline || !terminal) return null;
  const delta = {};
  for (const field of CORE_FIELDS) {
    const value = terminal[field] - baseline[field];
    if (value < 0) return null;
    delta[field] = value;
  }
  for (const field of DETAIL_FIELDS) {
    if (baseline[field] === null || terminal[field] === null) delta[field] = null;
    else {
      const value = terminal[field] - baseline[field];
      if (value < 0) return null;
      delta[field] = value;
    }
  }
  return delta;
}

export function terminalUsage(baseline, terminal) {
  if (!baseline?.usage) return { usage: null, usage_status: `BASELINE_${baseline?.usage_status ?? "USAGE_MISSING"}` };
  if (!terminal?.usage) return { usage: null, usage_status: terminal?.usage_status ?? "TERMINAL_USAGE_MISSING" };
  const usage = deltaUsage(baseline.usage, terminal.usage);
  return usage ? { usage, usage_status: "AVAILABLE" } : { usage: null, usage_status: "USAGE_NEGATIVE_DELTA" };
}

function sessionIdFor(record) {
  return record?.session_id
    ?? record?.payload?.session_id
    ?? record?.event?.session_id
    ?? (record?.type === "session_meta" ? record?.payload?.id : null)
    ?? null;
}
function rolloutFiles(directory, fileSystem) {
  const files = [];
  for (const entry of fileSystem.readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...rolloutFiles(file, fileSystem));
    else if (entry.isFile?.() ?? true) files.push(file);
  }
  return files.sort();
}

export function readSessionUsage(sessionId, { sessionsDirectory = join(homedir(), ".codex", "sessions"), fileSystem = { readdirSync, readFileSync } } = {}) {
  try {
    let foundSession = false;
    let latest = null;
    const candidates = rolloutFiles(sessionsDirectory, fileSystem)
      .filter((file) => basename(file).includes(sessionId));
    if (candidates.length === 0) return { usage: null, usage_status: "SESSION_NOT_FOUND" };
    for (const file of candidates) {
      const records = [];
      for (const line of fileSystem.readFileSync(file, "utf8").toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        try { records.push(JSON.parse(line)); }
        catch { /* Corrupt rollout entries do not block lifecycle logging. */ }
      }
      const fileMatchesSession = records.some((record) => sessionIdFor(record) === sessionId);
      if (!fileMatchesSession) continue;
      foundSession = true;
      for (const record of records) {
        const snapshot = usageSnapshot(record);
        if (snapshot.usage) latest = snapshot;
      }
    }
    return latest ?? { usage: null, usage_status: foundSession ? "USAGE_MISSING" : "SESSION_NOT_FOUND" };
  } catch { return { usage: null, usage_status: "SESSION_READ_FAILED" }; }
}
