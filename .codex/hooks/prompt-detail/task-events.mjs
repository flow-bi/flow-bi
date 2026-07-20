import { PROJECT_ROOT, SUMMARY_REQUEST } from "./config.mjs";
import {
  commonRecord,
  isSyntheticPrompt,
  pendingForSession,
  resolveWorker,
} from "./records.mjs";
import { withStorage } from "./storage.mjs";

/*
UserPromptSubmit 훅

사용자가 Codex에 프롬프트를 제출할 때 호출

1. 현재 작업을 담당하는 worker 확인
2. 부모 작업 존재시 부모,자식 관계를 연결
3. task_start 기록을 recoreds에 추가
4. 끝나지 않은 작업이면 pending에 추가
*/

export async function handleUserPromptSubmit(
  input,
  {
    projectRoot = PROJECT_ROOT,
    environment = process.env,
    now = () => new Date(),
  } = {},
) {
  if (typeof input?.prompt !== "string" || isSyntheticPrompt(input))
    return null;

  // 작업을 수행하는 worker의 종류를 확인
  const worker = resolveWorker(environment);

  // 작업을 실행한 부모 세션의 ID 가져오기
  const parentSessionId = environment.FLOW_BI_PARENT_SESSION_ID || null;
  // 작업 발생 시각 저장
  const occurredAt = now().toISOString();

  return withStorage(projectRoot, ({ records, pending }) => {
    const parent = parentSessionId
      ? pendingForSession(pending, parentSessionId)
      : null;
    const hierarchyResolved = parentSessionId ? Boolean(parent) : true;
    const state = {
      // pending 항목의 종류
      kind: "task",

      // 현재 대화 턴의 ID
      turn_id: input.turn_id,
      session_id: input.session_id,
      node_id: `turn:${input.turn_id}`,
      parent_id: parent?.node_id ?? null,
      depth: parent ? parent.depth + 1 : 0,

      parent_session_id: parentSessionId,

      hierarchy_resolved: hierarchyResolved,
      worker,

      run_id: environment.FLOW_BI_RUN_ID || null,
      summary_requested: false,
    };
    records.push({
      record_type: "task_start",
      ...commonRecord(state, occurredAt),
      prompt: input.prompt,
      cwd: input.cwd,
      model: input.model,
      permission_mode: input.permission_mode,
    });
    pending.push(state);
    return state;
  });
}

export async function handleStop(
  input,
  { projectRoot = PROJECT_ROOT, now = () => new Date() } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    const index = pending.findIndex(
      (item) =>
        item.kind === "task" &&
        item.session_id === input.session_id &&
        item.turn_id === input.turn_id,
    );
    if (index < 0 || pending[index].worker !== "primary") return {};

    const state = pending[index];

    // if (!state.summary_requested && input.stop_hook_active !== true) {
    //   state.summary_requested = true;
    //   return { decision: "block", reason: SUMMARY_REQUEST };
    // }

    records.push({
      record_type: "task_end",
      ...commonRecord(state, now().toISOString()),
      status: "completed",
      exit_code: 0,
      summary:
        input.last_assistant_message || "Task가 최종 요약 없이 종료되었습니다.",
    });
    pending.splice(index, 1);
    return {};
  });
}

/*
Worker 프로세스 종료 기록 함수

primary가 아닌 별도 worker 프로세스가 종료됐을 때 호출된다.

역할:
1. run_id에 해당하는 실행 중 작업을 찾는다.
2. 종료 코드에 따라 성공 또는 실패를 기록한다.
3. task_end 이벤트를 records에 추가한다.
4. 종료된 작업을 pending에서 제거한다.
 */

export async function recordWorkerEnd(
  { runId, exitCode, summary },
  { projectRoot = PROJECT_ROOT, now = () => new Date() } = {},
) {
  return withStorage(projectRoot, ({ records, pending }) => {
    // 전달받은 runId와 같은 pending 작업을 찾음
    const index = pending.findIndex(
      (item) => item.kind === "task" && item.run_id === runId,
    );

    if (index < 0) return false;
    const state = pending[index];

    records.push({
      record_type: "task_end",
      ...commonRecord(state, now().toISOString()),

      status: {
        type: exitCode === 0 ? "completed" : "failed",
        exit_code: exitCode,
      },
      summary:
        summary?.trim() ||
        (exitCode === 0
          ? "최종 응답을 기록하지 못했지만 Worker 작업이 정상적으로 완료되었습니다."
          : `최종 응답을 기록하지 못했으며 Worker 작업이 종료 코드 ${exitCode}(으)로 실패했습니다.`),
    });
    pending.splice(index, 1);
    return true;
  });
}
