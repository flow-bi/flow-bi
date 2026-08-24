# 작업 계획: harness-log-01

## 1. 기본 정보

### 사용자 요청

Harness 로그의 기존 역할명 기반 Worker 식별을 Task 번호 기반으로 교체하고, Task 번호가 Codex 자식 실행 환경과 records에 정확히 전달되도록 한다. 실행 중 상태는 pending에 한 번만 등록하고 정상·실패·timeout 등 종료 처리가 기록되면 해당 항목을 안전하게 삭제하며, 관련 로깅 코드를 책임별로 정리하고 부모와 각 Task의 입력·출력 토큰을 기록한다.

### 작업 목적

현재 모든 자식 실행이 부모 실행처럼 기록되는 원인을 제거하고, `TaskInvocation.task.number`를 Harness 호출부부터 Hook records까지 보존한다. `run_id`는 실행 고유 식별자로 유지하고 Task 번호는 실행자 정보로 사용한다. 시작·종료 기록과 pending 삭제를 멱등 처리하여 중복·고아 상태를 방지하고, 각 부모 및 Task 실행의 직접 토큰 사용량을 event와 tree에서 일관되게 확인할 수 있게 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Task 번호를 Codex 자식 환경까지 전달

#### 선행 Task

- `없음`

#### 작업 목적

Harness가 이미 보유한 Task 번호를 Worker 호출 경계와 Codex subprocess 환경까지 타입 손실 없이 전달하고, 실행 고유 `run_id` 및 부모 session 정보와 함께 사용할 수 있게 한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.codex/hooks`
- `frontend`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red 단계에서 `TaskInvocation.task.number`가 `invoke_task`, `execute_worker`, `build_subprocess_environment`를 거쳐 자식 환경에 전달되지 않는 현재 동작을 실패 테스트로 재현한다.
- [ ] `worker_gateway.invoke_task`가 Task 번호를 명시적 인자로 전달하고, Worker runner의 공개 함수와 타입 별칭이 해당 값을 받도록 경계를 확장한다.
- [ ] 자식 환경에 양의 정수 문자열 `FLOW_BI_TASK_NUMBER`를 설정하고 `FLOW_BI_RUN_ID`, `FLOW_BI_PARENT_SESSION_ID`와 역할을 분리한다.
- [ ] Task 번호가 누락되거나 bool·0·음수·숫자가 아닌 값이면 subprocess를 시작하기 전에 명시적으로 실패시키고 잘못된 환경을 생성하지 않는다.
- [ ] 부모 전용 환경과 비밀정보 제거 정책은 유지하되, 기존 역할명 기반 환경 키를 지우기만 하던 코드는 Task 번호 주입 책임으로 교체한다.
- [ ] Green 이후 Task 번호 검증과 환경 조립을 한 곳으로 정리하고 Red·Green·Refactor 결과를 실행 기록에 남긴다.
- [ ] 구현 실패 시 최대 3회 수정·재검증하고 이후에도 실패하면 우회하지 않고 전달이 끊긴 함수 경계를 기록한다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p test_worker_runner.py`로 유효 Task 번호가 subprocess 환경에 문자열로 전달되는지 확인한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p test_browser_verifier.py`로 Harness gateway가 실제 invocation의 Task 번호를 Worker runner에 전달하는지 확인한다.
- [ ] 누락·0·음수·비정수 Task 번호에서 subprocess runner가 호출되지 않는지 확인한다.
- [ ] `run_id`, 부모 session, verifier 환경과 Task 번호가 서로 덮어쓰지 않아 기존 실행 경계와 충돌하지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 모든 Harness Task 자식 환경에 올바른 Task 번호가 있어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Task 번호가 유실·변조되거나 잘못된 값으로 subprocess가 시작됨
- 기존 verifier 또는 부모 session 환경 계약이 깨짐
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Hook records 스키마 변경
- pending 등록 및 삭제
- Task 번호를 이용한 실행 순서 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. records 실행자 정보를 Task 번호 기반으로 교체

#### 선행 Task

- `Task 1`

#### 작업 목적

Hook이 고정된 역할명으로 실행자를 판별하는 구조를 제거하고, 부모는 `primary`, Harness 자식은 양의 정수 Task 번호로 구분하여 raw records에 기록한다.

#### 수정 가능 경로

- `.codex/hooks`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec`
- `frontend`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red 단계에서 Task 번호 환경이 있어도 현재 records가 자식 실행을 부모로 기록하는 문제와 잘못된 번호가 조용히 부모로 대체되는 문제를 재현한다.
- [ ] 기존 역할명 확인 함수를 `FLOW_BI_TASK_NUMBER` 파서로 교체하고, 실행자를 `executor.kind = primary | task`, `executor.task_number = null | 양의 정수` 구조로 정규화한다.
- [ ] `FLOW_BI_RUN_ID`가 있는 자식 실행에는 유효한 Task 번호를 필수로 요구하고, 번호 누락·형식 오류는 별도 로깅 오류로 분류하여 부모로 위장하지 않게 한다.
- [ ] `commonRecord`, task start/end, agent start/end가 동일한 executor 구조를 사용하고 agent는 연결된 부모 Task 번호를 상속한다.
- [ ] records에 `run_id`를 함께 기록하여 동일 Task의 재실행을 구분하되, Task 번호만을 event 고유키로 사용하지 않는다.
- [ ] 기존 usage·executor 필드가 없는 raw log도 tree 생성 중 예외를 내지 않고 `task_number: null`로 읽는 하위 호환 경계를 둔다.
- [ ] Green 이후 실행자 파싱·검증·직렬화 책임을 records 모듈로 모으고 더 이상 사용하지 않는 역할명 export와 분기 코드를 제거한다.
- [ ] 구현 실패 시 최대 3회 수정·재검증하고 이후에도 실패하면 실행자 오분류 조건을 기록한다.

