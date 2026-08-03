# 작업 계획: harness-frontend-verifier-01

## 1. 기본 정보

### 사용자 요청

Worker 샌드박스에서 실패하는 Frontend npm 검증을 Harness 부모 계층의 인증된 FrontendVerifier로 실행한다. `npm ls`, `npm run test:unit`, `npm run typecheck`, `npm run check`만 허용하고 출력과 종료 코드를 Worker에 반환하며, 기존 BrowserVerifier와 BackendVerifier 및 Worker sandbox 권한은 완화하지 않는다.

### 작업 목적

Frontend Task Worker가 직접 `npm run`을 실행할 때 npm의 하위 script shell과 Vitest 의존성 탐색이 Worker 샌드박스 경계를 넘어 종료 코드 255 또는 `EPERM`으로 실패하는 문제를 해결한다. Harness 부모가 고정되고 검증된 Frontend npm 명령만 실행하는 최소 권한 verifier를 제공하여, Worker sandbox를 넓히거나 테스트 명령을 우회하지 않고 Active Plan의 정확한 Frontend 검증 결과와 종료 코드를 수집할 수 있게 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 인증된 부모 FrontendVerifier 구현 및 Harness 연결

#### 선행 Task

- `없음`

#### 작업 목적

Frontend 검증 요청을 실행별 인증 정보가 있는 loopback 경계로 제한하고, Harness 부모가 허용된 npm 명령을 고정된 `frontend` 작업 디렉터리에서 실행한 뒤 출력, 종료 코드와 timeout 상태를 Worker에 반환하도록 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/codex.py`
- `.agents/scripts/worker_runner/browser_verifier.py`
- `.agents/scripts/worker_runner/backend_verifier.py`
- `frontend`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`

#### 구현 항목

