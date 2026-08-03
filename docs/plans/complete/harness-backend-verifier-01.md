# 작업 계획: harness-backend-verifier-01

## 1. 기본 정보

### 사용자 요청

현재 Active Plan이 Backend 검증을 Worker 샌드박스에서 실행하다 중단되는 문제를 해결한다.

### 작업 목적

Harness Worker가 Backend Gradle 검증을 직접 실행할 때 발생하는 JVM Agent attach 및 Eclipse formatter 권한 오류를 제거하고, 제한된 Gradle 검증만 인증된 localhost 경계를 통해 Harness 부모 프로세스에서 안전하게 실행하도록 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Harness 부모 Backend 검증기 구현

#### 선행 Task

- 없음

#### 작업 목적

Worker가 요청한 허용된 Backend Gradle 검증을 Harness 부모가 실행하고 결과와 종료 코드를 Worker에 반환하여 샌드박스 권한 때문에 Plan이 중단되지 않게 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs`
- `.agents/skills/harness-plan`

#### 구현 항목

- [ ] 부모 Backend 검증기의 인증, 명령 허용 목록, 고정 작업 디렉터리, 직렬 실행, 종료 코드 전달과 Timeout 동작을 표현하는 실패 테스트를 먼저 작성한다.
- [ ] Harness 부모에서 시작되는 token 기반 localhost Backend 검증 서비스를 구현한다.
- [ ] 검증 서비스는 저장소의 `backend/gradlew`만 사용하고 `test`, `spotlessCheck`, `build`, `assemble`, `compileJava`와 테스트 필터 등 검증에 필요한 안전한 인자만 허용한다.
- [ ] Shell 문자열 실행을 사용하지 않고 인자 배열로 Gradle을 실행하며 `backend` 고정 작업 디렉터리와 제한 시간을 적용한다.
- [ ] Worker가 부모 검증기에 Gradle 인자를 전달하고 출력, 종료 코드 및 Timeout 상태를 동일하게 반환받는 CLI 경계를 구현한다.
- [ ] Harness 실행 수명주기에서 Browser 검증기와 Backend 검증기를 함께 시작하고 두 검증기의 연결 환경을 Worker에 전달한다.
- [ ] Worker Prompt에 Backend Gradle 검증은 부모 검증기 CLI를 사용하고 실패 시 허용 범위 구현을 수정한 뒤 같은 명령을 재실행하도록 안내한다.
- [ ] URL·Token이 없거나 잘못된 경우, 허용되지 않은 Gradle Task·옵션, 과도한 Request와 동시 요청을 안전하게 거부한다.
- [ ] 기존 Browser 검증기와 Worker 경로 권한 동작을 유지하고 Red → Green → Refactor 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_backend_verifier.py`로 Backend 검증기의 인증, Allowlist, 고정 명령·경로, 결과 전달, Timeout 및 직렬화를 검증한다.
- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_browser_verifier.py .agents/skills/harness-exec/tests/test_worker_runner.py`로 기존 Browser 검증기와 Worker 실행 환경의 회귀가 없는지 검증한다.
- [ ] 테스트에서 Harness 수명주기가 Browser·Backend 검증기 환경을 함께 Worker에 전달하고 두 서비스를 종료하는지 검증한다.
- [ ] 테스트에서 Worker Prompt의 Backend 검증 명령이 부모 서비스를 호출하며 Worker 내부에서 Gradle을 직접 실행하도록 안내하지 않는지 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고 계속 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

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
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 임의 Shell 명령 또는 허용 목록 밖 Gradle 실행 가능
- 인증 없는 localhost 검증 요청 허용
- 기존 Browser 검증 또는 Worker 실행 환경 회귀
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- Calendar 제품 코드와 테스트 수정
- Backend Gradle 의존성 및 Spotless 규칙 변경
- Worker 샌드박스 완화 또는 비활성화
- Cypress 검증 명령 변경

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
- Backend 검증 명령이 Worker 샌드박스가 아니라 인증된 Harness 부모 경계에서 실행되어야 한다.
- 허용 목록 밖 명령과 인증되지 않은 요청이 거부되어야 한다.
- Browser 검증기와 Worker 실행 환경에 회귀가 없어야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- Worker 샌드박스를 완화하거나 임의 명령 실행 경로가 추가됨
- 남은 문제가 사용자 확인 없이 방치됨
- 전체 `quality_score`가 90 미만