#### 검증 항목

- [ ] `node --test .codex/hooks/tests/records-executor.test.mjs`로 부모, Task 1, Task 2, 잘못된 번호 fixture의 executor 결과를 확인한다.
- [ ] Task 1 환경 계약과 충돌 없이 환경 문자열이 records의 정수 `task_number`로 변환되는지 확인한다.
- [ ] 같은 Task 번호의 서로 다른 `run_id`가 별도 실행으로 유지되고, agent가 부모의 Task 번호를 상속하는지 확인한다.
- [ ] 기존 records fixture가 예외 없이 `task_number: null`로 정규화되는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 새 자식 records가 Task 번호와 run ID로 식별되어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 자식 실행이 부모로 기록되거나 Task 번호만으로 재실행이 합쳐짐
- 잘못된 Task 번호가 조용히 허용됨
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 기존 raw records의 일괄 재작성
- Task 번호를 이용한 비용 합산
- Harness 실행 스케줄 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. pending 등록과 terminal 삭제를 멱등 처리

#### 선행 Task

- `Task 2`

#### 작업 목적

부모와 각 Task 실행을 pending에 정확히 한 번 등록하고, 대응하는 terminal event가 안전하게 저장된 뒤 성공·실패·timeout·JSON 파싱 실패 모두에서 해당 pending만 삭제한다.

#### 수정 가능 경로

