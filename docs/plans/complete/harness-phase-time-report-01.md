# 작업 계획: harness-phase-time-report-01

## 1. 기본 정보

### 사용자 요청

Harness 개발 과정에서 Worker가 테스트 코드 작성, 구현, 리팩터링, 테스트와 최종 검증에 사용한 시간을 phase별로 정확히 측정하여 `user-prompt-detail-tree`에 기록하고, 동일한 시간 정보를 Notion Harness Report에서 확인할 수 있도록 수정한다.

### 작업 목적

동일 Task의 본 작업 이후 실행되는 verifier 결과 수집이나 판정 교정 실행이 본 작업의 timing을 덮어쓰고, Worker의 명시적 phase 전환이 누락되면 대부분의 작업 시간이 `analysis` 또는 미귀속 시간으로만 남는 문제를 회귀 테스트로 재현하고 수정한다. Task에 속한 각 Worker 실행의 목적과 phase 시간을 손실 없이 보존하여 테스트 코드 작성, 구현, 리팩터링, 문서화, 검증 중 어느 단계가 병목인지 tree와 Notion Report에서 일관되게 파악할 수 있게 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `.codex/hooks/WORKER_LOG_SCHEMA.md`, `.agents/skills/harness-exec/SKILL.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Worker phase timing 보존 및 Notion Report 통합 수정

#### 선행 Task

- `없음`

#### 작업 목적

Worker가 실제 작업 흐름에 맞춰 phase를 전환하도록 실행 계약을 강화하고, 한 Task에서 발생한 본 작업·verifier 결과 수집·판정 교정 실행의 timing을 실행 목적과 순서대로 모두 보존한다. 보존된 실행별 timing을 `user-prompt-detail-tree`와 공통 Harness Report 모델에서 일관되게 집계하여 콘솔 및 Notion Report에서 Task별 병목을 확인할 수 있게 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`
- `.agents/skills/harness-exec/SKILL.md`
- `.codex/hooks/prompt-detail`
- `.codex/hooks/tests`
- `.codex/hooks/WORKER_LOG_SCHEMA.md`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 동일 Task가 본 작업 후 verifier 결과 수집 또는 판정 교정을 추가 실행할 때 최종 실행의 timing만 남고 앞선 실행의 phase 시간이 Report에서 사라지는 현재 동작을 실패 테스트로 재현하고, 각 실행의 순서·고유 Run ID·실행 목적·성공·실패·timeout·timing 관측 오류가 보존되어야 한다는 계약을 고정한다.
- [ ] Red: 신규·변경 Task의 `REQUIRED` TDD 흐름에서 `analysis`, `test_code`, `implementation` 또는 불가분한 `implementation_and_test`, 선택적 `refactor`·`documentation`, `verification`, `finalization` 전환이 실제 작업 전에 기록되고, `REGRESSION_ONLY`, `REUSE_ALLOWED`, `NOT_APPLICABLE`, verifier 결과 수집, 판정 교정 흐름에서는 수행하지 않는 phase를 허위로 만들지 않는다는 Worker prompt 계약을 실패 테스트로 고정한다.
- [ ] Red: 인증된 부모 수집기에 전달된 실행 목적과 phase 전환 이벤트가 raw log 및 `user-prompt-detail-tree`의 해당 Run ID에만 연결되고, 반복 phase는 누적되며, 열린 phase·tool은 정상·실패·timeout 종료에서 한 번만 닫히고, token·명령·patch·파일 내용은 저장되지 않는다는 Node 통합 테스트를 추가한다.
- [ ] Green: 부모가 신뢰 가능한 실행 목적과 시도 순서를 Worker run context에 부여하고 수집기가 Worker 입력으로 위조되지 않게 검증하여, 본 작업·verifier 결과 수집·판정 교정 run을 raw log와 tree에서 서로 구분할 수 있도록 timing 계약과 스키마를 확장한다.
- [ ] Green: Worker 실행 시작 시 초기 분석 구간을 기록하고, 실행 지침이 각 TDD 및 검증 단계 직전에 기존 loopback phase marker로 전환하도록 명확히 요구하며, marker 실패를 숨기거나 `.codex-logs`에 직접 쓰지 않고 최종 결과의 남은 문제와 관측 상태에 드러내도록 한다.
- [ ] Green: Task 실행기가 최초 실행부터 모든 verifier 결과 수집 및 판정 교정 실행까지 유효 timing과 관측 오류를 순서대로 누적하고, 후속 실행이나 실패 경로가 앞선 본 작업 timing을 덮어쓰지 않도록 결과 모델과 전달 경계를 수정한다.
- [ ] Green: Harness Report의 실행 시간 요약, Task별 소요 시간, 전체 phase 분석, Task 상세를 모든 보존 실행 기준으로 집계하고, Task 합계와 실행 목적별 Run ID·전체·미귀속·canonical phase 시간·tool 통계를 표시하여 동일 본문을 콘솔과 기존 단일 Notion 게시 payload에 전달한다.
- [ ] timing이 없는 실행과 관측되지 않은 phase는 `0ms`가 아닌 `미기록`으로, 실제 전체 시간이 `0ms`이면 비율은 `분석 불가`로 표시하며, timing 관측 오류는 해당 실행의 업무 성공·실패·timeout 판정과 분리한다.
- [ ] `phase.duration_ms`와 `tool_duration_ms`는 중복 가능한 별도 관측값으로 유지하여 서로 더하거나 Worker 또는 Task 전체 시간에 가산하지 않고, Task·전체 phase 합계에는 유효한 현재 실행들의 phase 경과 시간만 한 번씩 포함한다.
- [ ] Refactor: 실행 목적, 시도 순서, timing 누적과 Report 계산 책임을 명확한 모델 및 함수로 정리하고 중복 집계 로직을 제거한 뒤 관련 회귀 테스트를 다시 통과시킨다.
- [ ] `.codex/hooks/WORKER_LOG_SCHEMA.md`와 `.agents/skills/harness-exec/SKILL.md`에 실행 목적, 복수 실행 timing 보존, phase 전환 및 Notion 표시 계약을 실제 구현과 일치하도록 갱신한다.

