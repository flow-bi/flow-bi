import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  deltaUsage,
  normalizeCumulativeUsage,
  readSessionUsage,
  usageSnapshot,
} from "../prompt-detail/usage.mjs";
import {
  handleStop,
  handleUserPromptSubmit,
  recordWorkerEnd,
} from "../prompt-detail/task-events.mjs";
import { storagePaths } from "../prompt-detail/config.mjs";
import { readJson } from "../prompt-detail/storage.mjs";

function totalUsage(input, cached, cacheWrite, output, reasoning, total) {
  return { token_count: { info: { total_token_usage: {
    input_tokens: input, cached_input_tokens: cached, cache_creation_input_tokens: cacheWrite,
    output_tokens: output, reasoning_output_tokens: reasoning, total_tokens: total,
  } } } };
}

test("normalizes the final valid cumulative usage without double-counting cached or reasoning detail", () => {
  const usage = normalizeCumulativeUsage(totalUsage(100, 20, 5, 40, 10, 140));
  assert.deepEqual(usage, {
    input_tokens: 100, output_tokens: 40, total_tokens: 140,
    cached_input_tokens: 20, cache_creation_input_tokens: 5, reasoning_output_tokens: 10,
  });
  assert.deepEqual(deltaUsage(usage, normalizeCumulativeUsage(totalUsage(130, 30, 8, 70, 20, 200))), {
    input_tokens: 30, output_tokens: 30, total_tokens: 60,
    cached_input_tokens: 10, cache_creation_input_tokens: 3, reasoning_output_tokens: 10,
  });
});

test("reads only the requested session's last valid rollout usage", () => {
  const files = new Map([
    ["sessions/rollout-target.jsonl", `${JSON.stringify({ type: "session_meta", payload: { id: "target" } })}\n${JSON.stringify({ payload: totalUsage(10, 1, 0, 5, 1, 15) })}\nnot json\n${JSON.stringify({ payload: totalUsage(20, 2, 1, 9, 2, 29) })}\n`],
  ]);
  const fileSystem = {
    readdirSync: () => [{ name: "rollout-target.jsonl", isDirectory: () => false }],
    readFileSync: (file) => files.get(file.replace(/\\/g, "/")),
  };
  assert.deepEqual(readSessionUsage("target", { sessionsDirectory: "sessions", fileSystem }), {
    usage: { input_tokens: 20, output_tokens: 9, total_tokens: 29, cached_input_tokens: 2, cache_creation_input_tokens: 1, reasoning_output_tokens: 2 },
    usage_status: "AVAILABLE",
  });
});

test("records direct parent and task deltas independently and keeps equal task numbers isolated", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "token-usage-"));
  try {
    const snapshots = new Map([
      ["parent", [totalUsage(10, 1, 0, 5, 1, 15), totalUsage(25, 4, 1, 12, 3, 37)]],
      ["task-a", [totalUsage(100, 20, 2, 30, 7, 130), totalUsage(140, 25, 3, 50, 10, 190)]],
      ["task-b", [totalUsage(500, 50, 4, 90, 20, 590), totalUsage(510, 51, 4, 95, 21, 605)]],
    ]);
    const usageReader = (sessionId) => usageSnapshot(snapshots.get(sessionId).shift());
    const options = (environment = {}) => ({ projectRoot, environment, usageReader, now: () => new Date("2026-08-24T00:00:00.000Z") });
    await handleUserPromptSubmit({ prompt: "parent", session_id: "parent", turn_id: "p" }, options());
    await handleUserPromptSubmit({ prompt: "a", session_id: "task-a", turn_id: "a" }, options({ FLOW_BI_RUN_ID: "run-a", FLOW_BI_TASK_NUMBER: "4" }));
    await handleUserPromptSubmit({ prompt: "b", session_id: "task-b", turn_id: "b" }, options({ FLOW_BI_RUN_ID: "run-b", FLOW_BI_TASK_NUMBER: "4" }));
    await handleStop({ session_id: "parent", turn_id: "p" }, options());
    await recordWorkerEnd({ runId: "run-a", exitCode: 0, summary: "", status: "completed" }, options());
    await recordWorkerEnd({ runId: "run-b", exitCode: 0, summary: "", status: "completed" }, options());
    const ends = readJson(storagePaths(projectRoot).logFile, []).filter((record) => record.record_type === "task_end");
    assert.deepEqual(ends.map((record) => [record.run_id, record.context.session_id, record.usage]), [
      [null, "parent", { input_tokens: 15, output_tokens: 7, total_tokens: 22, cached_input_tokens: 3, cache_creation_input_tokens: 1, reasoning_output_tokens: 2 }],
      ["run-a", "task-a", { input_tokens: 40, output_tokens: 20, total_tokens: 60, cached_input_tokens: 5, cache_creation_input_tokens: 1, reasoning_output_tokens: 3 }],
      ["run-b", "task-b", { input_tokens: 10, output_tokens: 5, total_tokens: 15, cached_input_tokens: 1, cache_creation_input_tokens: 0, reasoning_output_tokens: 1 }],
    ]);
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

test("preserves terminal cleanup when usage is missing, unreadable, partial, or regresses", async () => {
  for (const [baseline, terminal, expectedStatus] of [
    [null, totalUsage(2, 0, 0, 1, 0, 3), "BASELINE_USAGE_MISSING"],
    [totalUsage(3, 0, 0, 2, 0, 5), null, "USAGE_MISSING"],
    [totalUsage(3, 0, 0, 2, 0, 5), { token_count: { info: { total_token_usage: { input_tokens: 4, total_tokens: 6 } } } }, "USAGE_PARTIAL"],
    [totalUsage(5, 0, 0, 3, 0, 8), totalUsage(4, 0, 0, 4, 0, 8), "USAGE_NEGATIVE_DELTA"],
  ]) {
    const projectRoot = mkdtempSync(join(tmpdir(), "token-usage-error-"));
    try {
      const values = [baseline, terminal];
      const usageReader = () => {
        const value = values.shift();
        return usageSnapshot(value);
      };
      const options = { projectRoot, environment: {}, usageReader, now: () => new Date("2026-08-24T00:00:00.000Z") };
      await handleUserPromptSubmit({ prompt: "task", session_id: "session", turn_id: "turn" }, options);
      await handleStop({ session_id: "session", turn_id: "turn" }, options);
      const [end] = readJson(storagePaths(projectRoot).logFile, []).filter((record) => record.record_type === "task_end");
      assert.equal(end.usage, null);
      assert.equal(end.usage_status, expectedStatus);
      assert.deepEqual(readJson(storagePaths(projectRoot).pendingFile, []), []);
    } finally { rmSync(projectRoot, { recursive: true, force: true }); }
  }
});
