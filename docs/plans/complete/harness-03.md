# 작업 계획: harness-03

## 1. 기본 정보

### 사용자 요청

현재 `worker_runner`와 `harness-exec` 구조를 기준으로 책임이 혼합된 모듈만 분리하고, 과도한 폴더·파일 분할은 피한다. 머지 과정에서 제거된 Browser verifier는 다시 도입하지 않으며, 목표 폴더명·파일명·함수명을 실제 코드와 맞게 구체화한다.

### 작업 목적

현재 코드에서 실제로 큰 변경 이유를 함께 가진 `invocation.py`, `runner.py`, `backend_verifier.py`, `frontend_verifier.py`, Harness `execution.py`를 중심으로 경계를 정리한다. 이미 한 책임으로 분리된 작은 모듈은 유지하고, 단순 forwarding 또는 함수 하나만 소유하는 module을 만들지 않는다. 공개 facade, Worker Prompt 의미, Backend·Frontend verifier CLI, Harness 상태·증거 schema, Report와 Notion 동작은 유지한다.

Browser verifier 실행 경로, adapter, 환경 변수, Prompt section과 전용 테스트는 제거된 현재 상태를 기준선으로 삼고 이 Plan에서 복원하지 않는다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.agents/skills/harness-exec/SKILL.md`

### 현재 상태 검토

- `worker_runner`는 `config.py`, `codex_cli.py`, `environment.py`, `toolchain_paths.py`로 설정·명령·환경·Toolchain 책임이 이미 분리되어 있으므로 별도 `runtime/` package로 다시 옮기지 않는다.
- `invocation.py`는 213줄이며 호출 JSON 검증과 실행 Context 외에 Markdown section 로딩, Prompt 조립과 결과 계약 생성을 함께 담당한다.
- `runner.py`는 233줄이며 `execute_worker()`가 임시 산출물, subprocess, 결과·로그 읽기, Hook와 cleanup을 함께 조정한다.
- `backend_verifier.py`는 570줄이며 Gradle 검증, formatter, single-flight server, HTTP client와 CLI를 함께 담당해 가장 큰 분리 대상이다.
- `frontend_verifier.py`는 271줄이며 npm verifier server, HTTP client와 CLI가 함께 있다.
- Harness는 `models.py`, `plan.py`, `plan_parser.py`, `state.py`, `evidence.py`, `report.py`, `notion.py`, `scheduling.py`, `worker_gateway.py`, `worker_result.py`가 이미 책임별로 분리되어 있어 `contracts/`, `planning/`, `persistence/`, `reporting/` 폴더를 추가하지 않는다.
- Harness `execution.py`는 167줄이며 Worker 1회 실행·판정 교정·증거 저장과 병렬 coordinator가 함께 있다.
- 현재 Harness 단위 테스트 71개 중 evidence 저장·복원 관련 3개가 실패한다. 이 실패는 Task 4의 기존 Red 증거로 유지하고 구조 변경과 함께 원인을 수정한다.
- `run-browser-verifier.py`, `worker_runner/browser_verifier.py`, `test_browser_verifier.py`는 현재 존재하지 않으며 실행 코드에도 Browser verifier 참조가 없다.

### 목표 폴더 구조

아래는 이 Plan에서 새로 만들거나 책임을 바꾸는 파일만 구체화한 구조다. 표시하지 않은 현재 파일은 이름과 위치를 유지한다.

```text
.agents/scripts/worker_runner/
├── __init__.py                     # 공개 facade: parse_invocation, execute_worker
├── invocation.py                   # 호출 JSON, 실행 Context와 parse_invocation
├── prompt.py                       # Markdown section 로딩, Prompt와 결과 계약 조립
├── runner.py                       # execute_worker 실행 순서 조정
├── worker_process.py               # 임시 산출물, subprocess, 출력·로그와 Hook 수명주기
├── backend_verifier.py             # 기존 Backend CLI 경로용 adapter
├── frontend_verifier.py            # 기존 Frontend CLI 경로용 adapter
└── verifiers/
    ├── __init__.py
    ├── transport.py                # loopback URL 검증과 인증 JSON 요청
    ├── backend_service.py          # Gradle 실행, single-flight server와 환경 계약
    ├── backend_formatting.py       # formatter scope, 임시 workspace와 결과 반영
    ├── backend_client.py           # Backend 검증·format 요청
    ├── frontend_service.py         # npm 입력 검증, 실행과 server 수명주기
    └── frontend_client.py          # Frontend 검증 요청

.agents/skills/harness-exec/scripts/harness_runner/
├── execution.py                    # 병렬 coordinator와 전체 ExecutionReport 조립
└── task_executor.py                # Worker 1회 실행, 판정 교정과 evidence 저장

