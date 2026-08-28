import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { storagePaths } from "../prompt-detail/config.mjs";
import { readJson } from "../prompt-detail/storage.mjs";
import { handleUserPromptSubmit, recordWorkerEnd } from "../prompt-detail/task-events.mjs";
import {
  classifyToolPhase,
  handlePostToolUse,
  handlePreToolUse,
  recordWorkerPhase,
} from "../prompt-detail/tool-events.mjs";

function fixture() {
  const projectRoot = mkdtempSync(join(tmpdir(), "worker-phase-timing-"));
  const paths = storagePaths(projectRoot);
  return {
    projectRoot,
    paths,
    dispose: () => rmSync(projectRoot, { recursive: true, force: true }),
  };
}

function at(second) {
  return () => new Date(Date.UTC(2026, 7, 28, 0, 0, second));
}

function workerOptions(projectRoot, second) {
  return {
    projectRoot,
    now: at(second),
    environment: { FLOW_BI_RUN_ID: "run-3", FLOW_BI_TASK_NUMBER: "3", FLOW_BI_WORKER_AREA: "backend" },
    usageReader: () => ({ usage: null, usage_status: "USAGE_MISSING" }),
  };
}

function toolInput(event, toolUseId, toolName, toolInput) {
  return {
    hook_event_name: event,
    session_id: "worker-session",
    turn_id: "worker-turn",
    tool_use_id: toolUseId,
    tool_name: toolName,
    tool_input: toolInput,
  };
}

test("classifies test patches, implementation patches, mixed patches, and verification commands", () => {
  assert.equal(classifyToolPhase("apply_patch", {
    patch: "*** Update File: backend/src/test/java/example/Test.java\n",
  }), "test_code");
  assert.equal(classifyToolPhase("apply_patch", {
    patch: "*** Update File: backend/src/main/java/example/Service.java\n",
  }), "implementation");
  assert.equal(classifyToolPhase("apply_patch", {
    patch: "*** Update File: frontend/src/feature.ts\n*** Update File: frontend/src/feature.test.ts\n",
  }), "implementation_and_test");
  assert.equal(classifyToolPhase("exec_command", {
    cmd: "npm run check",
  }), "verification");
  assert.equal(classifyToolPhase("exec_command", {
    cmd: "rg -n phase .codex/hooks",
  }), "analysis");
});

test("records explicit worker phases and per-phase tool execution in raw logs and the tree", async () => {
  const testFixture = fixture();
  try {
    await handleUserPromptSubmit(
      { prompt: "Task 3", session_id: "worker-session", turn_id: "worker-turn" },
      workerOptions(testFixture.projectRoot, 0),
    );

    await handlePreToolUse(
      toolInput("PreToolUse", "marker-test", "exec_command", {
        cmd: "python .agents/scripts/worker_runner/phase_marker.py test_code",
      }),
      workerOptions(testFixture.projectRoot, 10),
    );
    await handlePreToolUse(
      toolInput("PreToolUse", "patch-test", "apply_patch", {
        patch: "*** Update File: backend/src/test/java/example/Test.java\n",
      }),
      workerOptions(testFixture.projectRoot, 12),
    );
    await handlePostToolUse(
      { ...toolInput("PostToolUse", "patch-test", "apply_patch", {}), tool_response: { ok: true } },
      workerOptions(testFixture.projectRoot, 14),
    );

    await handlePreToolUse(
      toolInput("PreToolUse", "marker-code", "exec_command", {
        cmd: "python .agents/scripts/worker_runner/phase_marker.py implementation",
      }),
      workerOptions(testFixture.projectRoot, 20),
    );
    await handlePreToolUse(
      toolInput("PreToolUse", "patch-code", "apply_patch", {
        patch: "*** Update File: backend/src/main/java/example/Service.java\n",
      }),
      workerOptions(testFixture.projectRoot, 22),
    );
    await handlePostToolUse(
      { ...toolInput("PostToolUse", "patch-code", "apply_patch", {}), tool_response: { ok: true } },
      workerOptions(testFixture.projectRoot, 25),
    );

    await handlePreToolUse(
      toolInput("PreToolUse", "marker-verify", "exec_command", {
        cmd: "python .agents/scripts/worker_runner/phase_marker.py verification",
      }),
      workerOptions(testFixture.projectRoot, 40),
    );
    await handlePreToolUse(
      toolInput("PreToolUse", "verify", "exec_command", { cmd: "npm run check" }),
      workerOptions(testFixture.projectRoot, 42),
    );
    await handlePostToolUse(
      { ...toolInput("PostToolUse", "verify", "exec_command", {}), tool_response: { exit_code: 0 } },
      workerOptions(testFixture.projectRoot, 52),
    );

    await recordWorkerEnd(
      { runId: "run-3", exitCode: 0, summary: "done", status: "completed" },
      workerOptions(testFixture.projectRoot, 60),
    );

    const records = readJson(testFixture.paths.logFile, []);
    const tree = readJson(testFixture.paths.treeFile, {});
    const worker = tree.roots[0];
    assert.equal(worker.executor.area, "backend");
    assert.deepEqual(worker.timing, {
      total_duration_ms: 60_000,
      phases: [
        { phase: "analysis", duration_ms: 10_000, tool_calls: 0, tool_duration_ms: 0 },
        { phase: "test_code", duration_ms: 10_000, tool_calls: 1, tool_duration_ms: 2_000 },
        { phase: "implementation", duration_ms: 20_000, tool_calls: 1, tool_duration_ms: 3_000 },
        { phase: "verification", duration_ms: 20_000, tool_calls: 1, tool_duration_ms: 10_000 },
      ],
      unattributed_duration_ms: 0,
      classification: "explicit",
    });
    assert.equal(records.filter((record) => record.record_type === "worker_phase_start").length, 4);
    assert.equal(records.filter((record) => record.record_type === "worker_phase_end").length, 4);
    assert.equal(records.filter((record) => record.record_type === "worker_tool_end").length, 3);
    assert.equal(records.every((record) => record.executor.area === "backend"), true);
  } finally {
    testFixture.dispose();
  }
});

