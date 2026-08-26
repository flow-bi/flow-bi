# 작업 계획: harness-cypress-auto-run-01

## 1. 기본 정보

### 사용자 요청

현재 단계에서는 팀원별 로컬 브라우저 테스트로 충분하므로 Harness 테스트 단계에서 Cypress가 자동 실행되지 않도록 제거한다.

### 작업 목적

Harness 실행 중 Cypress 브라우저 검증기와 Worker 호출 경로가 자동으로 준비·실행되는 동작을 제거하여, Harness 검증이 비브라우저 자동 검증에만 집중하도록 한다. 저장소의 Cypress 설정과 테스트는 유지해 팀원이 필요할 때 로컬에서 직접 실행할 수 있게 한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`

---

## 2. 실행 Task

### Task 1. Harness Cypress 자동 검증 경로 제거

#### 선행 Task

- `없음`

#### 작업 목적

Harness 부모 프로세스가 Cypress 브라우저 검증기를 시작하거나 Worker에 Cypress 실행 안내와 연결 정보를 전달하지 않게 하고, 관련 전용 브리지 코드를 제거한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner/cli.py`
- `.agents/skills/harness-exec/tests/test_browser_verifier.py`
- `.agents/skills/harness-exec/tests/test_frontend_verifier.py`
- `.agents/skills/harness-exec/tests/test_worker_runner.py`
- `.agents/scripts/worker_runner/codex.py`
- `.agents/scripts/worker_runner/invocation.py`
- `.agents/scripts/worker_runner/browser_verifier.py`
- `.agents/scripts/run-browser-verifier.py`

#### 수정 금지 경로

- `frontend/cypress`
- `frontend/cypress.config.ts`
- `frontend/package.json`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red: Harness 수명주기에서 브라우저 검증기를 생성하지 않고 Worker 환경에 Cypress 검증기 URL·Token을 전달하지 않는 회귀 테스트를 먼저 작성해 기존 구현에서 실패를 확인한다.
- [ ] Red: Worker Prompt에 Cypress 자동 실행 안내와 `run-browser-verifier.py cypress` 호출이 포함되지 않는 회귀 테스트를 먼저 작성해 기존 구현에서 실패를 확인한다.
- [ ] Green: Harness 실행기에서 `BrowserVerifier` 생성, 수명주기 관리와 Worker 환경 병합을 제거한다.
- [ ] Green: Worker Prompt의 Cypress 브라우저 검증 안내를 제거하고 Cypress 전용 실행 스크립트와 브라우저 검증기 모듈을 제거한다.
- [ ] Green: 제거된 동작을 전제로 관련 Harness 테스트를 갱신하되 Backend·Frontend 검증기 환경 전달 동작은 그대로 유지한다.
- [ ] Refactor: Cypress 전용 import, 상수, Mock과 참조가 남지 않도록 정리하며 저장소의 Cypress 설정·Spec·npm Script는 변경하지 않는다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_browser_verifier.py .agents/skills/harness-exec/tests/test_frontend_verifier.py`를 실행해 Cypress 자동 실행 제거와 기존 Frontend 검증기 회귀 테스트를 통과한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`를 실행해 Harness 전체 단위 테스트를 통과한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/scripts .agents/scripts/worker_runner`를 실행해 변경된 Python 코드의 문법을 검증한다.
- [ ] `rg -n "BrowserVerifier|FLOW_BI_BROWSER_VERIFIER|run-browser-verifier|BROWSER_VERIFICATION_GUIDANCE" .agents/skills/harness-exec .agents/scripts` 결과에 실행 코드 또는 Worker 안내 참조가 남지 않았는지 확인한다.
- [ ] 위 검증 과정에서 `npm run test:e2e`, `npx cypress` 또는 Cypress 브라우저 프로세스를 실행하지 않았음을 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Harness 실행 중 Cypress 브라우저 검증기 프로세스가 시작되지 않아야 한다.
- Worker가 Harness를 통해 Cypress 실행을 요청할 수 있는 안내와 연결 정보가 제공되지 않아야 한다.
- Backend·Frontend 비브라우저 검증기 동작이 기존과 동일하게 유지되어야 한다.
- `frontend/cypress`, `frontend/cypress.config.ts`, `frontend/package.json`의 로컬 Cypress 자산에 변경이 없어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `0.9` 이상이어야 한다.

#### 실패 조건

- Harness가 Cypress 브라우저 검증기를 계속 생성하거나 Cypress 연결 정보를 Worker에 전달함
- Worker Prompt에 Harness 기반 Cypress 실행 안내가 남아 있음
- Harness 검증 중 Cypress 또는 `npm run test:e2e`가 실행됨
- Backend·Frontend 비브라우저 검증기 회귀 테스트 실패
- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Cypress 의존성, 설정, E2E Spec과 `npm run test:e2e` Script 삭제
- 팀원의 로컬 Cypress 실행 방식 변경
- Backend·Frontend 비브라우저 검증기 정책 변경
- Active Plan에 이미 작성된 기능별 Cypress 테스트 요구사항 일괄 수정
- CI 또는 운영 배포 Pipeline 변경

#### 작업 결과

`none`

#### 남은 문제

- Cypress 자동 검증을 다시 도입할지는 팀의 통합 검증 정책이 확정된 뒤 별도 작업으로 결정한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Harness가 Cypress를 자동 실행하거나 Worker에 자동 실행 경로를 제공하지 않아야 한다.
- 로컬 Cypress 자산과 실행 Script는 그대로 유지되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `0.9` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- Harness 실행에서 Cypress 자동 실행 경로가 남아 있음
- Cypress 로컬 테스트 자산 또는 npm Script가 변경됨
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