.agents/skills/harness-exec/tests/
├── test_worker_invocation.py
├── test_worker_prompt.py
├── test_worker_runner_command.py
├── test_worker_runner_environment.py
├── test_worker_runner_toolchain.py
├── test_backend_verifier.py
├── test_frontend_verifier.py
├── test_harness_task_executor.py
└── test_harness_runner_modules.py
```

### 파일·함수 명명 및 분할 원칙

- `invocation.py`의 공개 함수는 `parse_invocation()`으로 유지하고, CLI 호환 입력 함수가 계속 사용되면 `read_invocation()` 이름도 유지한다.
- `prompt.py`는 `load_prompt_sections()`, `build_worker_prompt()`, `build_result_contract()`를 소유한다. Markdown I/O, Prompt 순서, JSON 결과 예시라는 하나의 Prompt 생성 흐름 밖의 책임을 넣지 않는다.
- `runner.py`의 공개 함수는 `execute_worker()`로 유지한다. `worker_process.py`는 `run_worker_process()`, `read_worker_output()`, `read_worker_log_tail()`과 Hook 실행을 소유하고 Harness 정책을 해석하지 않는다.
- `verifiers/transport.py`는 `validate_loopback_http_url()`과 `post_json()`처럼 Backend·Frontend가 실제로 공유하는 HTTP 규칙만 소유한다. Gradle, npm 또는 formatter 규칙을 공통화하지 않는다.
- `backend_service.py`는 `BackendVerifier`와 `validate_gradle_arguments()`, `backend_formatting.py`는 `FormatterScope`와 `BackendFormatter`, `backend_client.py`는 `request_backend_verification()`과 `request_backend_formatting()`을 소유한다.
- `frontend_service.py`는 `FrontendVerifier`와 `validate_npm_arguments()`, `frontend_client.py`는 `request_frontend_verification()`을 소유한다.
- top-level `backend_verifier.py`, `frontend_verifier.py`는 기존 import 및 직접 실행 경로를 유지하는 adapter이며 `main()` 외 domain 구현을 복제하지 않는다.
- Harness `task_executor.py`는 `execute_task()` 한 번의 호출, 판정 교정과 evidence 저장을 소유한다. `execution.py`의 공개 함수 `execute_workers()`는 pool, 준비 Task 제출, 완료 수집과 `ExecutionReport` 조립만 담당한다.
- 현재 이름이 책임을 정확히 나타내는 Harness의 `models.py`, `plan.py`, `plan_parser.py`, `state.py`, `evidence.py`, `report.py`, `notion.py`, `scheduling.py`, `worker_gateway.py`, `worker_result.py`는 이동하거나 wrapper로 감싸지 않는다.
- 새 module은 위에 명시한 책임이 실제로 분리될 때만 생성한다. 전달만 하는 함수, 소비자 하나뿐인 범용 utility, `helpers.py` 또는 `utils.py`는 만들지 않는다.

---

## 2. 실행 Task

### Task 1. Worker 호출 입력과 Prompt 생성 분리

#### 선행 Task

- `없음`

#### 작업 목적

`invocation.py`에서 Markdown I/O와 Prompt 생성을 `prompt.py`로 분리하되 호출 검증, Prompt section 순서와 최종 결과 계약을 그대로 유지한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner/cli.py`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/backend_verifier.py`
- `.agents/scripts/worker_runner/frontend_verifier.py`
- `.agents/skills/harness-exec/scripts/harness_runner` (`cli.py` 제외)
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: 필수 field, 실행 mode, prior TDD evidence, 판정 교정, Markdown section 누락·중복, section 순서와 기존 반환값을 고정하는 `test_worker_invocation.py`, `test_worker_prompt.py` 실패 테스트를 먼저 작성한다.
- [ ] Green: `invocation.py`에는 호출 JSON·실행 Context 검증과 `parse_invocation()` 조합만 남긴다.
- [ ] Green: `prompt.py`에 `load_prompt_sections()`, `build_worker_prompt()`, `build_result_contract()`를 구현하고 `worker-prompt.md`를 유일한 정적 안내 문구 원본으로 유지한다.
- [ ] Browser verifier Prompt section이나 실행 안내를 다시 추가하지 않고, Frontend 안내의 Browser 자동 검증 금지 의미를 유지한다.
- [ ] 파일·section 오류는 원인을 보존한 구체적 오류로 한 번 변환하고, Prompt builder는 file I/O를 직접 수행하지 않게 한다.
- [ ] 이전 private helper와 중복 상수를 제거하되 `parse_invocation()` 반환 tuple과 `worker_runner` 공개 facade를 변경하지 않는다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_invocation.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_prompt.py'`를 통과한다.
- [ ] `rg -n "browser-verification-guidance|run-browser-verifier|FLOW_BI_BROWSER_VERIFIER" .agents/scripts/worker_runner .agents/skills/harness-exec/tests` 결과가 없어야 한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- `HARNESS-03-R1`: 호출 검증과 Prompt 생성의 변경 이유가 `invocation.py`, `prompt.py`로 분리되어야 한다.
- 기존 Prompt 의미, section 순서, 경로 계약과 공개 반환값이 유지되어야 한다.
- Browser verifier가 다시 도입되지 않아야 한다.
- Mandatory Gate가 모두 PASS이고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 호출 거부 조건, Prompt 의미, section 순서 또는 반환 contract 변경
- 정적 Prompt 문구가 Python 상수와 Markdown에 중복됨
- Browser verifier 실행 경로 또는 환경 계약 복원
- 테스트 약화·TDD 누락·범위 위반 또는 `quality_score` 기준 미달

