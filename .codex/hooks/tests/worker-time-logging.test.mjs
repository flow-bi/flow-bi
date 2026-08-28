import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  handleStop,
  handleUserPromptSubmit,
  recordWorkerEvent,
} from "../prompt-detail/task-events.mjs";
import { storagePaths } from "../prompt-detail/config.mjs";
import { readJson } from "../prompt-detail/storage.mjs";

function clock(...timestamps) {
  let index = 0;
  return () => new Date(timestamps[index++] ?? timestamps.at(-1));
}

function options(projectRoot, now, runId, taskNumber, sessionId = "parent") {
  return {
    projectRoot,
    now,
    environment: {
      FLOW_BI_RUN_ID: runId,
      FLOW_BI_TASK_NUMBER: String(taskNumber),
      FLOW_BI_PARENT_SESSION_ID: sessionId,
    },
    usageReader: () => ({ usage: null, usage_status: "UNAVAILABLE" }),
  };
}

async function startWorker(projectRoot, now, runId, taskNumber, sessionId = "parent") {
  const eventOptions = options(projectRoot, now, runId, taskNumber, sessionId);
  await handleUserPromptSubmit(
    { prompt: `Task ${taskNumber}`, session_id: `${runId}-session`, turn_id: `${runId}-turn` },
    eventOptions,
  );
  return eventOptions;
}

test("records isolated worker timing, explicit and inferred phases, and terminal outcomes", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "worker-time-"));
  try {
    const now = clock(
      "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:01.000Z",
      "2026-08-28T00:00:03.000Z", "2026-08-28T00:00:05.000Z",
      "2026-08-28T00:00:07.000Z", "2026-08-28T00:00:10.000Z",
      "2026-08-28T00:00:12.000Z", "2026-08-28T00:00:14.000Z",
      "2026-08-28T00:00:20.000Z", "2026-08-28T00:00:25.000Z",
      "2026-08-28T00:00:30.000Z", "2026-08-28T00:00:35.000Z",
    );
    await handleUserPromptSubmit(
      { prompt: "parent", session_id: "parent", turn_id: "parent-turn" },
      { projectRoot, now, environment: {}, usageReader: () => ({ usage: null, usage_status: "UNAVAILABLE" }) },
    );
    const complete = await startWorker(projectRoot, now, "run-7a", 7);
    const timeout = await startWorker(projectRoot, now, "run-7b", 7);

    for (const event of [
      { event_type: "start" },
      { event_type: "phase", phase: "implementation", phase_source: "explicit" },
      { event_type: "tool_start", tool_id: "tool-1", tool_name: "exec", phase: "implementation", phase_source: "explicit" },
      { event_type: "tool_end", tool_id: "tool-1", tool_name: "exec", phase: "implementation", phase_source: "explicit" },
      { event_type: "end", status: "completed", exit_code: 0, summary: "done" },
    ]) await recordWorkerEvent({ ...event, run_id: "run-7a", task_number: 7, area: "fe-worker", parent_session_id: "parent" }, complete);

    for (const event of [
      { event_type: "start" },
      { event_type: "tool_start", tool_id: "tool-2", tool_name: "rg", phase: "analysis", phase_source: "inferred" },
      { event_type: "end", status: "timeout", exit_code: 124, summary: "timed out" },
    ]) await recordWorkerEvent({ ...event, run_id: "run-7b", task_number: 7, area: "be-worker", parent_session_id: "parent" }, timeout);
    await handleStop({ session_id: "parent", turn_id: "parent-turn" }, { projectRoot, now, usageReader: () => ({ usage: null, usage_status: "UNAVAILABLE" }) });

    const { logFile, treeFile } = storagePaths(projectRoot);
    const records = readJson(logFile, []);
    const tree = readJson(treeFile, {});
    const workers = tree.roots[0].children;
    assert.equal(records.filter((record) => record.record_type === "worker_start").length, 2);
    assert.equal(records.some((record) => record.record_type === "worker_phase_start" && record.phase_source === "explicit"), true);
    assert.equal(records.some((record) => record.record_type === "worker_tool_end" && record.duration_ms === 2000), true);
    assert.equal(records.every((record) => !Object.hasOwn(record, "token")), true);
    assert.deepEqual(workers.map((worker) => [worker.run_id, worker.area, worker.result.status]), [
      ["run-7a", "fe-worker", "completed"], ["run-7b", "be-worker", "timeout"],
    ]);
    assert.deepEqual(workers[0].phases, [{ phase: "implementation", duration_ms: 7000, tool_calls: 1, tool_duration_ms: 2000, classification: { explicit: true, inferred: false } }]);
    assert.equal(workers[0].total_duration_ms, 9000);
    assert.equal(workers[0].unattributed_duration_ms, 2000);
    assert.deepEqual(workers[1].phases, [{ phase: "analysis", duration_ms: 5000, tool_calls: 1, tool_duration_ms: 5000, classification: { explicit: false, inferred: true } }]);
    assert.equal(workers[1].total_duration_ms, 10000);
    assert.equal(workers[1].unattributed_duration_ms, 5000);
    assert.equal(tree.roots[0].area, undefined);
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

test("rejects invalid worker input without producing a partial record", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "worker-time-invalid-"));
  try {
    const now = clock("2026-08-28T00:00:00.000Z");
    const eventOptions = await startWorker(projectRoot, now, "run-1", 1);
    await assert.rejects(
      recordWorkerEvent({ event_type: "phase", run_id: "run-other", task_number: 1, area: "fe-worker", phase: "invalid" }, eventOptions),
      /worker event/i,
    );
    assert.equal(readJson(storagePaths(projectRoot).logFile, []).some((record) => record.record_type.startsWith("worker_")), false);
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});