- `.codex/hooks`
- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `frontend`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red 단계에서 시작 Hook 재호출, 같은 Task 번호 재실행, 부모 Stop과 자식 Stop 경합, Worker 종료 재호출, terminal 저장 후 pending 저장 실패를 재현한다.
- [ ] 부모 pending key는 `session_id + turn_id`, Task pending key는 `run_id + session_id + turn_id`로 정의하고 Task 번호는 검색·표시 메타데이터로만 사용한다.
- [ ] 동일 key의 시작은 기존 pending을 재사용하여 `task_start`와 pending을 한 번만 생성하며, 같은 Task 번호의 다른 run은 별도 pending으로 유지한다.
- [ ] 부모 Stop은 primary pending만 종료하고, Task 자식의 일반 Stop은 pending을 선행 삭제하지 않는다. Task 자식은 Python runner가 실제 결과를 판정한 뒤 호출하는 Worker 종료 경로에서만 terminal 처리한다.
- [ ] terminal event를 먼저 멱등 저장한 다음 일치하는 pending을 삭제한다. pending 저장이 실패한 재시도에서는 기존 terminal event를 중복 생성하지 않고 남은 pending 삭제만 마무리한다.
- [ ] 성공, 비정상 종료, timeout, 실행 예외, 종료 코드 0의 JSON 파싱 실패에 대해 Worker logger를 정확히 한 번 호출하고 실제 Harness 상태를 terminal event에 전달한다.
- [ ] terminal event와 pending 삭제가 모두 끝난 뒤에만 최종 응답·진행 로그 임시 파일을 정리하며 기존 16 KiB 실패 tail 계약을 유지한다.
- [ ] 시작 없는 종료는 다른 pending을 삭제하지 않고 `start_not_found`, terminal은 있으나 pending이 남은 경우는 `cleanup_retry`로 구분한다.
- [ ] Green 이후 pending key, terminal upsert, cleanup과 Worker finalization을 책임별 함수로 정리하고 TDD 기록을 남긴다.
- [ ] 구현 실패 시 최대 3회 수정·재검증하고 이후에도 실패하면 고아 pending과 상태 불일치 위험을 기록한다.

#### 검증 항목

- [ ] `node --test .codex/hooks/tests/pending-lifecycle.test.mjs`로 시작 멱등성, 부모·Task 종료 분리, terminal 저장 후 pending 삭제를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p test_worker_runner.py`로 모든 Worker 종료 분기의 logger 호출과 실제 상태 전달을 검증한다.
- [ ] Task 2 executor 계약과 충돌 없이 Task 번호가 같은 동시·재실행 pending이 서로의 항목을 삭제하지 않는지 확인한다.
- [ ] terminal 저장 뒤 pending 저장 실패를 재시도했을 때 terminal은 하나이고 대상 pending은 최종적으로 삭제되는지 확인한다.
- [ ] 정상 완료된 부모·Task·agent fixture에서 pending이 비며, 진행 중 fixture의 pending만 남는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- terminal 처리된 모든 실행의 pending이 삭제되어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- terminal 실행의 pending이 남거나 진행 중인 다른 pending이 삭제됨
- terminal event가 중복되거나 실제 Worker 상태와 다름
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 기존 pending 파일의 일괄 삭제
- 장시간 실행 중 Task를 임의 timeout 처리하는 정책
- Harness state 파일의 Task 상태 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 로그 저장 오류 진단과 복구 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

records·pending·tree JSON 손상과 lock·write 실패를 숨기지 않고 원본을 보존하며, pending terminal 처리의 재시도 가능성을 유지한다.

#### 수정 가능 경로

- `.codex/hooks`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec`
- `frontend`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red 단계에서 잘못된 JSON, 배열이 아닌 루트, stale lock, lock timeout, atomic rename 실패를 fixture로 재현한다.
- [ ] 오류를 `read`, `validate`, `lock`, `write_records`, `write_pending`, `tree_build`로 분류하고 event·session·turn·run·Task 번호·오류 코드만 제한적으로 진단한다.
- [ ] 손상 JSON은 삭제하지 않고 복구 파일로 원본 bytes를 보존한 뒤 해당 저장소만 유효한 빈 구조로 재생성하여 다음 이벤트부터 기록을 재개한다.
- [ ] records 저장 성공 후 pending 저장 실패는 Task 3의 `cleanup_retry`로 복구할 수 있게 마지막 정상 records와 남은 pending을 보존한다.
- [ ] 오류 진단은 prompt, 환경변수, 세션 원문과 비밀정보를 포함하지 않고 부모·Task의 실제 결과와 Hook stdout 프로토콜을 변경하지 않는다.
- [ ] Green 이후 lock·원자적 저장·복구·진단 책임을 분리하고 TDD 기록을 남긴다.
- [ ] 구현 실패 시 최대 3회 수정·재검증하고 이후에도 실패하면 데이터 보존 상태와 복구 불가 원인을 기록한다.

