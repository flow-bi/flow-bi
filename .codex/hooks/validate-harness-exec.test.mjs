import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { validatePrompt } from "./validate-harness-exec.mjs";

function projectWithActivePlan() {
  const projectRoot = mkdtempSync(join(tmpdir(), "harness-hook-"));
  const activeRoot = join(projectRoot, "docs", "plan", "active");
  mkdirSync(activeRoot, { recursive: true });
  writeFileSync(join(activeRoot, "dashboard-01.md"), "plan", "utf8");
  return projectRoot;
}

test("passes a normal prompt", () => {
  assert.equal(validatePrompt({ prompt: "대시보드를 구현해 주세요." }, projectWithActivePlan()), null);
});

test("passes a valid explicit invocation", () => {
  assert.equal(validatePrompt({ prompt: "$harness-exec dashboard-01 추가 요청" }, projectWithActivePlan()), null);
});

for (const [name, prompt] of [
  ["missing ID", "$harness-exec"],
  ["invalid ID", "$harness-exec Dashboard-1"],
  ["path traversal", "$harness-exec ../../outside-01"],
  ["missing active file", "$harness-exec absent-01"],
]) {
  test(`blocks ${name}`, () => {
    const result = validatePrompt({ prompt }, projectWithActivePlan());
    assert.equal(result?.decision, "block");
    assert.equal(typeof result?.reason, "string");
  });
}
