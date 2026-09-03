# 작업 계획: harness-timing-change-cleanup-01

## 1. 기본 정보

### 사용자 요청

Harness phase timing 기능을 위해 변경된 파일들을 다시 검토하여 불필요한 수정과 구현을 제거하고, 필요한 기능과 기존 테스트 검증 범위는 유지하도록 리팩터링한다.

### 작업 목적

두 timing Plan에서 추가한 phase marker 실행, 복수 Worker run 보존, tree 및 Notion Report 표시 기능은 유지하면서 HEAD 대비 변경을 책임별로 최소화한다. 특히 대량 삭제·교체된 Harness 테스트가 기존 상태 복원, 선행 Task 차단, 증거 재사용, 재시도, 판정 교정, invocation parsing 및 prompt 계약의 검증 범위를 잃지 않도록 현재 모듈 구조에 맞게 복원하거나 동등한 기존 테스트와의 대응 근거를 남긴다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`, `.codex/hooks/WORKER_LOG_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Harness timing 변경 최소화 및 회귀 테스트 보존

#### 선행 Task

- `없음`

#### 작업 목적

현재 작업 트리와 HEAD를 비교해 timing 요구사항에 직접 필요한 변경만 남기고 중복·과도한 구현을 정리한다. 기존 테스트를 삭제하거나 단언을 약화하지 않고 현재 Harness 구조에 맞게 이관하여 timing 기능과 기존 실행기 계약을 함께 보호한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`
- `.agents/skills/harness-exec/SKILL.md`
- `.codex/hooks`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `docs/plans/state`

#### 구현 항목

- [ ] HEAD 대비 각 변경을 phase marker import·전환, 실행 목적·시도 순서 전달, 복수 run timing 보존, tree 기록, Report·Notion 표시, 문서 동기화 책임에 대응시키고 어느 책임에도 필요하지 않은 코드·중복 모델·중복 계산·중복 지침만 제거한다.
- [ ] `.agents/skills/harness-exec/tests/test_harness_runner_modules.py`의 HEAD 버전에 존재했던 상태 복원, dependency 차단, 증거 fingerprint·재사용, 재개, 저장 실패, 판정 교정, verifier 결과 수집 한도와 invocation parsing 시나리오를 목록화하고, 현재 모듈 API로 이관하거나 동일 의미를 검증하는 기존 테스트의 파일·테스트명을 확인한 경우에만 중복을 제거한다.
- [ ] `.agents/skills/harness-exec/tests/test_harness_worker_prompt.py`의 기존 template 구조·영역별 verifier 선택·prompt 순서·실행 context·판정 교정 계약을 현재 prompt 조립 구조로 이관하고, 신규 phase marker 계약과 함께 검증되도록 하며 단언을 약화하지 않는다.
- [ ] `.agents/skills/harness-exec/tests/test_worker_runner_environment.py`의 기존 환경 격리·보호값·toolchain·실행 결과·timeout·임시 파일 정리 계약과 신규 `PYTHONPATH`·phase marker subprocess 계약이 현재 모듈 구조에서 모두 실행되게 정리한다.
- [ ] 복수 run timing 모델과 Report 집계는 본 작업·verifier 결과 수집·판정 교정의 모든 정상·실패·timeout 경로를 덮어쓰지 않고 보존하는 데 필요한 최소 구조만 유지하고, legacy 단일 timing 호환성과 phase/tool 시간 비가산 규칙을 보존한다.
- [ ] Node hook은 부모가 인증한 실행 목적·시도 순서를 해당 Run ID의 raw/tree 기록에 보존하는 최소 변경만 유지하고, Worker 입력으로 신뢰 경계를 넓히거나 기존 task·agent log 의미를 변경하는 코드를 남기지 않는다.
- [ ] 리팩터링 전후의 사용자 관찰 동작이 동일하도록 실제 수행 phase만 기록하고 미수행 phase는 `미기록`으로 유지하며, 기존 Notion 단일 Page 게시 정책과 비시간 Report 내용을 변경하지 않는다.
- [ ] 테스트 파일을 통과시키기 위한 대량 삭제, skip, mock 과잉 대체, 단언 제거 또는 검증 항목 축소를 수행하지 않고, 현재 구조에서 더 이상 성립하지 않는 계약은 삭제 대신 변경 이유와 동등한 대체 검증을 작업 결과에 기록한다.

#### TDD 정책

- REGRESSION_ONLY

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`로 기존 실행 상태·증거·재개·차단·교정·결과 수집·invocation 계약과 복수 run timing 보존을 함께 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_worker_prompt.py'`로 기존 prompt 구조·영역별 verifier·context 계약과 phase 전환 지침을 함께 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_environment.py'`로 기존 Worker 환경·격리·정리 계약과 `PYTHONPATH`·phase marker subprocess 계약을 전체 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_timing.py'`와 `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_time_report.py'`로 run별 timing 수집·보존·집계 및 Notion payload 계약을 검증한다.
- [ ] `node --test .codex/hooks/tests/worker-time-logging.test.mjs`로 실행 목적·시도 순서와 phase timing이 Run ID별로 격리되고 기존 log lifecycle이 유지되는지 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`로 변경한 Python 코드와 테스트의 문법을 정적 검증한다.
- [ ] 리팩터링 완료 후 `git diff --stat`과 HEAD 대비 테스트 시나리오 대응표를 확인하여 대량 테스트 삭제가 남지 않고 각 수정 파일이 timing 요구사항 또는 동등 회귀 검증에 연결되는지 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 요구사항 `R1`인 phase marker import·전환과 실제 수행 phase별 timing 기록이 유지되어야 한다.
- 요구사항 `R2`인 동일 Task의 모든 Worker run timing 보존과 tree·Report·Notion 집계가 유지되어야 한다.
- 요구사항 `R3`인 HEAD 기준 기존 Harness 테스트 시나리오가 현재 API로 보존되거나 파일·테스트명으로 확인 가능한 동등 검증에 대응되어야 한다.
- 요구사항 `R4`인 불필요한 코드·중복·과도한 변경 제거와 수정 파일별 책임 추적이 확인되어야 한다.
- Permission·보안, 범위, 요구사항, 현재 회귀 검증, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 테스트 삭제, skip, 단언 약화 또는 검증 우회가 없어야 한다.
- 기존 Harness 실행·재개·차단·증거·verifier·Notion 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- timing 요구사항과 직접 관련 없는 구현 또는 중복 코드가 근거 없이 남음
- 기존 테스트 시나리오가 동등한 검증 없이 삭제되거나 단언·검증 범위가 약화됨
- 기존 Harness 실행 상태, dependency 차단, 증거 재사용, 재시도, 판정 교정, invocation 또는 prompt 계약 회귀
- phase marker, 복수 run timing, tree 또는 Notion Report 기능 회귀
- timing 미기록을 `0ms`로 위장하거나 phase와 tool 시간을 중복 합산함
- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `85` 미만임

#### 제외 범위

- Harness timing과 무관한 제품 Frontend·Backend 구현 또는 저장소 전체 리팩터링
- 기존 완료 Plan과 실행 state 기록의 수정·삭제
- 공개 API, DB 스키마, 인증·권한, Notion OAuth 또는 외부 서비스 설정 변경
- 과거 raw/tree 로그와 Notion Page의 소급 수정

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
- timing 기능에 필요한 최소 변경과 기존 Harness 회귀 검증이 함께 보존되어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 테스트 삭제 또는 검증 약화로 기존 Harness 계약의 회귀 여부를 판단할 수 없음
- timing 기능의 필수 경로가 제거되거나 불필요한 변경이 근거 없이 남음
- 남은 문제가 사용자 확인 없이 방치됨