#### 검증 항목

- [ ] `node --test .codex/hooks/tests/storage-recovery.test.mjs`로 실패 단계별 진단과 원본 보존을 확인한다.
- [ ] 손상 원본 bytes가 보존되고 새 JSON에 다음 정상 이벤트가 기록되는지 확인한다.
- [ ] Task 3 terminal·pending 계약과 충돌 없이 부분 저장 실패 재시도가 중복 terminal 없이 cleanup을 완료하는지 확인한다.
- [ ] 진단에 민감 원문이 없고 Hook 응답 및 실행 결과가 유지되는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 손상 원본을 보존하면서 후속 기록과 pending cleanup을 재개할 수 있어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 손상 원본을 삭제하거나 부분 저장 실패가 중복 terminal을 생성함
- 로그 오류가 실행 결과를 변경하거나 민감정보를 노출함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 보존된 손상 로그의 자동 병합
- 외부 로그 서비스와 원격 알림
- 과거 records 및 pending의 자동 정리

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. 부모와 Task별 토큰 사용량 기록

#### 선행 Task

- `Task 4`

#### 작업 목적

정확한 session과 Task 번호를 기준으로 시작·종료 누적 토큰의 차이를 계산하여 부모와 각 Task의 직접 입력·출력 토큰을 records에 기록한다.

#### 수정 가능 경로

