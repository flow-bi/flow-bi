# 작업 계획: harness-02

## 1. 기본 정보

### 사용자 요청

`worker_runner/codex.py`에 혼재하여 사용 방법을 파악하기 어려운 책임을 명확한 모듈로 분리하고, 저장소에서 실제로 필요한 코드와 사용되지 않는 코드 및 공개 인터페이스를 구분하여 정리한다.

### 작업 목적

Codex CLI 명령 구성, 외부 Toolchain 읽기 경로 탐색, Worker subprocess 환경 구성과 Task 번호 검증을 각각 하나의 변경 이유를 가진 모듈로 분리한다. `runner.py`에는 Worker 실행 조정만 남기고 저장소 전체 소비 관계로 필요성이 확인된 진입점만 유지하여, Worker 실행 계약을 바꾸지 않으면서 코드 탐색성과 유지보수성을 높인다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Codex CLI 탐색과 명령 구성 책임 분리

#### 선행 Task

- `없음`

#### 작업 목적

Codex 실행 파일과 홈 경로 탐색, `codex exec` 인자 및 권한 override 구성을 전용 모듈 경계로 이동하고 설정 변환 계약과 실제 호출 관계를 일치시킨다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/backend_verifier.py`
- `.agents/scripts/worker_runner/browser_verifier.py`
- `.agents/scripts/worker_runner/frontend_verifier.py`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: Codex 실행 파일 탐색 성공·실패, 기본 및 명시적 executable 선택, 출력 파일과 stdin 인자, write/read 권한 override 순서와 값이 기존 실행 의도대로 생성되는지를 고정하는 실패 테스트를 먼저 작성하고 결과를 기록한다.
- [ ] Green: 실행 파일·홈 탐색과 명령 조립을 전용 내부 모듈로 이동하고 `config.py`의 설정 변환 함수와 하나의 명시적 입력 계약으로 연결한다.
- [ ] `allowed_paths`, read-only 경로와 Toolchain readable 경로가 서로 덮어쓰이지 않고 최종 Codex `-c` 인자에 반영되도록 현재 호출부와 설정 함수 signature를 정렬한다.
- [ ] 저장소 전체 참조를 확인하여 실제 소비자가 없는 `WORKERS` 및 명령 구성 관련 package 재수출은 제거하고, 사용 중인 이름은 새 소유 모듈에서 직접 import하도록 갱신한다.
- [ ] Refactor: 경로와 명령 인자의 의미가 드러나는 이름으로 정리하고 코드 내용을 반복하는 주석과 중복 분기를 제거한 뒤 Red → Green → Refactor 명령 및 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner*.py'`로 Codex 탐색, 명령 인자, 권한 override와 오류 계약을 검증한다.
- [ ] `rg -n "WORKERS|resolve_codex_executable|resolve_codex_home|build_codex_command" .agents/scripts/worker_runner .agents/skills/harness-exec/tests`로 각 이름이 하나의 소유 모듈과 필요한 소비자에만 남았는지 확인한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`로 변경한 Python 모듈의 구문과 import 가능성을 검증한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`로 patch 형식과 후행 공백을 검증한다.

#### 완료 조건

- `HARNESS-02-R1`: Codex CLI 탐색과 명령 구성이 환경 구성 및 Toolchain 탐색 코드와 분리되어야 한다.
- `HARNESS-02-R2`: 저장소에서 소비되지 않는 `WORKERS`와 불필요한 package 재수출이 남지 않아야 한다.
- write/read 권한과 Codex 명령 인자의 기존 의미가 유지되고 관련 회귀 테스트가 통과해야 한다.
- 적용 가능한 Mandatory Gate가 모두 PASS이고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- Codex executable 탐색 또는 `exec -o <output> ... -` 명령 계약이 달라짐
- write/read 권한 경로가 누락되거나 더 넓은 권한으로 변환됨
- 저장소에서 사용 중인 import를 미사용으로 판단하여 제거함
- 테스트나 compileall 실패, TDD 기록 누락 또는 검증 우회
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- `quality_score`가 기준 미달

#### 제외 범위

- `config.toml` 권한 정책과 Codex CLI 옵션의 기능 변경
- Worker subprocess 실행, 로그, 결과 파일 및 timeout 처리 변경
- Verifier 구현 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 외부 Toolchain 읽기 경로 탐색 책임 분리

#### 선행 Task

- `Task 1`

#### 작업 목적

