# 작업 계획: harness-scoped-backend-formatter-01

## 1. 기본 정보

### 사용자 요청

Backend Worker가 Task 범위를 벗어나지 않고 Spotless 포맷을 적용할 수 있게 하여 Active Plan이 포맷 게이트에서 반복 중단되는 문제를 해결한다.

### 작업 목적

Harness 부모 Backend Verifier에 Task 경로 계약과 결합된 Java 포맷 경계를 추가하여, Worker가 허용된 Backend Java 파일만 저장소의 Spotless 설정으로 포맷하고 검증을 계속할 수 있게 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `AGENTS.md`, `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Task 경로 제한 Backend Spotless formatter 구현

#### 선행 Task

- 없음

#### 작업 목적

Worker가 부모 Backend Verifier를 통해 현재 Task에서 수정 가능한 Java 파일만 Spotless로 포맷하고, 허용 범위 밖 파일이나 금지 경로를 변경할 수 없게 한다.

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

- [ ] Task별 formatter 토큰과 경로 계약, 허용·금지 경로 판정, symlink 및 저장소 탈출 차단, 원자적 결과 반영을 표현하는 실패 테스트를 먼저 작성한다.
- [ ] Backend Verifier가 Worker별 `allowed_paths`와 `forbidden_paths`에 결합된 일회성 또는 실행 수명 토큰을 발급하고 다른 Task의 토큰·경로를 재사용하지 못하게 한다.
- [ ] formatter는 `backend` 아래의 기존 `.java` 일반 파일 중 Task 수정 가능 경로에 포함되고 수정 금지 경로에는 포함되지 않은 파일만 대상으로 삼는다.
- [ ] 실제 저장소에서 광범위한 `spotlessApply`를 실행하지 않고, 검증된 대상 파일과 필요한 Gradle·Spotless 설정만 부모 임시 작업공간에 구성해 포맷한 뒤 성공한 결과만 대상 파일에 원자적으로 반영한다.
- [ ] 임시 formatter 실행은 저장소의 Gradle Wrapper와 Spotless 설정을 사용하고 Shell 문자열 없이 인자 배열, 고정 제한 시간 및 직렬 실행을 적용한다.
- [ ] 포맷 실패·Timeout·대상 없음·범위 밖 경로·symlink·잘못된 인증 요청은 저장소 파일을 변경하지 않고 안전한 오류와 종료 코드를 반환한다.
- [ ] Worker CLI와 Prompt에 Backend Java 포맷 명령을 추가하고, `spotlessCheck` 실패 시 직접 `gradlew` 또는 광범위한 `spotlessApply`를 실행하지 않고 제한 formatter를 호출하도록 안내한다.
- [ ] Harness 수명주기에서 TaskInvocation의 허용·금지 경로를 Backend Verifier 토큰에 결합해 Worker 환경으로 전달한다.
- [ ] 기존 Gradle 검증 allowlist, Browser Verifier, Worker sandbox와 Calendar 제품 코드 동작을 변경하지 않는다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_backend_verifier.py`로 Task별 인증, 경로 범위, 금지 경로 우선, symlink·저장소 탈출 차단, 임시 포맷 및 원자적 반영을 검증한다.
- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_browser_verifier.py .agents/skills/harness-exec/tests/test_worker_runner.py`로 기존 Browser 검증기, Worker Prompt와 실행 환경 회귀가 없는지 검증한다.
- [ ] 테스트에서 서로 다른 Task 토큰이 다른 Task 경로를 포맷할 수 없고 실제 저장소의 범위 밖 파일이 변경되지 않는지 검증한다.
- [ ] 테스트에서 formatter 실패와 Timeout 시 원본 파일이 전혀 변경되지 않고 임시 작업공간이 정리되는지 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`와 `git diff --check`를 실행한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고 계속 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 실제 저장소에서 범위가 제한되지 않은 `spotlessApply`를 실행하지 않아야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Task 토큰과 경로 계약 없이 formatter 실행 가능
- 허용 범위 밖 또는 symlink 대상 파일 변경 가능
- 실패나 Timeout 뒤 원본 파일 일부가 변경됨
- 실제 저장소에서 광범위한 `spotlessApply` 실행
- 인증 없는 localhost 요청 허용
- 기존 Gradle 또는 Browser 검증 회귀
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- Calendar 제품 코드와 테스트 수정
- Backend Gradle 의존성 및 Spotless 규칙 변경
- Worker sandbox 완화 또는 비활성화
- 일반 Gradle Task allowlist에 `spotlessApply` 추가
- Frontend formatter 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 통과해야 한다.
- Task별 경로 계약이 formatter 인증에 결합되어야 한다.
- 허용된 Backend Java 일반 파일만 포맷되어야 한다.
- 실패·Timeout·범위 오류에서 저장소 파일이 변경되지 않아야 한다.
- 기존 Backend·Browser 검증과 Worker sandbox에 회귀가 없어야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 검증이 실패함
- Task 범위 밖 파일을 포맷할 수 있음
- 실패 시 부분 변경이 남음
- Worker sandbox 또는 Gradle 명령 allowlist를 광범위하게 완화함
- 관련 설계·보안 문서와 충돌함
- 전체 `quality_score`가 90 미만