#### 제외 범위

- Worker subprocess와 verifier 내부 구조 변경
- Worker 최종 JSON field 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Worker process 수명주기 분리

#### 선행 Task

- `Task 1`

#### 작업 목적

`runner.py`에서 임시 산출물, subprocess, 출력·로그 읽기와 Hook 실행을 `worker_process.py`로 옮기고 `execute_worker()`는 실행 순서와 결과 조정만 담당하게 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/worker-prompt.md`
- `.agents/scripts/worker_runner/backend_verifier.py`
- `.agents/scripts/worker_runner/frontend_verifier.py`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: 명령 인자, 환경 복사, 임시 파일, JSON 오류, 16 KiB 로그 tail, timeout, Hook, 성공·실패 cleanup을 기존 Worker 테스트와 추가 실패 테스트로 고정한다.
- [ ] Green: `worker_process.py`에 `run_worker_process()`, `read_worker_output()`, `read_worker_log_tail()`과 Hook subprocess 경계를 이동한다.
- [ ] Green: 임시 출력·로그의 생성과 cleanup을 하나의 context-managed 수명주기로 묶고 성공·실패·timeout에서 동일하게 정리한다.
- [ ] `runner.py`의 `execute_worker()`는 config, Codex 명령, 환경, Toolchain과 process 호출 순서만 조정하고 subprocess 세부 예외를 반복 catch하지 않는다.
- [ ] 이미 응집된 `config.py`, `codex_cli.py`, `environment.py`, `toolchain_paths.py`는 이름과 위치를 유지하며 별도 `runtime/` package로 이동하지 않는다.
- [ ] 외부 process·Hook 격리 경계의 broad exception은 허용 결과와 로그 근거를 명시하고 원인 exception을 보존한다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_command.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_environment.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_toolchain.py'`를 통과한다.
- [ ] Task 1의 `build_worker_prompt()` 결과를 `execute_worker()` 입력으로 사용하는 경계 테스트로 Prompt와 process 분리 간 충돌·회귀가 없는지 확인한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- `HARNESS-03-R2`: `execute_worker()`와 process 수명주기의 변경 이유가 `runner.py`, `worker_process.py`로 분리되어야 한다.
- 기존 권한, 환경, timeout, Hook, 로그 tail, 최종 JSON과 cleanup 계약이 유지되어야 한다.
- 단순 forwarding wrapper 또는 역할 없는 runtime package가 없어야 한다.
- Mandatory Gate가 모두 PASS이고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Worker 권한 확대, timeout·로그·cleanup·결과 의미 변경
- `runner.py`와 `worker_process.py`가 같은 subprocess 예외를 중복 변환함
- 기존 응집 모듈을 다시 잘게 나누거나 불필요하게 이동함
- 테스트 약화·TDD 누락·범위 위반 또는 `quality_score` 기준 미달

#### 제외 범위

- verifier server·client와 Harness 실행 정책 변경
- 실제 Codex network 실행 검증

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. Backend·Frontend verifier service와 client 분리

#### 선행 Task

- `Task 2`

#### 작업 목적

