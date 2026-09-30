# 작업 계획: harness-frontend-verifier-01

## 1. 기본 정보

### 사용자 요청

Frontend Verifier가 의도적으로 삭제된 npm 인자 검증 함수를 다시 요구하지 않도록 현재 API에 맞춰 오류를 수정한다.

### 작업 목적

Frontend 검증 명령이 `npm run test:unit`, `npm run typecheck`, `npm run check`로 제한되는 현재 호출 계약을 유지하면서, CLI에 남은 `validate_npm_arguments` 잔여 import 때문에 모든 검증이 시작 전에 실패하는 문제를 해결한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`

---

## 2. 실행 Task

### Task 1. Frontend Verifier CLI 잔여 import 제거

#### 선행 Task

- `없음`

#### 작업 목적

Frontend Verifier CLI가 실제 사용하는 client API만 import하여, 삭제된 service 함수와 결합하지 않고 검증 요청을 시작할 수 있게 한다.

#### 수정 가능 경로

- `.agents/scripts/verifier_runtime/frontend_verifier.py`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/verifier_runtime/frontend_service.py`
- `.agents/scripts/verifier_runtime/frontend_client.py`
- `frontend/**`
- `backend/**`

#### 구현 항목

- [ ] CLI 모듈 로드 시 `validate_npm_arguments` ImportError가 발생하는 회귀 테스트를 먼저 추가한다.
- [ ] `frontend_verifier.py`에서 사용하지 않는 `frontend_service` import를 제거하고 실제 사용하는 client API import만 유지한다.
- [ ] 인자가 없을 때 사용법 메시지와 종료 코드 2를 반환하는 기존 CLI 계약을 유지한다.
- [ ] npm 검증 명령의 기존 세 가지 script 계약과 service/client 동작은 변경하지 않는다.

#### TDD 정책

- REQUIRED

CLI 로드 실패를 재현하는 테스트를 Red로 확인하고, 잔여 import만 제거해 Green으로 만든 뒤 불필요한 import가 남지 않았는지 정리한다.

#### 검증 항목

- [ ] `python .agents/skills/harness-exec/tests/test_frontend_verifier_runtime_cli.py`
- [ ] `python .agents/scripts/verifier_runtime/frontend_verifier.py`가 ImportError 없이 사용법 메시지와 종료 코드 2를 반환한다.
- [ ] `python -m compileall -q .agents/scripts/verifier_runtime`
- [ ] `git diff --check`

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- `validate_npm_arguments` 함수 복구
- Frontend Verifier service/client의 허용 명령 정책 변경
- Harness Worker 실행 구조 리팩터링
- 71번 이슈의 프런트엔드 구현 변경

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
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
