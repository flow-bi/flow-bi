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
import { usageSnapshot } from "../prompt-detail/usage.mjs";

function totalUsage(input, output, total) {
  return {
    token_count: {
      info: { total_token_usage: {
        input_tokens: input,
        cached_input_tokens: 0,
        cache_creation_input_tokens: 0,
        output_tokens: output,
        reasoning_output_tokens: 0,
        total_tokens: total,
      } },
    },
  };
}

test("projects task executor, terminal status, direct usage, and cleanup into a stable tree", async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "prompt-detail-integration-"));
  try {
    const snapshots = new Map([
      ["parent", [totalUsage(10, 5, 15), totalUsage(16, 9, 25)]],
      ["task-five", [totalUsage(20, 3, 23), totalUsage(24, 7, 31)]],
      ["task-three", [totalUsage(30, 4, 34), totalUsage(35, 6, 41)]],
      ["task-five-retry", [null, null]],
    ]);
    const usageReader = (sessionId) => usageSnapshot(snapshots.get(sessionId).shift());
    let tick = 0;
    const options = (environment = {}) => ({
      projectRoot,
      environment,
      usageReader,
      now: () => new Date(Date.UTC(2026, 7, 24, 0, 0, tick++)),
    });

    await handleUserPromptSubmit(
      { prompt: "parent", session_id: "parent", turn_id: "parent-turn" },
      options(),
    );
    await handleUserPromptSubmit(
      { prompt: "Task 5", session_id: "task-five", turn_id: "five-turn" },
      options({ FLOW_BI_PARENT_SESSION_ID: "parent", FLOW_BI_RUN_ID: "run-5a", FLOW_BI_TASK_NUMBER: "5" }),
    );
    await handleUserPromptSubmit(
      { prompt: "Task 3", session_id: "task-three", turn_id: "three-turn" },
      options({ FLOW_BI_PARENT_SESSION_ID: "parent", FLOW_BI_RUN_ID: "run-3", FLOW_BI_TASK_NUMBER: "3" }),
    );
    await handleUserPromptSubmit(
      { prompt: "Task 5 retry", session_id: "task-five-retry", turn_id: "five-retry-turn" },
      options({ FLOW_BI_PARENT_SESSION_ID: "parent", FLOW_BI_RUN_ID: "run-5b", FLOW_BI_TASK_NUMBER: "5" }),
    );
    await recordWorkerEnd({ runId: "run-5a", exitCode: 0, summary: "done", status: "completed" }, options());
    await recordWorkerEnd({ runId: "run-3", exitCode: 1, summary: "failed", status: "failed" }, options());
    await recordWorkerEnd({ runId: "run-5b", exitCode: null, summary: "timed out", status: "timeout" }, options());
    await handleStop({ session_id: "parent", turn_id: "parent-turn" }, options());

    const paths = storagePaths(projectRoot);
    const records = readJson(paths.logFile, []);
    const tree = readJson(paths.treeFile, {});
    const root = tree.roots[0];
    const terminalRecords = records.filter((record) => record.record_type === "task_end");

    assert.deepEqual(readJson(paths.pendingFile, []), []);
    assert.deepEqual(tree.unresolved, []);
    assert.deepEqual(root.executor, { kind: "primary", task_number: null, agent_type: null });
    assert.equal(root.run_id, null);
    assert.equal(root.result.status, "completed");
    assert.deepEqual(root.usage, { input_tokens: 6, output_tokens: 4, total_tokens: 10, cached_input_tokens: 0, cache_creation_input_tokens: 0, reasoning_output_tokens: 0 });
    assert.equal(root.usage_status, "AVAILABLE");
    assert.deepEqual(
      root.children.map((node) => [node.executor.task_number, node.run_id, node.result.status, node.usage, node.usage_status]),
      [
        [3, "run-3", "failed", { input_tokens: 5, output_tokens: 2, total_tokens: 7, cached_input_tokens: 0, cache_creation_input_tokens: 0, reasoning_output_tokens: 0 }, "AVAILABLE"],
        [5, "run-5a", "completed", { input_tokens: 4, output_tokens: 4, total_tokens: 8, cached_input_tokens: 0, cache_creation_input_tokens: 0, reasoning_output_tokens: 0 }, "AVAILABLE"],
        [5, "run-5b", "timeout", null, "BASELINE_USAGE_MISSING"],
      ],
    );
    for (const node of [root, ...root.children]) {
      const terminal = terminalRecords.find((record) => record.context.node_id === node.id);
      assert.deepEqual(node.executor, terminal.executor);
      assert.equal(node.run_id, terminal.run_id);
      assert.deepEqual(node.usage, terminal.usage);
      assert.equal(node.usage_status, terminal.usage_status);
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
