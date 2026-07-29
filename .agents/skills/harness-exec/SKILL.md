---
name: harness-exec
description: Validate and execute an active repository plan.
---

# harness-exec

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

위 명령을 실행하는 shell 도구의 `timeout_ms`는 반드시 30분(`1800000`)으로
설정한다. 더 짧은 값을 임의로 지정하거나 기본 timeout에 맡기지 않는다.

오류 또는 실패를 숨기지 말고 사용자에게 보고한다.
각 Task의 작업이 끝나면 오류가 났거나 수행하지 못했을 경우를 기록하고 그 이유를 정리해 알린다.

## 결과 보고

모든 작업이 끝나기를 기다린 후 다음을 간결하게 보고한다.

- 실행한 plan
- 실행해야했던 task와 실행한 task의 결과
- 성공·실패·차단된 Task
- 실행된 검증과 결과
- 실행하지 못한 검증과 이유
- 남은 위험 또는 기술 부채
- 추가 확인이 필요한 사항
