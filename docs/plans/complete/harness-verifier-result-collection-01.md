# 작업 계획: harness-verifier-result-collection-01

## 1. 기본 정보

### 사용자 요청

장기 Backend·Frontend verifier 실행이 완료되기 전에 `NOT_RUN`으로 판정되는 Harness 결함을 수정하고, 최종 종료 코드와 검증 출력을 수집한 뒤 Task 결과를 판정하도록 한다.

### 작업 목적

verifier가 제한 시간 안에 끝나지 않아 shell session 또는 진행 중 상태를 반환하더라도 Worker가 이를 최종 결과로 제출하지 않게 한다. Harness는 중복 검증 실행 없이 진행 중인 단일 검증 요청의 완료 결과를 제한된 횟수 안에서 이어서 수집하고, 최종 `PASS` 또는 `FAIL`과 증거가 확인된 뒤에만 Task를 판정해야 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: 없음
- Design Doc: 없음
- Architecture: 없음
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.agents/skills/harness-exec/SKILL.md`

---

## 2. 실행 Task

### Task 1. 장기 verifier 완료 결과 수집 결함 수정

#### 선행 Task

- 없음

#### TDD 정책

- REQUIRED

#### 작업 목적

Backend와 Frontend 장기 verifier가 진행 중 응답을 반환했을 때 조기 `NOT_RUN` 판정을 막고, Harness가 단일 실행의 최종 종료 상태와 증거를 수집할 때까지 안전하게 이어서 처리하도록 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`
- `.agents/skills/harness-exec/SKILL.md`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `docs/plans`
- `.gitignore`

#### 구현 항목

- [ ] Red: Backend와 Frontend Worker 안내가 모두 진행 중 verifier의 동일 요청을 대기·재결합하고, 중복 CLI 실행과 진행 중 상태의 최종 `NOT_RUN` 제출을 금지하는지 검증하는 실패 테스트를 작성한다.
- [ ] Red: mock Worker가 session 또는 진행 중 증거와 함께 `NOT_RUN`을 반환한 뒤 최종 `PASS` 결과를 반환하는 경우, Harness가 제품 코드 변경이나 완료된 검증 재실행을 요구하지 않고 검증 결과 수집을 이어가는지 검증하는 실패 테스트를 작성한다.
- [ ] Red: 진행 중 상태가 반복되면 기존 재시도 상한인 최대 3회에서 명시적으로 실패하고 무한 재시도하지 않으며, 최종 verifier `FAIL`은 재시도로 숨기거나 `PASS`로 바꾸지 않는지 검증하는 실패 테스트를 작성한다.
- [ ] Green: Frontend verifier 안내를 Backend와 동일한 single-flight 대기·재결합 계약으로 정렬하고, 최종 종료 상태와 비어 있지 않은 증거가 수집되기 전에는 최종 결과를 제출하지 않도록 한다.
- [ ] Green: 일반 decision correction과 구분되는 검증 결과 수집 continuation 문맥을 추가하고, session 또는 진행 중 응답 때문에 발생한 미해결 `NOT_RUN`에만 제한적으로 적용한다.
- [ ] Green: continuation이 이미 완료된 검증을 다시 실행하거나 제품 코드를 수정하지 않고 기존 single-flight 요청에 재결합해 최종 `PASS` 또는 `FAIL`과 증거를 수집하도록 하며, 최대 3회 후에도 미해결이면 원인을 포함해 실패 처리한다.
- [ ] Green: 완료된 `FAIL`, 진행 중이 아닌 임의의 `NOT_RUN`, 증거가 없는 `PASS`는 기존 실패 계약을 유지하고 자동 성공 또는 무제한 continuation 대상으로 취급하지 않는다.
- [ ] Refactor: Backend·Frontend 공통 대기 안내와 continuation 대상 판정·횟수 제한을 중복 없이 정리하되 공개 결과 계약과 verifier 명령 허용 목록은 변경하지 않는다.
- [ ] Harness 실행 지침에 장기 verifier 결과 수집, single-flight 재결합, 조기 `NOT_RUN` 금지, 재시도 상한을 실제 동작과 일치하도록 반영한다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner.py'`가 통과하고 Backend·Frontend 안내의 대기·재결합 계약을 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`가 통과하고 진행 중 응답의 continuation, 최종 `PASS`/`FAIL`, 3회 상한, 비대상 `NOT_RUN` 처리를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'` 전체 Harness unittest가 통과한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec`가 통과한다.
- [ ] 테스트 기록에 `Red → Green → Refactor` 순서와 각 단계의 실행 결과가 남아 있다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 장기 Backend·Frontend verifier의 진행 중 상태가 최종 `NOT_RUN`으로 조기 확정되지 않아야 한다.
- Harness가 중복 verifier 실행 없이 최대 3회의 continuation 안에서 최종 종료 상태와 비어 있지 않은 증거를 수집해야 한다.
- 최종 `FAIL`과 continuation 비대상 `NOT_RUN`이 성공으로 오판되지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 진행 중 verifier 응답이 최종 `NOT_RUN`으로 제출되거나 결과 수집 없이 Task가 판정됨
- 같은 검증 명령이 중복 실행되거나 continuation이 무한 반복됨
- 최종 verifier `FAIL`, 비대상 `NOT_RUN`, 증거 없는 `PASS`가 성공 처리됨
- 필수 구현 항목이 누락되거나 Harness unittest가 실패함
- Red 단계의 실패 테스트 없이 구현부터 변경함
- 이 Task의 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 검증할 수 없는 상태로 작업을 종료함
- `quality_score`가 90 미만임

#### 제외 범위

- 제품 Backend·Frontend 코드와 해당 제품 테스트 변경
- TDD 정책 분류 또는 `REQUIRED`, `REUSE_ALLOWED`, `REGRESSION_ONLY`, `NOT_APPLICABLE` 판정 규칙 변경
- verifier별 명령 허용 목록, 필수 검증 항목 또는 품질 게이트 완화
- Cypress 테스트 작성·실행·환경 구성
- shell session 자체의 수명 또는 외부 CLI 구현 변경
- 배포, 외부 서비스 연동, 인증·권한 정책 변경

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
- 장기 Backend·Frontend verifier가 single-flight로 완료 결과를 반환하고 Harness 판정에 최종 상태와 증거가 반영되어야 한다.
- 관련 Harness 실행 지침과 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- 장기 verifier의 진행 중 상태가 최종 결과로 오판되거나 중복 검증이 실행됨
- 최대 재시도 횟수를 넘겨 무한 continuation이 발생함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
