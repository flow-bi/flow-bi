import { pathToFileURL } from "node:url";

import { runCli } from "./prompt-detail/cli.mjs";

export { SUMMARY_REQUEST } from "./prompt-detail/config.mjs";
export {
  ExecutorValidationError,
  isSyntheticPrompt,
  resolveExecutor,
} from "./prompt-detail/records.mjs";
export {
  handleStop,
  handleUserPromptSubmit,
  recordWorkerEnd,
} from "./prompt-detail/task-events.mjs";
export {
  handleSubagentStart,
  handleSubagentStop,
} from "./prompt-detail/subagent-events.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
