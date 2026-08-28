import assert from "node:assert/strict";
import * as fs from "node:fs";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LOCK_TIMEOUT_MS, storagePaths } from "../prompt-detail/config.mjs";
import { recordWorkerEnd, handleUserPromptSubmit } from "../prompt-detail/task-events.mjs";
import { readJson, withStorage } from "../prompt-detail/storage.mjs";

function fixture() {
  const projectRoot = mkdtempSync(join(tmpdir(), "storage-recovery-"));
  const paths = storagePaths(projectRoot);
  return { projectRoot, paths, dispose: () => rmSync(projectRoot, { recursive: true, force: true }) };
}

function taskOptions(projectRoot, storageOptions = undefined) {
  return {
    projectRoot,
    now: () => new Date("2026-08-24T00:00:00.000Z"),
    environment: { FLOW_BI_RUN_ID: "run-4", FLOW_BI_TASK_NUMBER: "4" },
    storageOptions,
  };
}

test("preserves malformed JSON bytes, resets only the damaged store, and records the next event", async () => {
  const testFixture = fixture();
  try {
    fs.mkdirSync(testFixture.paths.pendingDirectory, { recursive: true });
    const damaged = Buffer.from('{"secret":"must-not-appear"');
    writeFileSync(testFixture.paths.logFile, damaged);
    const diagnostics = [];
    await handleUserPromptSubmit(
      { prompt: "safe prompt", session_id: "session-4", turn_id: "turn-4" },
      taskOptions(testFixture.projectRoot, { onDiagnostic: (entry) => diagnostics.push(entry) }),
    );
    const recovery = readdirSync(testFixture.paths.logDirectory).find((name) => name.includes("user-prompt-detail-submit.json.corrupt."));
    assert.deepEqual(fs.readFileSync(join(testFixture.paths.logDirectory, recovery)), damaged);
    assert.deepEqual(
      readJson(testFixture.paths.logFile, []).map((record) => record.record_type),
      ["task_start", "worker_phase_start"],
    );
    assert.deepEqual(diagnostics[0], {
      stage: "read", store: "records", event: "UserPromptSubmit", session_id: "session-4", turn_id: "turn-4",
      run_id: "run-4", task_number: 4, error_code: "INVALID_JSON",
    });
    assert.equal(JSON.stringify(diagnostics).includes("must-not-appear"), false);
  } finally { testFixture.dispose(); }
});

test("recovers non-array pending roots and stale locks without blocking the event", async () => {
  const testFixture = fixture();
  try {
    fs.mkdirSync(testFixture.paths.pendingDirectory, { recursive: true });
    writeFileSync(testFixture.paths.pendingFile, "{}", "utf8");
    writeFileSync(testFixture.paths.treeFile, "[]", "utf8");
    fs.mkdirSync(testFixture.paths.lockDirectory);
    fs.utimesSync(testFixture.paths.lockDirectory, new Date(0), new Date(0));
    const diagnostics = [];
    await handleUserPromptSubmit(
      { prompt: "safe", session_id: "session-4", turn_id: "turn-4" },
      taskOptions(testFixture.projectRoot, { onDiagnostic: (entry) => diagnostics.push(entry) }),
    );
    assert.equal(readJson(testFixture.paths.pendingFile, []).length, 1);
    assert.ok(readdirSync(testFixture.paths.pendingDirectory).some((name) => name.includes("pending.json.corrupt.")));
    assert.ok(readdirSync(testFixture.paths.logDirectory).some((name) => name.includes("user-prompt-detail-tree.json.corrupt.")));
    assert.deepEqual(diagnostics.map((entry) => entry.stage), ["lock", "validate", "validate"]);
  } finally { testFixture.dispose(); }
});

test("reports lock timeouts and atomic record write failures with a restricted diagnostic", async () => {
  const testFixture = fixture();
  try {
    const diagnostics = [];
    const alwaysLockedFs = { ...fs, mkdirSync: (path, options) => {
      if (path === testFixture.paths.lockDirectory) { const error = new Error("locked"); error.code = "EEXIST"; throw error; }
      return fs.mkdirSync(path, options);
    }, statSync: () => ({ mtimeMs: 0 }) };
    let clockCalls = 0;
    await assert.rejects(
      withStorage(testFixture.projectRoot, () => null, { fileSystem: alwaysLockedFs, nowMs: () => (clockCalls++ === 0 ? 0 : LOCK_TIMEOUT_MS), onDiagnostic: (entry) => diagnostics.push(entry) }),
      /prompt log lock/,
    );
    const failingRenameFs = { ...fs, renameSync: () => { const error = new Error("rename failed"); error.code = "EIO"; throw error; } };
    await assert.rejects(
      withStorage(testFixture.projectRoot, () => null, { fileSystem: failingRenameFs, onDiagnostic: (entry) => diagnostics.push(entry) }),
      /rename failed/,
    );
    assert.deepEqual(diagnostics.map((entry) => [entry.stage, entry.error_code]), [["lock", "LOCK_TIMEOUT"], ["write_records", "EIO"]]);
    assert.equal(JSON.stringify(diagnostics).includes("rename failed"), false);
  } finally { testFixture.dispose(); }
});

test("keeps a terminal record when pending persistence fails and cleans it on retry without duplication", async () => {
  const testFixture = fixture();
  try {
    await handleUserPromptSubmit({ prompt: "safe", session_id: "session-4", turn_id: "turn-4" }, taskOptions(testFixture.projectRoot));
    const pendingRenameFailure = {
      ...fs,
      renameSync: (from, to) => {
        if (to === testFixture.paths.pendingFile) { const error = new Error("pending write failed"); error.code = "EIO"; throw error; }
        return fs.renameSync(from, to);
      },
    };
    await assert.rejects(
      recordWorkerEnd({ runId: "run-4", exitCode: 0, summary: "done", status: "completed" }, taskOptions(testFixture.projectRoot, { fileSystem: pendingRenameFailure, onDiagnostic: () => {} })),
      /pending write failed/,
    );
    assert.equal(readJson(testFixture.paths.logFile, []).filter((record) => record.record_type === "task_end").length, 1);
    assert.equal(readJson(testFixture.paths.pendingFile, []).length, 1);
    assert.deepEqual(await recordWorkerEnd({ runId: "run-4", exitCode: 0, summary: "done", status: "completed" }, taskOptions(testFixture.projectRoot)), { status: "cleanup_retry" });
    assert.equal(readJson(testFixture.paths.logFile, []).filter((record) => record.record_type === "task_end").length, 1);
    assert.deepEqual(readJson(testFixture.paths.pendingFile, []), []);
  } finally { testFixture.dispose(); }
});
