import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
export const LOG_DIRECTORY = ".codex-logs";
export const LOG_FILE = "user-prompt-detail-submit.json";
export const TREE_FILE = "user-prompt-detail-tree.json";
export const PENDING_FILE = "pending.json";
export const TREE_VERSION = 1;

export const LOCK_DIRECTORY = ".lock";
export const LOCK_TIMEOUT_MS = 10_000;
export const STALE_LOCK_MS = 30_000;

export const SUMMARY_REQUEST =
  "완료한 작업을 3~5줄로 간결하게 요약하세요. 작업 결과와 검증 내용을 포함하고, 새로운 작업은 시작하지 마세요.";

/*
프로젝트 루트를 기준으로 저장에 필요한 전체 경로를 생성
실제 실행에서는 기본 PROJECT_ROOT를 사용!
*/
export function storagePaths(projectRoot = PROJECT_ROOT) {
  const logDirectory = join(projectRoot, LOG_DIRECTORY);
  const pendingDirectory = join(logDirectory, ".pending");
  return {
    logDirectory,
    pendingDirectory,
    logFile: join(logDirectory, LOG_FILE),
    treeFile: join(logDirectory, TREE_FILE),
    pendingFile: join(pendingDirectory, PENDING_FILE),
    lockDirectory: join(pendingDirectory, LOCK_DIRECTORY),
  };
}