test("falls back to inferred phases and ignores tool events outside a harness worker", async () => {
  const testFixture = fixture();
  try {
    await handleUserPromptSubmit(
      { prompt: "Task 3", session_id: "worker-session", turn_id: "worker-turn" },
      workerOptions(testFixture.projectRoot, 0),
    );
    await handlePreToolUse(
      toolInput("PreToolUse", "patch-test", "apply_patch", {
        patch: "*** Update File: frontend/src/feature.test.ts\n",
      }),
      workerOptions(testFixture.projectRoot, 5),
    );
    await handlePostToolUse(
      { ...toolInput("PostToolUse", "patch-test", "apply_patch", {}), tool_response: {} },
      workerOptions(testFixture.projectRoot, 7),
    );
    await recordWorkerEnd(
      { runId: "run-3", exitCode: 0, summary: "done", status: "completed" },
      workerOptions(testFixture.projectRoot, 10),
    );

    await handlePreToolUse(
      { ...toolInput("PreToolUse", "primary", "exec_command", { cmd: "npm test" }), session_id: "primary" },
      { projectRoot: testFixture.projectRoot, now: at(20), environment: {} },
    );

    const tree = readJson(testFixture.paths.treeFile, {});
    assert.equal(tree.roots[0].timing.classification, "inferred");
    assert.deepEqual(tree.roots[0].timing.phases.map((entry) => [entry.phase, entry.duration_ms]), [
      ["analysis", 5_000],
      ["test_code", 5_000],
    ]);
    assert.equal(readJson(testFixture.paths.logFile, []).some((record) => record.tool_use_id === "primary"), false);
  } finally {
    testFixture.dispose();
  }
});

test("records explicit phases directly without tool hook events", async () => {
  const testFixture = fixture();
  try {
    await handleUserPromptSubmit(
      { prompt: "Task 3", session_id: "worker-session", turn_id: "worker-turn" },
      workerOptions(testFixture.projectRoot, 0),
    );
    await recordWorkerPhase(
      { runId: "run-3", phase: "test_code" },
      workerOptions(testFixture.projectRoot, 10),
    );
    await recordWorkerPhase(
      { runId: "run-3", phase: "implementation" },
      workerOptions(testFixture.projectRoot, 25),
    );
    await recordWorkerPhase(
      { runId: "run-3", phase: "verification" },
      workerOptions(testFixture.projectRoot, 45),
    );
    await recordWorkerEnd(
      { runId: "run-3", exitCode: 0, summary: "done", status: "completed" },
      workerOptions(testFixture.projectRoot, 60),
    );

    const worker = readJson(testFixture.paths.treeFile, {}).roots[0];
    assert.deepEqual(worker.timing.phases, [
      { phase: "analysis", duration_ms: 10_000, tool_calls: 0, tool_duration_ms: 0 },
      { phase: "test_code", duration_ms: 15_000, tool_calls: 0, tool_duration_ms: 0 },
      { phase: "implementation", duration_ms: 20_000, tool_calls: 0, tool_duration_ms: 0 },
      { phase: "verification", duration_ms: 15_000, tool_calls: 0, tool_duration_ms: 0 },
    ]);
    assert.equal(worker.timing.classification, "explicit");
  } finally {
    testFixture.dispose();
  }
});

test("phase marker process persists a worker phase without PreToolUse", async () => {
  const testFixture = fixture();
  try {
    await handleUserPromptSubmit(
      { prompt: "Task 3", session_id: "worker-session", turn_id: "worker-turn" },
      workerOptions(testFixture.projectRoot, 0),
    );

    const marker = join(process.cwd(), ".agents", "scripts", "worker_runner", "phase_marker.py");
    const result = spawnSync(process.env.FLOW_BI_PYTHON_EXECUTABLE || "python", [marker, "test_code"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        FLOW_BI_PROJECT_ROOT: testFixture.projectRoot,
        FLOW_BI_RUN_ID: "run-3",
        FLOW_BI_TASK_NUMBER: "3",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const records = readJson(testFixture.paths.logFile, []);
    assert.equal(records.at(-2).record_type, "worker_phase_end");
    assert.equal(records.at(-1).record_type, "worker_phase_start");
    assert.equal(records.at(-1).phase, "test_code");
    assert.equal(records.at(-1).classification, "explicit");
  } finally {
    testFixture.dispose();
  }
});
