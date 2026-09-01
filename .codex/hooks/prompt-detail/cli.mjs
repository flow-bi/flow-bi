import { readFileSync } from "node:fs";

import { handleSubagentStart, handleSubagentStop } from "./subagent-events.mjs";
import { handleStop, handleUserPromptSubmit, recordWorkerEnd, recordWorkerEvent } from "./task-events.mjs";

const OUTPUT_EVENTS = new Set(["Stop", "SubagentStart", "SubagentStop"]);

export async function readStdinJson(stdin = process.stdin) {
  let rawInput = "";
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) rawInput += chunk;
  return JSON.parse(rawInput);
}

export async function routeEvent(input, handlers = {}) {
  const implementations = {
    handleUserPromptSubmit,
    handleStop,
    handleSubagentStart,
    handleSubagentStop,
    ...handlers,
  };

  switch (input.hook_event_name) {
    case "UserPromptSubmit":
      await implementations.handleUserPromptSubmit(input);
      return {};
    case "Stop":
      return implementations.handleStop(input);
    case "SubagentStart": {
      const result = await implementations.handleSubagentStart(input);
      return { hookSpecificOutput: result.hookSpecificOutput };
    }
    case "SubagentStop":
      return implementations.handleSubagentStop(input);
    default:
      return {};
  }
}

export async function runCli({
  argv = process.argv,
  stdin = process.stdin,
  stdout = process.stdout,
  readFile = readFileSync,
  workerEnd = recordWorkerEnd,
  workerEvent = recordWorkerEvent,
  handlers,
} = {}) {
  let eventName = null;
  try {
    if (argv[2] === "--worker-end") {
      const runId = argv[3];
      const exitCode = Number.parseInt(argv[4], 10);
      const summaryFile = argv[5];
      const status = argv[6];
      let summary = "";
      try {
        summary = readFile(summaryFile, "utf8");
      } catch {
        // Missing output is represented by the fallback summary.
      }
      await workerEnd({ runId, exitCode, summary, status });
      stdout.write(JSON.stringify({ ok: true }));
      return;
    }
    if (argv[2] === "--worker-event") {
      const event = await readStdinJson(stdin);
      const result = await workerEvent(event);
      stdout.write(JSON.stringify({ ok: true, result }));
      return;
    }

    const input = await readStdinJson(stdin);
    eventName = input.hook_event_name;
    const output = await routeEvent(input, handlers);
    if (OUTPUT_EVENTS.has(eventName)) stdout.write(JSON.stringify(output));
  } catch {
    // Logging must never block the Codex lifecycle or change worker results.
    if (argv[2] === "--worker-event" || argv[2] === "--worker-end") stdout.write(JSON.stringify({ ok: false, error: "worker_event_rejected" }));
    else if (OUTPUT_EVENTS.has(eventName)) stdout.write("{}");
  }
}
