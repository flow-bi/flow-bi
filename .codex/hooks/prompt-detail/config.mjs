import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const LOG_DIRECTORY = ".codex-logs";
export const LOG_FILE = "user-prompt-detail-submit.json";
export const PENDING_FILE = "pending.json";
export const LOCK_DIRECTORY = ".lock";
export const LOCK_TIMEOUT_MS = 10_000;
export const STALE_LOCK_MS = 30_000;

export const SUMMARY_REQUEST =
  "Summarize the completed work in 3-5 concise lines. Include the outcome and verification, and do not start any new work.";

export function storagePaths(projectRoot = PROJECT_ROOT) {
  const logDirectory = join(projectRoot, LOG_DIRECTORY);
  const pendingDirectory = join(logDirectory, ".pending");
  return {
    logDirectory,
    pendingDirectory,
    logFile: join(logDirectory, LOG_FILE),
    pendingFile: join(pendingDirectory, PENDING_FILE),
    lockDirectory: join(pendingDirectory, LOCK_DIRECTORY),
  };
}
