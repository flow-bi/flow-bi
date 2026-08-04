# 작업 계획: harness-worker-decision-01

## 1. 기본 정보

### 사용자 요청

모든 Mandatory Gate와 필수 검증이 통과했는데 Worker가 비표준 후속 조치 판정을 반환하여 선행 Task와 전체 Plan이 중단되는 문제를 해결한다.

### 작업 목적

Worker의 최종 판정 계약을 `PASS` 또는 실패 판정으로 명확히 제한하고, 객관적인 성공 조건과 모순되는 비표준 판정이 제출되면 실행기가 품질 게이트를 완화하거나 결과를 임의 변환하지 않은 채 한 번의 판정 교정 기회를 제공한다. 교정 후에도 계약을 위반하면 명확한 실패 사유를 남겨 실제 검증 실패와 판정 형식 오류를 구분한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `AGENTS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Worker 최종 판정 계약 강제 및 교정 재시도 구현

#### 선행 Task

- `없음`

#### 작업 목적

모든 Mandatory Gate, Plan 검증 항목과 최소 품질점수가 통과한 결과가 `PASS_WITH_FOLLOW_UP` 등 지원하지 않는 판정 때문에 즉시 실패하지 않도록 Worker에게 계약에 맞는 최종 판정을 다시 요청하고, 실제 실패 결과는 성공으로 변환하지 않는다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `frontend`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Mandatory Gate, 검증 결과와 최소 품질점수는 모두 통과했지만 Worker가 지원하지 않는 최종 판정을 반환하는 실패 회귀 테스트를 먼저 작성한다.
- [ ] Worker 최종 JSON 계약에서 성공 판정은 정확히 `PASS`만 허용하고 `PASS_WITH_FOLLOW_UP`, `HUMAN_REVIEW_REQUIRED` 등 임의 판정이 성공 조건을 대체하지 못하도록 안내한다.
- [ ] 객관적인 성공 조건과 최종 판정만 모순되는 경우 실행기가 기존 검증 증거를 포함해 판정 교정을 한 번만 요청한다.
- [ ] 교정 요청은 제품 구현과 테스트를 다시 수행하거나 변경하도록 지시하지 않고 최종 결과 계약만 바로잡도록 제한한다.
- [ ] 교정 결과가 `PASS`이면 정상 실행 기록을 저장하고 후속 Task를 진행한다.
- [ ] 교정 후에도 지원하지 않는 판정이거나 Mandatory Gate, 검증 결과, 품질점수가 실패하면 자동 성공 처리하지 않고 구체적인 실패 사유를 반환한다.
- [ ] Worker 호출 오류, Timeout 및 명시적인 실패 판정에는 교정 재시도를 적용하지 않는다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_harness_runner_modules.py`로 비표준 성공 판정의 1회 교정, 교정 성공, 반복 위반 실패와 후속 Task 상태 전파를 검증한다.
- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_worker_runner.py`로 신규·재실행 Prompt가 정확한 최종 판정 계약과 판정 전용 교정 지침을 전달하는지 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`로 Harness 전체 회귀를 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 Python 구문을 검증한다.
- [ ] 명시적인 Gate·검증·품질점수 실패와 Worker 비정상 종료가 교정 재시도 없이 실패하는지 단위 테스트로 검증한다.
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
- 테스트 또는 Compile 검증 실패
- Mandatory Gate, 검증 실패 또는 품질점수 미달 결과를 성공 처리함
- 지원하지 않는 판정을 증거 확인 없이 `PASS`로 변환함
- 판정 교정을 무제한 재시도하거나 제품 구현 재실행으로 확장함
- Worker 오류 또는 Timeout을 숨김
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- `quality_score`가 90 미만

#### 제외 범위

- 제품 코드 또는 제품 테스트 변경
- Mandatory Gate, 검증 항목 또는 최소 품질점수 완화
- 특정 제품 Plan이나 Task 번호에 종속된 예외 처리
- Worker sandbox 권한 확대

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 비표준 성공 판정은 한 번의 판정 전용 교정을 거쳐 계약에 맞게 처리되어야 한다.
- 실제 Gate, 검증, 품질 또는 Worker 실행 실패는 자동 성공 처리되지 않아야 한다.
- Harness 및 Worker Runner 전체 단위 테스트가 통과해야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 품질 게이트 또는 검증 규칙이 완화됨
- 비표준 판정을 근거 없이 성공으로 정규화함
- 실제 실패가 판정 교정 과정에서 숨겨짐
- 남은 문제가 사용자 확인 없이 방치됨