- `.codex/hooks`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec`
- `frontend`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red 단계에서 부모와 여러 Task의 `token_count.info.total_token_usage`, 여러 session, 누락·부분·음수 delta fixture를 작성한다.
- [ ] 정확한 `session_id` rollout의 마지막 유효 누적 입력·캐시 입력·캐시 쓰기·출력·추론 출력·전체 토큰을 정규화한다.
- [ ] pending 등록 시 baseline을 저장하고 terminal 처리 시 항목별 delta를 계산하여 `input_tokens`, `output_tokens`, `total_tokens`와 선택적 상세값을 기록한다.
- [ ] executor의 Task 번호와 run ID를 usage에 연결하고, 부모 값에 자식 Task usage를 합산하거나 같은 Task 번호의 다른 run을 합치지 않는다.
- [ ] 누락·손상·음수 delta는 0으로 위장하지 않고 `usage: null` 및 구체적인 `usage_status`로 기록하며 terminal 상태와 pending cleanup은 유지한다.
- [ ] Task 4 진단을 사용해 세션 파일 읽기 실패를 비차단 처리하고 Green 이후 탐색·정규화·delta 로직을 분리해 TDD 기록을 남긴다.
- [ ] 구현 실패 시 최대 3회 수정·재검증하고 이후에도 실패하면 미수집 사유와 영향을 기록한다.

#### 검증 항목

- [ ] `node --test .codex/hooks/tests/token-usage.test.mjs`로 부모와 Task 번호별 직접 usage delta를 확인한다.
- [ ] cached·reasoning 상세값이 입력·출력·전체 토큰에 이중 가산되지 않는지 확인한다.
- [ ] Task 번호가 같아도 run과 session이 다른 실행의 토큰이 섞이지 않는지 확인한다.
- [ ] Task 4 진단 및 Task 3 pending cleanup과 충돌 없이 usage 실패 상태가 기록되는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 부모와 각 Task의 직접 입력·출력·전체 토큰을 구분할 수 있어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 다른 session·run의 토큰을 사용하거나 누락을 0으로 위장함
- 상세 토큰을 이중 가산하거나 부모에 자식 Task 사용량을 합산함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 토큰 비용과 예산 계산
- 토큰 한도에 따른 Worker 중단
- session rollout 원문 저장

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 6. 최종 통합 검증 및 로깅 모듈 정리

#### 선행 Task

- `Task 5`

#### 작업 목적

Task 번호 기반 executor, pending 생명주기, terminal 상태, usage를 tree에 통합하고 기존 역할명 기반 코드와 중복 책임을 제거하여 로깅 구조를 완성한다.

#### 수정 가능 경로

- `.codex/hooks`
- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `frontend`
- `backend`
- `docs`
- `docs/plans/state`

#### 구현 항목

- [ ] Red 단계에서 부모 하나, Task 번호가 다른 자식 둘, 같은 Task 재실행 하나, 실패·timeout·usage 누락을 포함한 통합 fixture를 작성한다.
- [ ] tree node에 `executor.kind`, `task_number`, `run_id`, terminal 상태, `usage`, `usage_status`를 records와 동일하게 투영한다.
- [ ] 부모 node에는 부모 session 직접 usage만, 각 Task node에는 자신의 run 직접 usage만 표시하며 Task 번호 순서와 부모·자식 연결을 안정적으로 유지한다.
- [ ] 과거 executor·usage 필드가 없는 records는 예외 없이 읽되 새 records 생성 경로에서는 역할명 기반 필드와 환경 키를 더 이상 사용하지 않는다.
- [ ] 기존 역할명 판별 함수·export·상수·환경 정리 코드와 중복 pending 검색, terminal 직렬화, usage projection 로직을 제거하고 모듈 책임을 환경 전달·record 정규화·저장·tree projection으로 정리한다.
- [ ] 정상·실패·timeout·JSON 파싱 실패가 terminal event와 tree에 동일하게 나타나고 완료된 모든 실행의 pending이 비는 통합 helper를 구현한다.
- [ ] Task 5 usage와 Task 3 terminal 계약이 충돌하지 않도록 경계를 고정하고 Green 이후 관련 코드 정리의 Refactor 결과를 남긴다.
- [ ] 구현 실패 시 최대 3회 수정·재검증하고 이후에도 실패하면 불일치 records, tree 또는 pending을 기록한다.

#### 검증 항목

- [ ] `node --test .codex/hooks/tests/prompt-detail-integration.test.mjs`로 Task 번호별 tree, 상태, usage와 pending 정리를 확인한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*worker*.py'`로 Task 번호 환경 전달과 Worker terminal 연계를 확인한다.
- [ ] Task 5 records와 tree의 executor·usage가 동일하고 Task 3 terminal 완료 뒤 pending이 비어 선행 Task 결과와 충돌하지 않는지 확인한다.
- [ ] 새 런타임 코드에 기존 역할명 판별 분기와 해당 환경 키 참조가 남지 않았는지 정적 검색으로 확인한다.
- [ ] 기존 로그 fixture가 예외 없이 tree로 변환되고 해결 불가 parent만 `unresolved`에 남는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 새 records와 tree가 Task 번호 기반 실행자와 직접 usage를 일관되게 표시해야 한다.
- terminal 처리된 pending이 모두 삭제되고 런타임에 기존 역할명 분기가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- records와 tree의 Task 번호·run·상태·usage가 불일치함
- terminal pending이 남거나 진행 중인 다른 pending이 삭제됨
- 기존 역할명 기반 런타임 분기 또는 중복 책임 코드가 남음
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 기존 records와 pending 파일의 일괄 삭제 또는 역사 재작성
- Harness Report와 Notion Report 표시 형식 변경
- 토큰 비용 대시보드와 외부 모니터링

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- Harness Task 번호가 invocation부터 Codex 자식 환경, pending, records와 tree까지 동일해야 한다.
- 부모와 Task 실행이 구분되고 같은 Task 번호의 재실행은 run ID로 분리되어야 한다.
- terminal 처리된 부모·Task·agent의 pending은 삭제되고 진행 중 pending만 남아야 한다.
- 부모와 각 Task의 직접 `input_tokens`, `output_tokens`, `total_tokens`가 event와 tree에서 일치해야 한다.
- 로그 오류가 진단되며 부분 저장 실패를 재시도해도 terminal 중복과 고아 pending이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- Task 번호가 전달 과정에서 유실되거나 자식 실행이 부모로 기록됨
- terminal pending이 남거나 다른 실행의 pending이 삭제됨
- records와 tree의 Task 번호·run·상태·usage가 불일치함
- 제공 가능한 토큰이 누락되거나 다른 session·run 값으로 기록됨
- 남은 문제가 사용자 확인 없이 방치됨