Python, Node, npm, Git, Java와 OS별 패키지 설치 위치를 찾아 Worker read 권한 후보로 변환하는 책임을 전용 모듈로 분리하고, 필요한 경로와 중복·도달 불가능한 경로를 테스트 가능한 규칙으로 구분한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/backend_verifier.py`
- `.agents/scripts/worker_runner/browser_verifier.py`
- `.agents/scripts/worker_runner/frontend_verifier.py`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: Python 실행 파일, PATH의 Node/npm/Git, `JAVA_HOME`, Homebrew `Cellar`·`opt`, Windows Git 루트, 사용자 Git 설정과 상위 `package.json` 경로의 정상·누락·중복·OS 경계를 고정하는 실패 테스트를 먼저 작성하고 결과를 기록한다.
- [ ] Green: package root 판별 helper와 `collect_worker_readable_paths`를 Toolchain 경로 탐색 전용 모듈로 이동하고 명령 구성 모듈이 완성된 문자열 경로 목록만 입력받게 한다.
- [ ] 파일과 디렉터리 존재 여부가 필요한 후보를 구분하고, 동일 경로의 최초 발견 순서를 유지하면서 중복을 제거하는 규칙을 명시적인 helper로 정리한다.
- [ ] 저장소 참조와 경계 테스트에서 필요성이 입증되지 않는 후보·helper·분기를 제거하되 Windows, macOS 및 기본 POSIX Toolchain 접근에 필요한 경로는 유지한다.
- [ ] Refactor: 중첩된 `add` 함수와 OS별 분기를 읽기 쉬운 단위로 정리하고 숨은 전역 의존성을 주입 가능한 입력으로 바꾼 뒤 Red → Green → Refactor 명령 및 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner*.py'`로 Toolchain 경로 탐색의 OS별 정상·누락·중복 경계를 검증한다.
- [ ] Toolchain 경로 목록을 Task 1의 명령 구성 경계에 입력하는 테스트로 선행 Task의 권한 인자 계약과 충돌하거나 회귀하지 않는지 검증한다.
- [ ] `rg -n "_npm_package_root|_homebrew_package_root|_homebrew_opt_package_root|collect_worker_readable_paths" .agents/scripts/worker_runner .agents/skills/harness-exec/tests`로 경로 탐색 구현과 소비자가 전용 경계에만 남았는지 확인한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`로 변경한 Python 모듈의 구문과 import 가능성을 검증한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`로 patch 형식과 후행 공백을 검증한다.

#### 완료 조건

- `HARNESS-02-R1`: Toolchain 탐색이 Codex 명령 구성과 subprocess 환경 변경 없이 독립적으로 검증 가능해야 한다.
- `HARNESS-02-R2`: 필요성이 확인된 OS별 경로 규칙만 남고 중복 경로가 결과에 포함되지 않아야 한다.
- 기존 Windows, macOS 및 POSIX Toolchain 읽기 경로 의미와 발견 순서가 유지되어야 한다.
- 적용 가능한 Mandatory Gate가 모두 PASS이고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 기존 지원 OS에서 필요한 Python, Node, npm, Git 또는 Java 관련 경로가 누락됨
- 존재하지 않는 경로를 무조건 추가하거나 동일 경로가 중복됨
- Toolchain 탐색 모듈이 Codex command 또는 subprocess 실행을 직접 수행함
- 테스트나 compileall 실패, TDD 기록 누락 또는 검증 우회
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- `quality_score`가 기준 미달

#### 제외 범위

- 새로운 Toolchain 또는 패키지 관리자 지원 추가
- Worker 파일시스템 권한 정책 변경
- Codex CLI 명령과 subprocess 환경 변수 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. Worker 실행 환경 분리 및 통합 검증

#### 선행 Task

- `Task 2`

#### 작업 목적

