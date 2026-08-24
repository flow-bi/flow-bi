import * as defaultFileSystem from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

import { LOCK_TIMEOUT_MS, STALE_LOCK_MS, storagePaths } from "./config.mjs";
import { buildPromptDetailTree } from "./tree.mjs";

function sleep(milliseconds) { return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)); }
function errorCode(error, fallback) { return typeof error?.code === "string" ? error.code : fallback; }

function reportStorageDiagnostic(options, stage, store, code) {
  const context = options.diagnosticContext ?? {};
  const diagnostic = { stage, store, event: context.event ?? null, session_id: context.session_id ?? null, turn_id: context.turn_id ?? null, run_id: context.run_id ?? null, task_number: context.task_number ?? null, error_code: code };
  if (options.onDiagnostic) options.onDiagnostic(diagnostic);
  else console.error(JSON.stringify({ prompt_detail_storage: diagnostic }));
}

function recoveryFile(file) { return `${file}.corrupt.${Date.now()}.${randomUUID()}.json`; }
function preserveDamagedJson(file, bytes, options, store) {
  try { options.fileSystem.writeFileSync(recoveryFile(file), bytes); }
  catch (error) { reportStorageDiagnostic(options, `write_${store}`, store, errorCode(error, "RECOVERY_WRITE_FAILED")); throw error; }
}

function loadJsonStore(file, fallback, validator, store, options) {
  let bytes;
  try { bytes = options.fileSystem.readFileSync(file); }
  catch (error) {
    if (error?.code === "ENOENT") return fallback;
    reportStorageDiagnostic(options, "read", store, errorCode(error, "READ_FAILED"));
    throw error;
  }
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); }
  catch (error) {
    reportStorageDiagnostic(options, "read", store, "INVALID_JSON");
    preserveDamagedJson(file, bytes, options, store);
    return fallback;
  }
  if (!validator(value)) {
    reportStorageDiagnostic(options, "validate", store, "INVALID_ROOT");
    preserveDamagedJson(file, bytes, options, store);
    return fallback;
  }
  return value;
}

export function readJson(file, fallback) {
  try { return JSON.parse(defaultFileSystem.readFileSync(file, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return fallback; throw error; }
}

export function atomicWriteJson(file, value, { fileSystem = defaultFileSystem } = {}) {
  fileSystem.mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  fileSystem.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try { fileSystem.renameSync(temporary, file); }
  catch (error) {
    try { fileSystem.unlinkSync(temporary); } catch { /* Best-effort temporary cleanup only. */ }
    throw error;
  }
}

export async function withStorage(projectRoot, mutate, suppliedOptions = {}) {
  const options = { fileSystem: defaultFileSystem, nowMs: Date.now, sleepFn: sleep, onDiagnostic: null, diagnosticContext: null, ...suppliedOptions };
  const storage = storagePaths(projectRoot);
  options.fileSystem.mkdirSync(storage.pendingDirectory, { recursive: true });
  const deadline = options.nowMs() + LOCK_TIMEOUT_MS;
  while (true) {
    try { options.fileSystem.mkdirSync(storage.lockDirectory); break; }
    catch (error) {
      if (error?.code !== "EEXIST") { reportStorageDiagnostic(options, "lock", null, errorCode(error, "LOCK_CREATE_FAILED")); throw error; }
      try {
        if (options.nowMs() - options.fileSystem.statSync(storage.lockDirectory).mtimeMs > STALE_LOCK_MS) {
          options.fileSystem.rmdirSync(storage.lockDirectory);
          reportStorageDiagnostic(options, "lock", null, "STALE_LOCK_REMOVED");
          continue;
        }
      } catch (statError) {
        if (statError?.code !== "ENOENT") { reportStorageDiagnostic(options, "lock", null, errorCode(statError, "LOCK_STAT_FAILED")); throw statError; }
      }
      if (options.nowMs() >= deadline) {
        const timeout = new Error("Timed out waiting for the prompt log lock");
        reportStorageDiagnostic(options, "lock", null, "LOCK_TIMEOUT");
        throw timeout;
      }
      await options.sleepFn(10);
    }
  }
  try {
    const records = loadJsonStore(storage.logFile, [], Array.isArray, "records", options);
    const pending = loadJsonStore(storage.pendingFile, [], Array.isArray, "pending", options);
    loadJsonStore(storage.treeFile, { schema_version: 1, roots: [], unresolved: [] }, (value) => value && typeof value === "object" && !Array.isArray(value), "tree", options);
    const result = await mutate({ records, pending });
    records.sort((left, right) => left.occurred_at.localeCompare(right.occurred_at));
    try { atomicWriteJson(storage.logFile, records, options); }
    catch (error) { reportStorageDiagnostic(options, "write_records", "records", errorCode(error, "WRITE_FAILED")); throw error; }
    try { atomicWriteJson(storage.pendingFile, pending, options); }
    catch (error) { reportStorageDiagnostic(options, "write_pending", "pending", errorCode(error, "WRITE_FAILED")); throw error; }
    try { atomicWriteJson(storage.treeFile, buildPromptDetailTree(records), options); }
    catch (error) { reportStorageDiagnostic(options, "tree_build", "tree", errorCode(error, "TREE_WRITE_FAILED")); throw error; }
    return result;
  } finally {
    try { options.fileSystem.rmdirSync(storage.lockDirectory); }
    catch (error) { if (error?.code !== "ENOENT") reportStorageDiagnostic(options, "lock", null, errorCode(error, "LOCK_RELEASE_FAILED")); }
  }
}
