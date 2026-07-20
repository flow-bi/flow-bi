import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

import {
  LOCK_TIMEOUT_MS,
  STALE_LOCK_MS,
  storagePaths,
} from "./config.mjs";

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw new Error(`Refusing to overwrite invalid JSON at ${file}`, { cause: error });
  }
}

export function atomicWriteJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    renameSync(temporary, file);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

export async function withStorage(projectRoot, mutate) {
  const storage = storagePaths(projectRoot);
  mkdirSync(storage.pendingDirectory, { recursive: true });
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      mkdirSync(storage.lockDirectory);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(storage.lockDirectory).mtimeMs > STALE_LOCK_MS) {
          rmdirSync(storage.lockDirectory);
          continue;
        }
      } catch (statError) {
        if (statError?.code !== "ENOENT") throw statError;
      }
      if (Date.now() >= deadline) throw new Error("Timed out waiting for the prompt log lock");
      await sleep(10);
    }
  }

  try {
    const records = readJson(storage.logFile, []);
    const pending = readJson(storage.pendingFile, []);
    if (!Array.isArray(records) || !Array.isArray(pending)) {
      throw new Error("Prompt log and pending state must be JSON arrays");
    }
    const result = await mutate({ records, pending });
    records.sort((left, right) => left.occurred_at.localeCompare(right.occurred_at));
    atomicWriteJson(storage.logFile, records);
    atomicWriteJson(storage.pendingFile, pending);
    return result;
  } finally {
    try {
      rmdirSync(storage.lockDirectory);
    } catch {
      // Logging must not leave a failed hook blocked on cleanup.
    }
  }
}