- [ ] Red 단계에서 인증된 요청의 고정 npm 명령 변환, 잘못된 인증과 입력 거부, timeout·종료 코드·출력 전달, 동시 요청 제어, CLI 전달, Worker 안내 문구, Harness lifecycle 연결을 재현하는 실패 테스트를 먼저 작성하고 의도한 이유로 실패함을 기록한다.
- [ ] Harness 부모에서만 실행되는 `FrontendVerifier`를 Worker runner 경계에 추가하고 `127.0.0.1`의 임시 포트에만 바인딩한다.
- [ ] 실행마다 예측 불가능한 토큰을 생성하고 상수 시간 비교로 검증하며, URL과 토큰은 Frontend 수정 가능 경로가 있는 Task에만 환경변수로 전달한다.
- [ ] Client는 전달된 verifier URL이 `http`와 loopback host 및 유효한 임시 port를 사용하는지 검증하고, 연결 정보 누락·변조·인증 실패·잘못된 응답을 안전한 오류로 반환한다.
- [ ] 요청 계약은 `npm ls`와 `npm run test:unit`, `npm run typecheck`, `npm run check`만 허용한다. `npm ls`는 옵션·경로·버전 specifier가 아닌 안전한 unscoped 또는 scoped package 이름만 받으며, 그 외 npm command, 임의 flag, 임의 script와 shell 문자열은 기본 거부한다.
- [ ] 부모는 플랫폼에 맞는 `npm` 또는 `npm.cmd`를 해석하고 shell 문자열 조립 없이 인자 배열로 실행하며, 작업 디렉터리를 저장소의 `frontend`로 고정한다.
- [ ] 부모 npm 프로세스 환경에서 FrontendVerifier URL과 토큰을 제거하고, 인증 토큰과 환경변수 값이 명령 출력·오류·로그에 포함되지 않게 한다.
- [ ] 각 검증의 stdout과 stderr를 순서를 보존한 하나의 출력으로 수집하고 실제 종료 코드를 반환하며, 고정 timeout 초과 시 종료 코드 `124`와 timeout 상태를 반환한다.
- [ ] 동시 요청은 실행 lock으로 직렬화하거나 명시적인 busy 응답으로 거부하여 부모에서 중복 Frontend 검증이 무제한 실행되지 않게 하고, 요청 body 크기를 제한한다.
- [ ] Worker용 CLI가 부모 verifier에 요청하고 부모가 반환한 출력과 종료 코드를 그대로 전달하도록 한다. CLI는 직접 `npm`을 실행하거나 연결 실패를 성공으로 변환하지 않는다.
- [ ] Task Worker 안내에 Frontend 검증은 직접 `npm`으로 실행하지 않고 `FLOW_BI_PYTHON_EXECUTABLE`과 FrontendVerifier CLI를 사용하도록 macOS/Linux와 Windows 명령 형식을 기록한다.
- [ ] Harness lifecycle이 BrowserVerifier와 BackendVerifier에 더해 FrontendVerifier를 시작·종료하고, Frontend Task에만 필요한 연결 환경을 Worker gateway로 전달하도록 연결한다.
- [ ] Green 단계에서 신규 테스트를 통과시키고, Refactor 단계에서 BrowserVerifier·BackendVerifier의 동작을 변경하거나 공통 추상화를 과도하게 도입하지 않은 채 중복과 명명만 최소 정리한 후 회귀 테스트를 실행한다.
- [ ] 구현과 검증 과정에서 Worker sandbox permission profile, writable/readable path, network 범위를 추가하거나 완화하지 않는다.
- [ ] 설정 문제로 검증이 실패하면 변경 범위 안에서 최대 3회 수정·재검증하고, 계속 실패하면 인증·allowlist·sandbox 또는 검증 규칙을 우회하지 않고 Task를 실패 처리하여 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_frontend_verifier.py' -v`로 인증 성공, 인증 실패, 입력 allowlist, package 이름 검증, 고정 cwd·명령 배열, timeout, 출력·종료 코드 전달, 동시 요청과 CLI 동작을 검증한다.
- [ ] 관련 Harness lifecycle 및 Worker invocation 테스트로 FrontendVerifier가 부모에서 시작·종료되고 Frontend Task에만 환경이 전달되며 안내 문구가 직접 npm 실행을 금지하는지 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -v`로 전체 Harness 테스트가 통과하고 기존 BrowserVerifier·BackendVerifier·formatter·Worker 실행에 회귀가 없는지 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 변경된 Python 모듈의 구문과 import 가능성을 검증한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`로 변경 범위의 후행 공백과 patch 형식 오류가 없는지 검증한다.
- [ ] 테스트 runner가 받은 모든 command가 `npm ls <검증된 package 이름...>` 또는 `npm run test:unit|typecheck|check` 중 하나이고 `cwd`가 저장소의 `frontend`이며 `shell=True` 또는 임의 문자열 실행이 사용되지 않았는지 검증한다.
- [ ] `.agents/scripts/worker_runner/config.toml`, 기존 BrowserVerifier·BackendVerifier, `frontend`, `backend`에 이 Task가 만든 변경이 없고 토큰·비밀정보·사용자 홈 경로를 코드나 테스트 fixture에 고정하지 않았는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- FrontendVerifier는 loopback, 실행별 토큰, 제한된 요청 크기와 고정 allowlist를 모두 적용해야 한다.
- Worker가 임의 npm command, flag, script, cwd 또는 shell 문자열을 부모에서 실행할 수 없어야 한다.
- 허용된 검증은 부모가 반환한 stdout·stderr, 종료 코드와 timeout 상태를 Worker CLI가 손실 없이 전달해야 한다.
- Frontend Task가 아닌 Worker에는 FrontendVerifier 연결 정보가 제공되지 않아야 한다.
- Worker sandbox permission profile과 기존 BrowserVerifier·BackendVerifier 동작이 변경되지 않아야 한다.
- Red → Green → Refactor 증거와 현재 전체 Harness 회귀 검증 결과가 실행 기록에 있어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Python 구문 검증 실패
- 인증 없이 부모 FrontendVerifier를 호출할 수 있음
- `npm install`, `npm exec`, `npx`, 임의 `npm run` script, 임의 option·경로·shell 문자열이 허용됨
- verifier가 loopback 외 주소에 바인딩되거나 Client가 비-loopback URL을 허용함
- Frontend 이외 Task에 verifier 연결 정보가 전달됨
- 부모의 실패·timeout·종료 코드가 성공으로 변환되거나 출력이 누락됨
- Worker sandbox 권한, readable/writable path 또는 network 범위를 확대함
- 기존 BrowserVerifier·BackendVerifier·formatter 동작을 변경하거나 회귀시킴
- 실제 토큰, 비밀정보, 사용자별 절대 경로를 코드·테스트·로그에 추가함
- 테스트 삭제, 단언 약화 또는 검증 우회
- 3회 수정 후에도 필수 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Worker sandbox 완화 또는 비활성화
- 기존 BrowserVerifier와 BackendVerifier의 통합·교체·공통 프레임워크 리팩터링
- Frontend package script, Vitest 설정, 제품 코드와 테스트 변경
- `npm install`, `npm ci`, `npm exec`, `npx`, Cypress 또는 임의 Frontend 명령의 부모 실행 지원
- CI/CD, Coverage, Browser Mode와 새 외부 서비스 도입
- 기존 사용자 홈 `.npmrc`, `.npm` 또는 상위 `node_modules`에 Worker 읽기·쓰기 권한 추가

#### 작업 결과

`none`

#### 남은 문제

- 새 FrontendVerifier가 실제 Worker sandbox 밖 부모 경계에서 `npm run test:unit`, `npm run typecheck`, `npm run check`를 실행하는 최종 통합 증거는 이 Plan 완료 후 새로운 Harness 프로세스로 `frontend-unit-test-01`을 재실행하여 확인한다.
- Frontend 의존성 설치 명령을 부모 verifier로 제공하는 것은 이번 allowlist와 제외 범위에 포함하지 않는다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 인증된 부모 FrontendVerifier가 네 가지 허용 계약만 실행하고 결과를 Worker에 정확히 전달해야 한다.
- 기존 BrowserVerifier, BackendVerifier와 Worker sandbox에 회귀나 권한 확대가 없어야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 관련 Architecture, Security 또는 Convention과 충돌함
- 인증·allowlist·loopback·timeout·종료 코드 전달 계약이 충족되지 않음
- Worker sandbox 또는 기존 verifier 경계를 완화함
- 남은 문제가 사용자 확인 없이 방치됨