#### TDD 정책

- REQUIRED

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_timing.py'`로 초기 phase, 실행 목적 인증·전달, 정상·실패·timeout 종료, 민감정보 비기록 및 복수 실행 timing 보존 경계를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_worker_prompt.py'`로 TDD 정책과 본 작업·결과 수집·판정 교정 흐름별 phase marker 지침이 정확히 렌더링되는지 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`와 관련 Task 실행기 테스트로 최초 실행, verifier 결과 수집, 판정 교정, 실패 및 timeout의 timing이 덮어써지지 않고 모두 Task 결과에 연결되는지 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_time_report.py'`로 Task별 복수 실행 합계, 실행 목적·Run ID 상세, canonical phase 합계, 미기록·0ms·관측 오류 경계와 기존 단일 Notion 게시 payload 전달을 검증한다.
- [ ] `node --test .codex/hooks/tests/worker-time-logging.test.mjs`로 raw log와 `user-prompt-detail-tree`의 실행 목적 격리, phase duration 누적, 종료 경계 및 민감정보 비기록을 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 변경한 Python 모듈의 문법과 import 가능성을 정적 검증한다.
- [ ] 관련 Python 및 Node 회귀 테스트 fixture에서 같은 Run ID별 tree timing과 Report 입력을 대조하고, 콘솔용 공통 본문에 표시된 복수 실행 및 phase별 시간이 Notion 게시 payload에도 변경 없이 한 번 포함되는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 요구사항 `R1`인 테스트 코드 작성·구현·리팩터링·문서화·검증 phase별 경과 시간 기록이 Worker의 실제 수행 흐름과 일치해야 한다.
- 요구사항 `R2`인 동일 Task의 본 작업·verifier 결과 수집·판정 교정 timing 보존과 실행 목적 구분이 raw log, `user-prompt-detail-tree`, Harness 결과 모델에 일관되게 적용되어야 한다.
- 요구사항 `R3`인 Task별·전체 phase 시간 및 실행별 상세가 공통 Report 본문과 기존 단일 Notion 게시 payload에서 동일하게 확인되어야 한다.
- 요구사항 `R4`인 timing 미기록·관측 오류·0ms·실패·timeout 구분과 phase/tool 시간 비가산 규칙이 유지되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 Worker 업무 판정, verifier single-flight, Notion 단일 Page 게시 정책에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 본 작업 timing이 후속 verifier 결과 수집 또는 판정 교정 timing으로 덮어써짐
- Worker가 수행한 테스트 코드 작성, 구현 또는 검증 phase가 tree나 Report에서 누락되거나 다른 phase로 합산됨
- 동일 Task의 독립 Run ID가 병합되거나 다른 Task·과거 실행 timing이 현재 Report에 연결됨
- timing 미기록을 `0ms`로 위장하거나 phase duration과 tool duration을 중복 합산함
- timing 수집 또는 marker 실패가 Worker의 실제 업무 성공·실패·timeout 결과를 변경하거나 숨김
- token, event URL, 명령, patch, 파일 내용 등 민감하거나 불필요한 payload가 raw log 또는 tree에 저장됨
- 기존 verifier single-flight 또는 Notion 단일 Page 게시 정책이 변경됨
- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `85` 미만임

#### 제외 범위

- 기존 raw/tree 로그와 과거 Notion Page의 소급 수정 또는 마이그레이션
- 개별 명령 내용, patch, 파일 내용 또는 tool 입출력 본문의 저장과 분석
- Notion MCP 인증, 상위 Page, 게시 횟수 또는 외부 서비스 설정 변경
- 제품 Frontend·Backend 코드, 공개 API, DB 스키마, 인증·권한 정책 변경
- phase별 목표 시간이나 성능 합격 기준의 신규 정의

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
- Worker의 실제 phase timing이 run별로 `user-prompt-detail-tree`에 보존되고 같은 계산 결과가 콘솔 및 Notion Report에 표시되어야 한다.
- 관련 로그 스키마와 Harness 실행 문서가 실제 구현과 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 본 작업과 후속 실행의 timing이 손실·오분류·중복 집계되어 Worker 병목을 판단할 수 없음
- `user-prompt-detail-tree`와 Notion Report가 서로 다른 run 또는 phase 시간을 표시함
- 남은 문제가 사용자 확인 없이 방치됨
