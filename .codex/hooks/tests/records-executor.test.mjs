import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveExecutor } from "../prompt-detail/records.mjs";
import { handleSubagentStart } from "../prompt-detail/subagent-events.mjs";
import { handleUserPromptSubmit } from "../prompt-detail/task-events.mjs";
import { storagePaths } from "../prompt-detail/config.mjs";
import { readJson } from "../prompt-detail/storage.mjs";

test("normalizes primary and Task environments into executor records", () => {
  assert.deepEqual(resolveExecutor({}), {
    kind: "primary",
    task_number: null,
  });
  assert.deepEqual(resolveExecutor({ FLOW_BI_TASK_NUMBER: "1" }), {
    kind: "task",
    task_number: 1,
  });
  assert.deepEqual(resolveExecutor({ FLOW_BI_TASK_NUMBER: "2" }), {
    kind: "task",
    task_number: 2,
  });
});

test("rejects missing or invalid task numbers for worker runs without primary fallback", () => {
  for (const environment of [
    { FLOW_BI_RUN_ID: "run-1" },
    { FLOW_BI_RUN_ID: "run-1", FLOW_BI_TASK_NUMBER: "0" },
    { FLOW_BI_RUN_ID: "run-1", FLOW_BI_TASK_NUMBER: "one" },
  ]) {
    assert.throws(
      () => resolveExecutor(environment),
      (error) => error?.code === "INVALID_TASK_EXECUTOR",
    );
  }
});

test("keeps same task number runs separate and inherits the task executor for agents", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "records-executor-"));
  try {
    const now = () => new Date("2026-08-24T00:00:00.000Z");
    await handleUserPromptSubmit(
      { prompt: "Task 1", turn_id: "turn-1", session_id: "session-1" },
      {
        projectRoot,
        now,
        environment: { FLOW_BI_RUN_ID: "run-a", FLOW_BI_TASK_NUMBER: "1" },
      },
    );
    await handleUserPromptSubmit(
      { prompt: "Task 1 retry", turn_id: "turn-2", session_id: "session-2" },
      {
        projectRoot,
        now,
        environment: { FLOW_BI_RUN_ID: "run-b", FLOW_BI_TASK_NUMBER: "1" },
      },
    );
    await handleSubagentStart(
      { agent_id: "agent-1", agent_type: "general", session_id: "session-1", turn_id: "turn-1" },
      { projectRoot, now },
    );

    const records = readJson(storagePaths(projectRoot).logFile, []);
    const starts = records.filter((record) => ["task_start", "agent_start"].includes(record.record_type));
    assert.deepEqual(
      starts.map((record) => [record.run_id, record.executor]),
      [
        ["run-a", { kind: "task", task_number: 1, agent_type: null }],
        ["run-b", { kind: "task", task_number: 1, agent_type: null }],
        ["run-a", { kind: "task", task_number: 1, agent_type: "general" }],
      ],
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("normalizes legacy records without executor fields in the tree", async () => {
  const { buildPromptDetailTree } = await import("../prompt-detail/tree.mjs");
  const tree = buildPromptDetailTree([
    {
      record_type: "task_start",
      tree_version: 1,
      occurred_at: "2026-08-24T00:00:00.000Z",
      context: { node_id: "turn:legacy", session_id: "legacy" },
      hierarchy: { parent_id: null, resolved: true },
    },
  ]);
  assert.deepEqual(tree.roots[0].executor, {
    kind: "primary",
    task_number: null,
    agent_type: null,
  });
});
