---
name: harness-exec
description: Validate and execute an active repository plan.
---

# harness-exec

## Task 재개 상태

Harness는 `docs/plans/state/<feature>.json`에 기능별 상태를 한 개의 JSON 루트 객체로 보관한다. Plan ID는 `<feature>-NN` 형식이며, `NN`은 최상위 키, 각 Plan의 `taskN` 객체는 Task 상태가 된다. 허용 상태는 `pending`, `running`, `succeeded`, `failed`, `blocked`이고 `failed`·`blocked`에만 비어 있지 않은 `reason`을 둔다.

재실행에서는 스키마가 유효한 현재 Plan의 `succeeded` Task만 Worker를 호출하지 않고 완료 상태로 복원한다. `pending`, `running`, `failed`, `blocked`는 다시 실행하며 상태 파일 오류는 성공으로 취급하거나 덮어쓰지 않는다. 이 파일에는 Mandatory Gate, TDD, 검증, 품질점수 또는 실행 증거를 저장하지 않으며, 기존 `.execution-records`와 분리된다.

지정된 active plan을 하네스 실행 스크립트에 전달하여 검증하고 실행한 후 실행 결과로 report를 작성해 알린다.

## DO NOT

- Task 구현을 직접 수행하거나 Plan 범위를 확장하지않는다.
- plan 형식, plan 경로, Task 속성, 지원 여부와 같은 검증은 실행스크립트가 담당한다. Skill에서 동일한 검증을 별도로 수행하거나 우회하지 않는다.
- 하위 worker 실행이 실패해도 메인 세션이 해당 작업을 대신 구현하지 않는다.

## 실행

다음 명령을 실행하되 `<USER_REQUEST>`에는 현재 사용자의 요청 원문을 넣는다.

```bash
python .agents/skills/harness-exec/scripts/harness_exec.py '<USER_REQUEST>'
```

위 명령을 실행하는 shell 도구의 `timeout_ms`는 반드시 1시간 30분(`5400000`)으로
설정한다. 더 짧은 값을 임의로 지정하거나 기본 timeout에 맡기지 않는다.

오류 또는 실패를 숨기지 말고 사용자에게 보고한다.
각 Task의 작업이 끝나면 오류가 났거나 수행하지 못했을 경우를 기록하고 그 이유를 정리해 알린다.

## Notion Report

- 각 Worker는 최종 JSON에 `work_summary`, `verification`, `remaining_issues`,
  `quality_score`, `final_status`를 기록한다.
- 부모 Harness는 Worker 결과를 Task 번호순으로 취합하고 실패·차단 사유, 전체 결과,
  완료 작업, 실패·차단 작업, 주요 문제와 다음 작업을 포함한 최종 피드백을 생성한다.
- `FLOW_BI_NOTION_PARENT`에는 개발자별 Notion 상위 Page 식별자를 설정한다.
- Notion MCP OAuth는 각 개발자의 로컬 Codex 환경에 설정되어 있어야 한다.
- 성공·실패 실행 모두 부모 Harness가 완성된 Report 전체를 실행당 하나의 새 Notion Page로 한 번 게시한다. Worker는 Notion에 게시하지 않는다.
- 부모 전용 `FLOW_BI_NOTION_PARENT` 값은 Worker 자식 프로세스 환경에서 제거한다.
- 환경변수 누락, OAuth 또는 Notion MCP 게시 실패는 숨기지 않고 실행 실패로 보고하며
  Active Plan을 완료 위치로 이동하지 않는다.

## 결과 보고

모든 작업이 끝나기를 기다린 후 다음을 간결하게 보고한다.

- 실행한 plan
- 실행해야했던 task와 실행한 task의 결과
- 성공·실패·차단된 Task
- 실행된 검증과 결과
- 실행하지 못한 검증과 이유
- 남은 위험 또는 기술 부채
- 추가 확인이 필요한 사항
