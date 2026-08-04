# 작업 계획: harness-tdd-rerun-01

## 1. 기본 정보

### 사용자 요청

동일한 구현을 Harness로 재실행할 때 새로운 Red 실패를 인위적으로 요구하지 않고, 구현 리비전별 TDD 증거를 보존·재사용하며 최소 품질점수를 실제 판정에 반영한다. 과거 증거가 없는 기존 구현은 성공으로 위장하지 않고 사람 검토가 필요한 상태로 판정한다.

### 작업 목적

Harness가 완료된 Task를 반복 실행하면서 TDD 증거를 잃어 정상 구현을 실패 처리하는 문제를 해결한다. Task 결과와 구현 리비전의 연관성을 검증 가능한 형태로 보존하고, 변경되지 않은 리비전은 기존 TDD 증거와 현재 회귀 검증을 함께 사용하며, 변경된 리비전에는 새로운 TDD 증거를 요구한다. 또한 Active Plan에서 파싱한 최소 `quality_score`가 실제 완료 판정에서 누락되는 문제를 수정한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `docs/quality/quality-model.md`, `AGENTS.md`

---

## 2. 실행 Task

### Task 1. 리비전 기반 Task 실행 기록과 완료 판정 구현

#### 선행 Task

- `없음`

#### 작업 목적

Task의 TDD 단계와 최종 결과를 구현 리비전에 연결해 보존하고, 동일 리비전 재실행에서는 검증된 과거 증거를 재사용하며, 최소 품질점수를 포함한 모든 완료 조건을 실행기가 강제하도록 한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `frontend`
- `backend`
- `docs`
- `.agents/scripts/worker_runner`

#### 구현 항목

- [ ] Task 번호, Plan 식별자, 요구사항·Task 정의·허용 경로의 구현 및 테스트 상태로부터 재현 가능한 리비전 fingerprint를 계산한다.
- [ ] 성공한 Task의 Mandatory Gate, TDD 증거, 검증 결과, 품질점수와 fingerprint를 원자적으로 보존하고 손상되거나 불완전한 기록을 성공 증거로 사용하지 않는다.
- [ ] 동일 fingerprint의 성공 기록이 있으면 과거 TDD 증거를 참조하되 현재 필수 회귀 검증 결과가 없는 상태로 Task를 성공 처리하지 않는다.
- [ ] fingerprint가 변경되면 과거 TDD 증거를 재사용하지 않고 신규 구현 실행으로 처리한다.
- [ ] 과거 TDD 증거가 없는 기존 구현은 인위적인 Red 생성이나 자동 PASS 대신 `HUMAN_REVIEW_REQUIRED`에 해당하는 실패 이유를 반환한다.
- [ ] Plan에서 파싱한 `minimum_quality_score`와 Worker의 정수 `quality_score`를 비교해 기준 미달, 누락 또는 잘못된 형식을 완료 실패로 처리한다.
- [ ] 실행 기록 저장 실패가 제품 코드 변경이나 성공 결과 유실을 숨기지 않도록 명시적인 실패로 보고한다.
- [ ] Red → Green → Refactor 순서로 실행기 단위 테스트를 작성하고 구현 및 리팩터링 결과를 기록한다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_harness_runner_modules.py`로 동일 fingerprint 증거 재사용, 변경 fingerprint 거부, 손상 기록 거부와 의존 Task 상태 전파를 검증한다.
- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_harness_exec.py`로 실행 기록의 생성·재사용과 기존 Harness CLI 회귀를 검증한다.
- [ ] 최소 품질점수 미달·누락·비정수 결과가 실패하고 기준 이상 결과만 통과하는 단위 테스트를 검증한다.
- [ ] 임시 디렉터리를 사용한 테스트로 실행 기록이 원자적으로 저장되고 저장소의 실제 Active Plan 결과를 오염시키지 않는지 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 동일하지 않은 fingerprint에 과거 TDD 증거를 재사용함
- 과거 증거 또는 현재 회귀 검증 없이 Task를 성공 처리함
- 최소 품질점수 미달을 성공 처리함
- 실행 기록 손상 또는 저장 실패를 숨김
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- `quality_score`가 90 미만

#### 제외 범위

- 기존 제품 기능 또는 제품 테스트 수정
- 과거 실행 증거의 임의 생성이나 복원
- 사람 승인 없이 TDD 예외를 부여하거나 기존 Task를 PASS로 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Worker 재실행 판정 계약 및 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

Worker가 신규 구현, 동일 리비전 재검증, 증거 없는 기존 구현을 구분하고 실행기가 제공한 증거만 사용해 일관된 TDD 판정을 반환하도록 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `frontend`
- `backend`
- `docs`
- `.agents/skills/harness-exec/scripts/harness_runner`

#### 구현 항목

- [ ] Worker invocation에 실행 모드, 현재 fingerprint와 검증된 선행 TDD 증거 참조를 구조화해 전달한다.
- [ ] 신규 또는 변경 리비전은 Red → Green → Refactor를 수행하고 동일 리비전 재검증은 과거 TDD 증거와 현재 Green·회귀 검증을 함께 기록하도록 안내한다.
- [ ] 검증된 과거 증거가 없는 기존 구현은 Red를 인위적으로 만들거나 TDD `PASS`로 보고하지 않고 사람 검토가 필요한 판정을 반환하도록 안내한다.
- [ ] Worker 최종 JSON 계약이 재사용한 증거의 식별자와 현재 검증 근거를 구분해 표현하고 기존 필수 Gate 의미를 유지하도록 한다.
- [ ] 경로 계약, Backend verifier와 Browser verifier 호출 규칙을 변경하지 않는다.
- [ ] Red → Green → Refactor 순서로 Worker invocation 단위 테스트를 작성하고 구현 및 리팩터링 결과를 기록한다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_worker_runner.py`로 신규 구현, 동일 리비전 재검증과 증거 없는 기존 구현 Prompt를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`로 Worker 및 Harness 전체 회귀를 검증한다.
- [ ] 생성된 Prompt에 과거 증거가 없을 때 Red 재현 또는 PASS를 지시하는 표현이 없는지 단언한다.
- [ ] Backend 및 Cypress 검증이 기존 부모 verifier 경로를 그대로 사용하고 Worker sandbox 경계를 우회하지 않는지 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 증거 없는 기존 구현을 TDD PASS로 유도함
- 변경된 fingerprint에 과거 증거를 전달함
- Worker sandbox 또는 verifier 경계를 우회함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- `quality_score`가 90 미만

#### 제외 범위

- 제품 코드 및 제품 테스트 변경
- Quality Gate 삭제 또는 최소 점수 완화
- `calendar-01` Task 2의 자동 승인

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
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 동일 구현 리비전의 재실행은 검증된 과거 TDD 증거와 현재 회귀 검증으로 판정되어야 한다.
- 변경된 구현 리비전과 증거 없는 기존 구현은 자동 PASS 처리되지 않아야 한다.
- Plan의 최소 `quality_score`가 실제 실행 완료 조건으로 강제되어야 한다.
- Harness 및 Worker Runner 전체 단위 테스트가 통과해야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 품질 정책과 충돌함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 과거 TDD 증거를 다른 구현 리비전에 재사용함
- 증거 없는 기존 구현 또는 품질점수 미달 결과를 성공 처리함
- 남은 문제가 사용자 확인 없이 방치됨
