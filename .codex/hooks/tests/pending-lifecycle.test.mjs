import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  handleStop,
  handleUserPromptSubmit,
  recordWorkerEnd,
} from "../prompt-detail/task-events.mjs";
import { storagePaths } from "../prompt-detail/config.mjs";
import { readJson } from "../prompt-detail/storage.mjs";

function fixture() {
  const projectRoot = mkdtempSync(join(tmpdir(), "pending-lifecycle-"));
  const now = () => new Date("2026-08-24T00:00:00.000Z");
  const paths = storagePaths(projectRoot);
  return { projectRoot, now, paths, dispose: () => rmSync(projectRoot, { recursive: true, force: true }) };
}

function taskInput(sessionId = "session-1", turnId = "turn-1") {
  return { prompt: "implement", session_id: sessionId, turn_id: turnId };
}

test("reuses the same pending entry and task_start for duplicate starts", async () => {
  const testFixture = fixture();
  try {
    const options = {
      projectRoot: testFixture.projectRoot,
      now: testFixture.now,
      environment: { FLOW_BI_RUN_ID: "run-1", FLOW_BI_TASK_NUMBER: "3" },
    };
    await handleUserPromptSubmit(taskInput(), options);
    await handleUserPromptSubmit(taskInput(), options);
    const records = readJson(testFixture.paths.logFile, []);
    const pending = readJson(testFixture.paths.pendingFile, []);
    assert.equal(records.filter((record) => record.record_type === "task_start").length, 1);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].pending_key, "task:run-1:session-1:turn-1");
  } finally { testFixture.dispose(); }
});

test("keeps same task-number reruns isolated and ordinary task Stop leaves pending intact", async () => {
  const testFixture = fixture();
  try {
    const options = (runId) => ({
      projectRoot: testFixture.projectRoot, now: testFixture.now,
      environment: { FLOW_BI_RUN_ID: runId, FLOW_BI_TASK_NUMBER: "3" },
    });
    await handleUserPromptSubmit(taskInput("session-a", "turn-a"), options("run-a"));
    await handleUserPromptSubmit(taskInput("session-b", "turn-b"), options("run-b"));
    await handleStop({ session_id: "session-a", turn_id: "turn-a" }, { projectRoot: testFixture.projectRoot, now: testFixture.now });
    assert.equal(readJson(testFixture.paths.pendingFile, []).length, 2);
    await recordWorkerEnd({ runId: "run-a", exitCode: 1, summary: "failed", status: "failed" }, { projectRoot: testFixture.projectRoot, now: testFixture.now });
    const pending = readJson(testFixture.paths.pendingFile, []);
    assert.deepEqual(pending.map((entry) => entry.run_id), ["run-b"]);
  } finally { testFixture.dispose(); }
});

test("upserts terminal before cleanup and retries only the matching pending cleanup", async () => {
  const testFixture = fixture();
  try {
    const options = {
      projectRoot: testFixture.projectRoot, now: testFixture.now,
      environment: { FLOW_BI_RUN_ID: "run-1", FLOW_BI_TASK_NUMBER: "3" },
    };
    await handleUserPromptSubmit(taskInput(), options);
    assert.equal((await recordWorkerEnd({ runId: "missing", exitCode: 0, summary: "", status: "completed" }, options)).status, "start_not_found");
    assert.equal((await recordWorkerEnd({ runId: "run-1", exitCode: 0, summary: "done", status: "completed" }, options)).status, "completed");
    assert.equal((await recordWorkerEnd({ runId: "run-1", exitCode: 0, summary: "done", status: "completed" }, options)).status, "already_completed");
    const records = readJson(testFixture.paths.logFile, []);
    assert.equal(records.filter((record) => record.record_type === "task_end").length, 1);
    assert.deepEqual(readJson(testFixture.paths.pendingFile, []), []);
  } finally { testFixture.dispose(); }
});

test("primary Stop completes only its primary pending entry", async () => {
  const testFixture = fixture();
  try {
    await handleUserPromptSubmit(taskInput("parent", "turn"), { projectRoot: testFixture.projectRoot, now: testFixture.now, environment: {} });
    await handleUserPromptSubmit(taskInput("child", "turn"), { projectRoot: testFixture.projectRoot, now: testFixture.now, environment: { FLOW_BI_RUN_ID: "run-1", FLOW_BI_TASK_NUMBER: "3" } });
    await handleStop({ session_id: "parent", turn_id: "turn" }, { projectRoot: testFixture.projectRoot, now: testFixture.now });
    assert.deepEqual(readJson(testFixture.paths.pendingFile, []).map((entry) => entry.run_id), ["run-1"]);
  } finally { testFixture.dispose(); }
});