Backend·Frontend verifier의 server, 실행 규칙, HTTP client와 CLI 책임을 `verifiers` package로 분리한다. Backend formatter만 별도 module로 두고 두 verifier가 실제로 공유하는 loopback HTTP 처리만 공통화한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/worker-prompt.md`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: Gradle/npm 허용 인자, timeout, formatter 경로 범위, single-flight, loopback URL·token, request 크기, server 수명주기와 CLI 종료 코드를 기존 Backend·Frontend 테스트로 고정한다.
- [ ] Green: `backend_service.py`에 `BackendVerifier`, `validate_gradle_arguments()`와 Gradle single-flight를 이동한다.
- [ ] Green: `backend_formatting.py`에 `FormatterScope`, `BackendFormatter`와 임시 workspace 적용을 이동하고 Task 경로 계약 밖 파일을 거부한다.
- [ ] Green: `frontend_service.py`에 `FrontendVerifier`, `validate_npm_arguments()`와 npm 실행을 이동한다.
- [ ] Green: `backend_client.py`, `frontend_client.py`에 domain별 request 함수를 두고 `transport.py`의 `validate_loopback_http_url()`, `post_json()`만 공유한다.
- [ ] top-level `backend_verifier.py`, `frontend_verifier.py`는 기존 import와 직접 실행 경로를 보존하는 `main()` adapter로 유지하며 server·client 구현을 복제하지 않는다.
- [ ] Browser verifier package, adapter, 환경 변수와 전용 테스트를 만들지 않는다.
- [ ] service는 subprocess 오류를 domain 결과로, client는 network 오류를 client 오류로 변환하고 adapter `main()`에서만 메시지와 종료 코드로 바꾼다.
- [ ] `verifiers/windows_acl.py`에서 Harness 실행 cohort의 Windows ACL을 Worker 시작 전에 캡처하고, 병렬 Task가 모두 종료된 뒤 변경된 ACL만 원래 값으로 복원한다.
- [ ] ACL 복원은 Worker 성공·실패·timeout과 무관하게 실행하며 복원 실패를 숨기지 않고 Harness 실패로 전달한다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_backend_verifier.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_frontend_verifier.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_windows_acl_verifier.py'`를 통과하며 정상·예외·병렬 cohort와 복원 실패 후 ACL 계약을 검증한다.
- [ ] Task 2가 유지한 Worker 환경에 Backend·Frontend verifier 연결 정보가 함께 전달되는 경계 테스트로 process와 verifier 분리 간 충돌·회귀가 없는지 확인한다.
- [ ] `rg -n "BrowserVerifier|browser_verifier|FLOW_BI_BROWSER_VERIFIER|run-browser-verifier" .agents/scripts .agents/skills/harness-exec` 결과에 실행 코드·Prompt·테스트 참조가 없어야 한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- `HARNESS-03-R3`: server, formatter, client, transport와 CLI adapter의 책임이 목표 파일에 맞게 분리되어야 한다.
- 기존 Backend·Frontend 허용 입력, 인증정보 비노출, timeout, single-flight, 결과와 CLI 경로가 유지되어야 한다.
- transport 외 Backend·Frontend 내부 import가 없어야 하며 공통 module에 Gradle/npm 규칙이 들어가지 않아야 한다.
- Browser verifier 제거 상태가 유지되어야 한다.
- Mandatory Gate가 모두 PASS이고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Gradle/npm/formatter 허용 범위 확대, 경로 탈출 또는 인증정보 노출
- timeout, single-flight, 결과 형식 또는 CLI 호환 경로 변경
- Backend와 Frontend가 서로의 service/client 구현에 의존함
- Browser verifier 코드·Prompt·테스트 복원
- 테스트 약화·TDD 누락·범위 위반 또는 `quality_score` 기준 미달

#### 제외 범위

- 제품 Frontend·Backend와 package manager·Gradle 정책 변경
- 로컬 Browser 테스트 자산 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. Harness 단일 Task 실행 분리 및 통합 검증

#### 선행 Task

- `Task 3`

#### 작업 목적

