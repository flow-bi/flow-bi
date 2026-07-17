import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG_DIRECTORY = ".codex-logs";
const LOG_FILE = "user-prompt-submit.jsonl";

export function recordPrompt(input, projectRoot = PROJECT_ROOT) {
  if (typeof input?.prompt !== "string") return;

  const logDirectory = join(projectRoot, LOG_DIRECTORY);
  mkdirSync(logDirectory, { recursive: true });
  appendFileSync(join(logDirectory, LOG_FILE), `${JSON.stringify(input.prompt)}\n`, "utf8");
}

async function main() {
  try {
    let rawInput = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) rawInput += chunk;
    recordPrompt(JSON.parse(rawInput));
  } catch {
    // Logging must never block prompt submission.
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
