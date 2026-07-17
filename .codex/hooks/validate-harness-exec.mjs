import { statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INVOCATION = /^\s*\$harness-exec(?=\s|$)(?:\s+([^\s]+))?/;
const PLAN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{2}$/;

function block(reason) {
  return { decision: "block", reason };
}

export function validatePrompt(input, projectRoot = PROJECT_ROOT) {
  if (typeof input?.prompt !== "string") return null;
  const invocation = INVOCATION.exec(input.prompt);
  if (!invocation) return null;
  const planId = invocation[1];
  if (!planId) {
    return block("$harness-exec 뒤에 plan ID를 입력하세요 (예: dashboard-01).");
  }
  const activeRoot = resolve(projectRoot, "docs", "plan", "active");
  const planPath = resolve(activeRoot, `${planId}.md`);
  const escapedPath = relative(activeRoot, planPath);
  if (escapedPath.startsWith("..") || isAbsolute(escapedPath)) {
    return block("harness plan 경로는 docs/plan/active 밖을 가리킬 수 없습니다.");
  }
  if (!PLAN_ID.test(planId)) {
    return block(
      "plan ID는 소문자 kebab-case와 두 자리 번호 형식이어야 합니다 (예: dashboard-01).",
    );
  }
  try {
    if (!statSync(planPath).isFile()) throw new Error("not a file");
  } catch {
    return block(`active plan이 없습니다: docs/plan/active/${planId}.md`);
  }
  return null;
}

async function main() {
  let rawInput = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) rawInput += chunk;
  const result = validatePrompt(JSON.parse(rawInput));
  if (result) process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    process.stdout.write(
      `${JSON.stringify(block("harness-exec 호출 검증 중 오류가 발생했습니다."))}\n`,
    );
  }
}