Task 번호 검증, Java 환경 해석, Gradle·npm 임시 경로와 자식 프로세스 환경 구성을 전용 모듈로 이동하고 `runner.py` 및 package export를 실제 소비 계약에 맞춰 통합하여 비대해진 `codex.py`를 제거한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/backend_verifier.py`
- `.agents/scripts/worker_runner/browser_verifier.py`
- `.agents/scripts/worker_runner/frontend_verifier.py`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: Task 번호의 bool·비정수·0 이하 거부, base environment 복사, npm·Gradle 임시 경로, 프로젝트 `JAVA_HOME`, PATH 중복 방지, 부모 세션 전달, 부모 전용 Notion 및 permission 환경 제거 계약을 고정하는 실패 테스트를 먼저 작성하고 결과를 기록한다.
- [ ] Green: `_read_project_java_home`, `validate_task_number`, `build_subprocess_environment`와 환경 관련 상수를 Worker 실행 환경 전용 모듈로 이동한다.
- [ ] `runner.py`가 명령 구성, Toolchain 경로 탐색, 환경 구성 모듈을 직접 조합하도록 import를 정리하되 임시 출력·로그 생성과 정리, timeout, 결과 JSON 파싱 및 logger 호출 순서는 유지한다.
- [ ] 저장소 전체 import를 기준으로 package `__init__.py`에는 외부 소비가 확인된 `execute_worker`와 `parse_invocation` 계약만 유지하고 내부 helper·상수의 불필요한 재수출을 제거한다.
- [ ] 모든 책임과 소비자가 새 소유 모듈로 이동한 뒤 `codex.py`와 호환용 전달 wrapper를 제거하고 이전 import가 저장소에 남지 않도록 갱신한다.
- [ ] Refactor: Worker 실행 경로의 import 방향을 단방향으로 정리하고 함수별 입력·출력과 오류 소유권이 이름에서 드러나게 한 뒤 Red → Green → Refactor 명령 및 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner*.py'`로 환경 구성과 mocked Worker 실행의 정상·오류·timeout·정리 계약을 검증한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`로 `worker_runner` 공개 진입점과 Harness 호출 경계가 통합되는지 검증한다.
- [ ] `rg -n "worker_runner\.codex|from \.codex|WORKERS|read_config_overrides" .agents/scripts/worker_runner .agents/skills/harness-exec` 결과에 이전 모듈 import, 미사용 상수와 오래된 설정 함수명이 남지 않았는지 확인한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 통합된 Python 모듈의 구문과 import 가능성을 검증한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`로 patch 형식과 후행 공백을 검증한다.

#### 완료 조건

- `HARNESS-02-R1`: `codex.py`의 명령, Toolchain 경로 및 환경 책임이 각각 독립 모듈로 이동하고 기존 파일이 제거되어야 한다.
- `HARNESS-02-R2`: package export에는 저장소 외부 소비가 확인된 Worker 실행과 호출문 파싱 진입점만 남아야 한다.
- `HARNESS-02-R3`: Worker 명령, 환경, timeout, 로그 격리, 결과 파싱·정리 및 Harness 호출의 외부 동작이 유지되어야 한다.
- 적용 가능한 Mandatory Gate가 모두 PASS이고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- `codex.py` 또는 동일 책임을 다시 모은 대체 단일 모듈이 남음
- `execute_worker` 또는 `parse_invocation` package 진입점이 깨짐
- 환경 변수, 임시 경로, timeout, 로그·결과 파일 정리 또는 logger 호출 순서가 달라짐
- 부모 전용 환경변수가 Worker 자식 프로세스에 전달됨
- 테스트나 compileall 실패, TDD 기록 누락 또는 검증 우회
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- `quality_score`가 기준 미달

#### 제외 범위

- Worker 실행 기능, 재시도, timeout 값 또는 로그 보관 정책 변경
- 상태·증거 schema, Harness Task 스케줄링과 Report 동작 변경
- Verifier 구현, 제품 Frontend·Backend·API·DB 변경
- 새로운 외부 의존성 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- `HARNESS-02-R1`부터 `HARNESS-02-R3`까지 모든 요구사항이 충족되어야 한다.
- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- `codex.py`의 책임이 명령 구성, Toolchain 경로 탐색, 환경 구성 모듈로 분리되고 기존 파일이 제거되어야 한다.
- 저장소에서 사용되는 Worker package 진입점과 기존 실행 동작이 유지되어야 한다.
- 확인된 미사용 코드와 재수출만 제거되고 추정에 의한 삭제가 없어야 한다.
- 각 Task의 수정 범위가 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 검증 명령 또는 Mandatory Gate가 실패함
- `codex.py`의 혼재 책임이나 불필요한 package 재수출이 남음
- Worker 실행, Harness 연동, 권한 경로, 환경 변수 또는 임시 파일 정리 계약에 회귀가 발생함
- 저장소에서 사용 중인 코드가 미사용으로 잘못 제거됨
- 테스트 삭제, 단언 약화, 검증 우회 또는 기존 사용자 변경을 덮어써서 통과시킴
- Task별 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 새로운 의존성이나 미승인 기능 변경이 도입됨
- 관련 Product Spec 또는 Design Doc의 확정 계약과 충돌함
- 전체 `quality_score`가 `85` 미만임
