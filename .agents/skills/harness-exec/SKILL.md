---
name: harness-exec
description: Validate and execute an active repository plan only when explicitly invoked as `$harness-exec dashboard-01 [additional request]`. Use it to run plan tasks through the configured backend and frontend workers in dependency order.
---

# Harness Exec

명시적 호출에서 active plan을 검증하고 task를 worker별로 실행한다. 암시적으로 실행하지 않는다.
결과

## DO NOT

- 실행 후에 `docs/plan/active/<feature>-<NN>.md` 내부의 완료조건을 모두 완수했을 경우 `docs/plan/complete/` 아래로 작업한 파일을 옮기는 거 외 파일 수정을 하지않는다.

## 실행

다음 명령을 실행하되 `<USER_REQUEST>`에는 현재 사용자의 요청 원문을 넣는다.

```bash
python .agents/skills/harness-exec/scripts/harness_exec.py "<USER_REQUEST>"
```

runner의 오류 또는 worker 실패를 숨기지 말고 사용자에게 보고한다.
기본적으로 BE task 묶음이 있으면 먼저 실행하고, FE task 묶음을 실행한다.
하지만 명시적인 순서를 지정해줬을 경우에는 그를 따른다.
각 Worker들의 모든 작업이 끝나면 오류가 났거나 수행하지 못했을 경우를 기록하고 그 이유를 정리해 알린다.

## 호출 및 plan 규칙

- 호출 형식은 `$harness-exec <feature>-<NN> [추가 요청]`이다.
- ID의 `feature`는 소문자 kebab-case이고 `NN`은 `00`부터 `99`까지의 두 자리 숫자다.
- `.md`를 붙이지 않는다.
- 대상은 정확히 `docs/plan/active/<feature>-<NN>.md`다.
- 실행 후에 `docs/plan/active/<feature>-<NN>.md` 내부의 완료조건을 모두 완수했을 경우 `docs/plan/complete/` 아래로 작업한 파일을 옮긴다.

task는 다음 임시 형식을 사용한다.

```md
## Task: <고유 task ID>

- worker: fe-worker
- 작업 유형: <자유 형식 설명>
- 관련 설계 문서: 없음

작업 내용과 완료 조건
```

세 속성은 필수다. worker는 `be-worker` 또는 `fe-worker`만 허용한다. 관련 설계 문서는 `없음` 또는 쉼표로 구분한 저장소 상대 파일 경로다.

<!-- TODO: 회의 후 task 문서 형식이 확정되면 runner 파서와 이 예시를 함께 갱신한다. -->
