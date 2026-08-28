# 작업 계획: harness-tdd-policy-01

## 1. 기본 정보

### 사용자 요청

Task 성격에 따라 TDD 정책을 명시적으로 구분하고, 신규 기능·버그 수정은 `REQUIRED`, 동일 Task 재실행은 `REUSE_ALLOWED`, 통합 회귀·최종 검증은 `REGRESSION_ONLY`, 문서·단순 설정은 `NOT_APPLICABLE`로 판정하여 성격이 다른 Task에서 TDD Mandatory Gate가 잘못 실패하지 않도록 한다.

### 작업 목적

Active Plan과 Harness 실행 계약에 Task별 TDD 정책을 명시하고, 실행기가 선언 정책과 재실행 증거를 바탕으로 유효 정책을 결정하게 한다. TDD가 필요한 구현은 기존 `Red → Green → Refactor` Gate를 유지하면서도 동일 Task 재실행, 회귀 전용 검증, 문서·단순 설정 Task에는 각 정책에 맞는 증거 계약을 적용하여 잘못된 TDD 실패를 제거한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.agents/skills/harness-plan/SKILL.md`, `.agents/skills/harness-exec/SKILL.md`

---

## 2. 실행 Task

### Task 1. Task별 TDD 정책 계약 및 Mandatory Gate 판정 구현

#### 선행 Task

- `없음`

#### 작업 목적

Active Plan의 각 Task가 TDD 선언 정책을 가지도록 검증·파싱하고, Harness가 Task 성격과 신뢰 가능한 재실행 증거에 따라 유효 정책을 결정하여 정책별 Mandatory Gate와 실행 증거를 일관되게 검증한다.

#### TDD 정책

- `REQUIRED`

#### 수정 가능 경로

- `.agents/scripts`
- `.agents/skills/harness-plan`
- `.agents/skills/harness-exec`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `docs/plans/_template.md`

#### 구현 항목

- [ ] Red: Plan의 Task별 TDD 정책 누락·허용값 외 입력을 거부하고, Harness Plan 파서가 선언 정책을 보존하며, 네 정책의 실행·Gate·증거 계약이 서로 다르게 판정되는 실패 테스트를 먼저 작성하고 의도한 이유로 실패함을 기록한다.
- [ ] Green: Plan 검증과 `harness-plan` 작성 규칙에 `#### TDD 정책` 및 선언 가능 정책을 명시하고, Harness Task 모델·파서·fingerprint에 선언 정책을 포함하여 Task 계약 변경 시 기존 증거가 재사용되지 않게 한다.
- [ ] Green: 신규 기능·버그 수정 Task의 최초 또는 변경 실행은 `REQUIRED`로 유지하고 `Red → Green → Refactor` 증거가 있어야 통과시키며, 같은 Task 계약 fingerprint와 검증된 선행 TDD 증거가 있는 재실행만 유효 정책 `REUSE_ALLOWED`로 전환하여 선행 증거 식별자와 현재 Green·회귀 검증을 모두 요구한다.
- [ ] Green: 통합 회귀·최종 검증 Task의 `REGRESSION_ONLY`는 새로운 Red 재현 없이 현재 회귀 검증 증거를 요구하고, 문서·단순 설정 Task의 `NOT_APPLICABLE`은 비어 있지 않은 적용 제외 사유와 Task에 맞는 대체 검증 증거를 요구하도록 Worker 프롬프트, 결과 계약, Mandatory Gate 판정 및 실행 기록 검증을 정렬한다.
- [ ] Green: 선언 정책, 실행 시 유효 정책, TDD Gate 결과와 증거가 모순되거나 `REUSE_ALLOWED`에 동일 fingerprint의 신뢰 가능한 선행 증거가 없으면 성공으로 처리하거나 증거를 저장하지 않고 명시적으로 실패시킨다.
- [ ] Refactor: 정책 상수와 판정 로직을 한 책임 단위로 정리하고 기존 Permission·범위·요구사항·자동 검증·계약 동기화·Critical Finding Gate 및 품질 점수 기준을 약화하지 않는다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`로 Plan 파싱, Worker 호출 계약, 실행 모드, 정책별 Mandatory Gate, fingerprint 및 실행 기록 회귀 테스트가 통과한다.
- [ ] 임시 Active Plan fixture를 대상으로 `python .agents/scripts/validate-plan.py <fixture>`를 실행하는 테스트에서 Task별 `REQUIRED`, `REGRESSION_ONLY`, `NOT_APPLICABLE` 선언은 통과하고 정책 누락·알 수 없는 값은 실패하며, `REUSE_ALLOWED`는 검증된 동일 Task 재실행에서만 유효 정책으로 선택된다.
- [ ] 기존 동일 Task 재실행 테스트에서 같은 fingerprint와 유효한 선행 TDD 증거가 있을 때만 `REUSE_ALLOWED`가 적용되고, 변경 fingerprint·손상 증거·증거 없음은 재사용되지 않음을 확인한다.
- [ ] 통합 회귀·최종 검증 및 문서·단순 설정 fixture에서 각각 현재 회귀 증거와 적용 제외 사유·대체 검증 증거가 있을 때만 TDD Mandatory Gate가 통과하며, 근거 누락은 실패함을 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Task별 선언 TDD 정책이 Plan 검증, 파싱, Task fingerprint, Worker 실행 컨텍스트와 결과 계약에 동일한 의미로 전달되어야 한다.
- 신규 기능·버그 수정은 `REQUIRED`, 검증된 동일 Task 재실행은 `REUSE_ALLOWED`, 통합 회귀·최종 검증은 `REGRESSION_ONLY`, 문서·단순 설정은 `NOT_APPLICABLE`로 판정되어야 한다.
- `REUSE_ALLOWED`는 동일 Task 계약 fingerprint와 검증된 선행 TDD 증거가 모두 있을 때만 적용되고 현재 Green·회귀 검증을 생략할 수 없어야 한다.
- `REGRESSION_ONLY`와 `NOT_APPLICABLE`은 TDD Red 증거를 요구하지 않되 각각 현재 회귀 검증, 또는 적용 제외 사유와 대체 검증 근거 없이는 통과할 수 없어야 한다.
- 기존 Mandatory Gate와 최소 품질 기준을 완화하거나 실패를 `PASS_WITH_FOLLOW_UP` 등으로 우회하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 검증 실패
- Task에 TDD 선언 정책이 없거나 허용되지 않은 정책이 수용됨
- 신규·변경 구현이 Red 증거 없이 통과하거나, 동일 fingerprint 및 신뢰 가능한 증거 없이 `REUSE_ALLOWED`가 적용됨
- `REGRESSION_ONLY`가 현재 회귀 증거 없이 통과하거나 `NOT_APPLICABLE`이 사유·대체 검증 근거 없이 통과함
- TDD 정책과 Mandatory Gate 결과가 모순된 실행 기록이 저장 또는 재사용됨
- 기존 Mandatory Gate, 검증 강도 또는 품질 기준이 약화됨
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90`점 미만

#### 제외 범위

- 제품 Backend·Frontend 기능 및 테스트 변경
- Product Spec, Design Doc, Quality Model, Active Plan Template 변경
- 기존 Active Plan 일괄 마이그레이션 또는 실행 상태·증거 파일 자동 변환
- TDD 외 Mandatory Gate, 품질 점수 배점 및 재시도 한도 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task별 TDD 선언 정책과 실행 시 유효 정책이 Plan 검증부터 Worker 결과 및 실행 기록까지 일관되게 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 정책별 필수 증거 없이 TDD Mandatory Gate가 통과하거나, 적용 가능한 Task가 잘못 실패함
- 남은 문제가 사용자 확인 없이 방치됨