Harness `execution.py`에서 Worker 1회 실행·판정 교정·evidence 저장을 `task_executor.py`로 분리하고, 현재 실패 중인 evidence 저장·복원 계약을 수정한다. 이미 분리된 Plan, 상태, scheduling, Report와 Notion module은 유지한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs`
- `frontend`
- `backend`

#### 구현 항목

- [ ] Red: 현재 실패하는 PASS evidence 원자 저장, 저장 실패의 명시적 Task 실패, `--from-task` 선행 PASS 복원 3개 테스트가 의도한 이유로 실패함을 기록한다.
- [ ] Red: Worker timeout·process 실패·결과 contract 실패·판정 교정 1회·상태 실패·의존 차단과 병렬 순서를 책임별 회귀 테스트로 고정한다.
- [ ] Green: `task_executor.py`의 `execute_task()`가 Worker 1회 실행, 판정 교정, `TaskResult` 변환과 PASS evidence 저장을 한 경계에서 처리하게 한다.
- [ ] Green: evidence 저장 실패를 성공으로 처리하지 않고 구체적인 실패 reason을 반환하며, 신뢰 가능한 동일 fingerprint PASS record만 복원한다.
- [ ] `execution.py`의 `execute_workers()`는 ThreadPool, 준비 Task 제출, 완료 수집, 상태 전이와 `ExecutionReport` 조립만 담당한다.
- [ ] 현재 `models.py`, `plan.py`, `plan_parser.py`, `state.py`, `evidence.py`, `report.py`, `notion.py`, `scheduling.py`, `worker_gateway.py`, `worker_result.py`는 이름과 위치를 유지하고 새 하위 package나 forwarding wrapper를 만들지 않는다.
- [ ] Task executor는 외부 Worker/process 경계에서만 예상 실패를 `TaskResult`로 변환하고, state/evidence 원인 exception과 traceback을 보존한다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_task_executor.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`를 통과하며 현재 evidence 관련 실패 3개가 모두 Green이어야 한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_exec.py'`를 통과한다.
- [ ] Task 1~3의 Worker facade와 Backend·Frontend adapter를 Harness gateway·CLI에서 사용하는 통합 테스트로 모듈 이동 간 충돌·회귀가 없는지 확인한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'` 전체를 통과한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- `HARNESS-03-R4`: 단일 Task 실행과 병렬 coordinator가 `task_executor.py`, `execution.py`로 분리되어야 한다.
- 현재 evidence 관련 실패 3개와 전체 Harness 테스트가 모두 PASS여야 한다.
- 정상·재개·실패·차단·timeout·병렬, 상태·증거 schema, Report·Notion 동작이 유지되어야 한다.
- 기존에 응집된 Harness 모듈을 불필요한 하위 package로 이동하지 않아야 한다.
- Mandatory Gate가 모두 PASS이고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- PASS evidence 누락, 저장 실패 성공 처리 또는 신뢰할 수 없는 evidence 복원
- 실패한 Task의 후속 Task 실행, 병렬·상태 전이 또는 Report·Notion 동작 회귀
- coordinator에 Worker 결과 검증·evidence 저장 세부 구현이 남음
- 책임 없는 wrapper, 새 범용 utility 또는 순환 import 생성
- 테스트 약화·TDD 누락·범위 위반 또는 `quality_score` 기준 미달

#### 제외 범위

- 병렬도, 재시도, 상태·증거 schema와 신뢰 정책 변경
- Worker·verifier 추가 변경
- Product Spec, API, DB, 배포와 외부 의존성 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- `HARNESS-03-R1`부터 `HARNESS-03-R4`까지 모두 충족되어야 한다.
- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- 목표 구조의 새 module은 명시한 한 가지 변경 이유를 가져야 하고 기존 응집 모듈은 유지되어야 한다.
- 공개 `parse_invocation`, `execute_worker`, Backend·Frontend verifier CLI와 Harness CLI 계약이 유지되어야 한다.
- Browser verifier 실행 경로, adapter, 환경 변수, Prompt section과 전용 테스트가 없어야 한다.
- Worker Prompt, 권한, timeout, 로그, cleanup, verifier 입력·single-flight, 상태·증거 schema, Report와 Notion 동작이 유지되어야 한다.
- 현재 evidence 관련 실패 3개를 포함한 전체 Harness 테스트가 통과해야 한다.
- 새 외부 의존성, 새 최상위 디렉터리, 제품 Frontend·Backend·API·DB 변경이 없어야 한다.
- 각 Task의 변경이 수정 가능 경로를 벗어나지 않고 수정 금지 경로를 침범하지 않아야 한다.
- 모든 Mandatory Gate가 PASS이고 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 검증 명령 또는 Mandatory Gate가 실패함
- Browser verifier 또는 Harness 기반 Browser 자동 검증 경로가 다시 추가됨
- 공개 facade, CLI, Prompt, 상태·증거 schema, Report 또는 Notion 계약이 변경됨
- 과도한 package 중첩, 한 함수만 전달하는 module, 범용 helper 집합 또는 순환 import가 생김
- 서로 다른 domain 규칙을 무리하게 공통화하거나 같은 책임이 여러 파일에 중복됨
- 사용 중인 코드가 잘못 제거되거나 테스트 삭제·단언 약화·검증 우회가 발생함
- Task별 수정 가능 경로 밖 또는 수정 금지 경로가 변경됨
- 관련 Product Spec 또는 Design Doc과 충돌함
- 새 외부 의존성이나 미승인 Architecture·제품 동작 변경이 도입됨
- 전체 `quality_score`가 `90` 미만임
