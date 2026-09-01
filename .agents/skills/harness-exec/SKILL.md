---
name: harness-exec
description: Validate and execute an active repository plan.
---

# harness-exec

## Task 재개 상태

Harness는 Task 재개 상태를 `docs/plans/state/`에 저장하며, 유효한 succeeded 상태만 복원한다.
상태 파일의 검증과 갱신은 실행 스크립트가 담당한다.

## DO NOT

- Task 구현을 직접 수행하지 않는다.
- Plan 범위를 확장하지않는다.
- plan 형식, plan 경로, Task 속성, 지원 여부와 같은 검증은 실행스크립트가 담당한다. Skill에서 동일한 검증을 별도로 수행하거나 우회하지 않는다.
- 하위 worker 실행이 실패해도 메인 세션이 해당 작업을 대신 구현하지 않는다.

## 실행

다음 명령을 실행하되 `<USER_REQUEST>`에는 현재 사용자의 요청 원문을 넣는다.

```bash
python .agents/skills/harness-exec/scripts/harness_exec.py '<USER_REQUEST>'
```

이미 PASS한 선행 Task를 재실행하지 않고 특정 Task부터 이어서 실행할 때는`$harness-exec <plan-id> --from-task <번호> [추가 요청]`을 전달한다.

위 명령을 실행하는 shell 도구의 `timeout_ms`는 반드시 1시간 30분(`5400000`)으로 설정한다. 더 짧은 값을 임의로 지정하거나 기본 timeout에 맡기지 않는다.

장기 실행이 shell session ID를 반환하더라도 30초마다 polling 결과를 모델 턴으로
되돌리지 않는다. 도구가 내부 오케스트레이션을 지원하면 하나의 도구 호출 안에서 최대
60초 간격으로 session 종료를 확인하고, 완료되거나 사용자에게 알려야 할 상태 변화가 있을
때만 결과를 간단하게 모델에 반환한다. 내부 오케스트레이션을 지원하지 않으면 허용되는 범위에서 가장 긴 60초 이하의 빈 poll을 사용한다.

Worker의 `stdout`과 `stderr` 진행 출력은 Worker별 임시 로그로 격리한다. 정상 종료에서는
진행 로그를 부모 화면에 출력하지 않으며, 비정상 종료·timeout·최종 JSON 파싱 실패에서만
마지막 16 KiB 이하의 로그 tail을 진단 근거로 사용한다. 최종 응답은 기존 `codex exec -o`
파일에서 읽고, 최종 응답 파일과 진행 로그 파일은 성공·실패·timeout 모두 즉시 정리한다.
Worker의 `TEMP`, `TMP`, `TMPDIR`는 저장소 수정 경로와 분리된 실행별 시스템 temp를 사용하고,
그 절대 경로에만 sandbox 쓰기 권한을 부여한 뒤 부모 Harness가 모든 종료 경로에서 정리한다.

Worker는 최초 탐색에서 변경 대상과 필요한 파일 구간을 확정하고, 관련 변경을 가능한 한
큰 단위의 patch로 적용한다. patch가 실패한 경우에만 해당 구간을 다시 읽고, 전체 diff는
작업 종료 전 한 번만 확인한다. 긴 테스트 로그는 실패 원인 주변의 제한된 구간만 조회한다.

Backend와 Frontend verifier 명령이 실행 중이거나 shell session을 반환한 경우 같은 CLI를 새 shell
명령으로 시작하거나 중복 호출하지 않는다. 기존 실행을 wait/poll해 최종 종료 코드와 출력을 확인한다.
동일 요청은 부모 verifier의 single-flight 실행에 합류하며, 확정 종료 후 실패 원인을
수정했거나 명시적인 재검증이 필요할 때만 다시 실행한다. HTTP 429 같은 실행 중 충돌
응답만으로 검증 실패나 최종 판정을 확정하지 않고, 최종 JSON에는 완료된 최신 실제 결과만 반영한다.
Harness는 session 또는 진행 중 증거를 가진 미해결 `NOT_RUN`만 기존 요청의 결과 수집 continuation으로
처리하며, 완료된 검증을 재실행하거나 제품 코드를 수정하지 않는다. 총 3회 안에 최종 `PASS` 또는 `FAIL`과
비어 있지 않은 증거를 수집해야 하며, 한도를 넘기면 원인을 포함해 실패한다. 완료된 `FAIL`, 진행 중이 아닌
`NOT_RUN`, 증거가 없는 `PASS`는 continuation이나 성공으로 바꾸지 않는다.

오류 또는 실패를 숨기지 말고 사용자에게 보고한다.
각 Task의 작업이 끝나면 오류가 났거나 수행하지 못했을 경우를 기록하고 그 이유를 정리해 알린다.

## Notion Report

- 각 Worker는 최종 JSON에 `work_summary`, `verification`, `remaining_issues`, `quality_score`, `final_status`를 기록한다.
- 부모 Harness는 Worker 결과를 Task 번호순으로 취합하고 실패·차단 사유, 전체 결과, 완료 작업, 실패·차단 작업, 주요 문제와 다음 작업을 포함한 최종 피드백을 생성한다.
- `FLOW_BI_NOTION_PARENT`에는 개발자별 Notion 상위 Page 식별자를 설정한다.
- Notion MCP OAuth는 각 개발자의 로컬 Codex 환경에 설정되어 있어야 한다.
- 성공·실패 실행 모두 부모 Harness가 완성된 Report 전체를 실행당 하나의 새 Notion Page로 한 번 게시한다. Worker는 Notion에 게시하지 않는다.
- 환경변수 누락, OAuth 또는 Notion MCP 게시 실패는 숨기지 않고 실행 실패로 보고하지만 게시 실패이외의 작업이 모두 완료된 경우 plan을 complete로 옮긴다.

## 결과 보고

모든 작업이 끝나기를 기다린 후 다음을 간결하게 보고한다.

- 실행한 plan
- 실행해야했던 task와 실행한 task의 결과
- 성공·실패·차단된 Task
- 실행된 검증과 결과
- 실행하지 못한 검증과 이유
- 남은 위험 또는 기술 부채
- 추가 확인이 필요한 사항
- 하네스 구조에 문제가 있거나 반복되는 문제라고 판단될 경우 수정 방향
