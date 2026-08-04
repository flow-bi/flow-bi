# 작업 계획: harness-browser-artifacts-02

## 1. 기본 정보

### 사용자 요청

Harness Task Worker의 Cypress 실패 생성물이 Task 수정 가능 경로 밖에 남아 Scope Gate를 실패시키는 문제를 해결한다.

### 작업 목적

부모 브라우저 검증기가 Cypress 스크린샷을 저장소 밖의 임시 경로에 생성하도록 하여 실패 증거는 출력으로 유지하면서 작업 트리를 오염시키지 않게 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `AGENTS.md`, `SECURITY.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Cypress 실패 생성물 격리 및 회귀 검증

#### 선행 Task

- 없음

#### 작업 목적

Cypress 실패 스크린샷을 저장소 작업 트리가 아닌 부모 검증기의 임시 경로에 생성하고 성공·실패·Timeout에서 정리한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner/browser_verifier.py`
- `.agents/skills/harness-exec/tests/test_browser_verifier.py`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents/skills/harness-exec/scripts/harness_runner`

#### 구현 항목

- [ ] 실패 Cypress 실행이 저장소의 `frontend/cypress/screenshots`를 생성하지 않는 회귀 테스트를 먼저 작성한다.
- [ ] 부모 브라우저 검증기가 실행별 임시 스크린샷 경로를 Cypress 환경에 전달한다.
- [ ] 성공·실패·Timeout 이후 임시 생성물이 자동 정리되도록 한다.
- [ ] Cypress 출력과 종료 코드는 변경하지 않고 Worker에 그대로 반환한다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python .agents/skills/harness-exec/tests/test_browser_verifier.py`로 성공·실패·재시도·동시 실행과 생성물 격리를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`로 Harness 전체 회귀를 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 Python 구문을 검증한다.
- [ ] 이 Task의 생성물 격리가 기존 Worker 경로 Scope 판정과 충돌하지 않는지 실패 실행 회귀 테스트로 검증한다.

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
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Cypress 출력·종료 코드가 왜곡됨
- 저장소 작업 트리에 실패 생성물이 남음
- `quality_score`가 90 미만

#### 제외 범위

- Cypress 테스트 내용 또는 제품 코드 변경
- Worker sandbox 권한 확대
- Browser 선택 또는 Cypress 의존성 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- 각 Task의 수정 가능 경로 안에서만 변경해야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- Cypress 실패 생성물이 저장소 작업 트리에 남지 않아야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task 수정 가능 경로 밖 변경 또는 수정 금지 경로 변경이 발생함
- Product Spec 또는 Design Doc과 충돌함
- Cypress 결과가 숨겨지거나 왜곡됨
- 전체 `quality_score`가 90 미만
