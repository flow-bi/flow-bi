# 작업 계획: harness-04

## 1. 기본 정보

### 사용자 요청

새 기능을 추가하지 않고 Worker 분리 이후의 기존 코드와 전체 함수 호출 흐름을 정리한다. 불필요하게 전달되는 값과 부자연스러운 호출 시점을 제거하고 파일과 책임을 재배치한다. Harness가 Worker에 필요한 공통 Prompt와 실행 계약을 완성해 전달하되, Worker별 실행·종료 로그·검증 방식과 운영 지침은 Worker runner가 소유하게 한다. Task 종류에 따라 필요한 Worker 지침만 선택해 전달하고, Worker 경로 권한에서 접근 금지를 뜻하는 이름 대신 실제 동작인 읽기 전용 의미를 사용하며, 과도하게 분리하지 않은 유지보수 가능한 폴더 구조로 다듬는다.

### 작업 목적

기존 실행 결과와 외부 계약을 보존하면서 Harness가 Plan을 읽어 Task별 공통 Prompt·실행 context·결과 계약을 완성한 뒤 Worker runner를 호출하고 결과와 상태를 저장하기까지의 단방향 호출 경계를 확립한다. `forbidden_paths`라는 이름과 실제 `read` 권한의 불일치를 제거하고, Worker runner에는 권한·환경·명령·subprocess·종료 로그, 제한된 verifier와 Worker 운영 지침을 남긴다. Harness는 Task 경로에 맞는 Worker 지침만 선택해 조립하며 coordinator·단일 Task 실행·상태 저장의 책임과 호출 시점을 자연스럽게 정리한다. 새 파일과 타입은 기존 로직을 옮기고 묶기 위한 내부 추출 경계일 뿐 새로운 제품 기능이나 공개 API가 아니다.

### 작업 유형

- refactor
- test

### 변경 성격과 동작 보존 계약

- 이 Plan은 기존 코드를 정리하고 파일·함수·호출 책임을 분리하는 비기능 내부 리팩터링이다. 사용자 기능, Harness CLI 옵션, Active Plan 형식, 제품 공개 API와 외부 서비스는 추가하지 않는다.
- 새 파일·클래스·함수는 흩어진 기존 실행 준비와 조정 로직을 추출한 내부 구현 수단이다. 기존에 없던 실행 경로, verifier, 권한 또는 상태를 만들기 위한 확장 지점으로 사용하지 않는다.
- 권한 정책, verifier 허용 명령, timeout, 로그·Hook·cleanup, Task 준비·실행·판정 교정 순서, evidence·상태·Report·Notion·Plan 완료 의미는 변경 전의 유효 동작과 결과를 유지한다.
- 반복 제거는 같은 값을 계산하거나 전달하는 횟수와 소유 위치만 바꾼다. 계산 결과, 적용 순서, 실패 유형, 민감정보 격리와 최소 권한 의미는 바꾸지 않는다.
- 구조를 옮기기 전에 기존 테스트를 실행하고 부족한 characterization test로 현재 의도된 동작을 고정한다. 각 Red는 사용자 동작이 아니라 책임 위치·중복 호출·내부 의존 방향의 구조 조건에서 실패해야 하며, Green에서는 기존 동작 단언을 유지하는 최소 이동만 수행한다.
- `PlanStateStore`의 잘못된 Plan ID 처리처럼 이미 존재하는 계약에서 이탈한 부분은 기존 계약으로 되돌리는 회귀 복구로만 다룬다. 새 오류 유형, 입력 규칙 또는 상태 정책은 추가하지 않는다.
- 동작 의미 변경이 필요하다고 발견되면 이 Plan에서 구현하지 않고 남은 문제로 기록해 사람의 결정을 요청한다.
- `forbidden_paths`를 `read_only_paths`로 정리하는 작업은 실제로 이미 적용되는 read-only 권한을 정확히 표현하는 내부 계약 이름 변경이다. 경로의 접근 가능 범위나 쓰기 권한은 확대·축소하지 않는다.

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/plans/_template.md`

### 현재 확인된 문제

- `harness_runner.worker_gateway`가 Harness의 `TaskInvocation`을 JSON으로 직렬화한 뒤 `worker_runner.parse_invocation()`으로 다시 파싱하여 Prompt를 만드는 불필요한 왕복 변환이 있다.
- `worker_runner`가 Harness 정책인 공통 Prompt section, Task 실행 mode, 이전 TDD evidence와 결과 JSON 계약을 해석·생성하여 의존 방향이 뒤집혀 있다.
- `worker_runner.__init__`가 Harness 전용 `parse_invocation()`을 공개하고 Harness가 이를 import하므로 Worker 실행 facade와 Harness 조립 책임이 섞여 있다.
- Plan의 `수정 금지 경로`는 Worker가 읽을 수 있고 쓸 수만 없는 경로인데, 내부 모델과 payload에서는 `forbidden_paths`로 전달되어 접근 금지처럼 해석된다.
- Harness CLI, Plan model, gateway, Worker runner, Codex config, verifier와 Windows ACL까지 동일한 경로 목록이 서로 다른 이름으로 반복 전달된다.
- `collect_worker_readable_paths()`가 모든 Task에서 거의 같은 Python·Java·Node·npm·Git 설치 경로를 다시 탐색하여 Worker cohort 공통 runtime 정보가 매 호출마다 재생성된다.
- `execute_worker()`가 project root, executable, base environment, timeout과 Toolchain 경로 준비까지 매 Task마다 조정하여 cohort 공통 값과 Task별 값의 구분이 없다.
- 단일 Task의 Worker 호출·판정 교정·evidence 저장은 분리되었지만, 예외 변환과 상태 전이의 소유권 및 호출 순서가 coordinator와 자연스럽게 맞물리는지 회귀 검증이 부족하다.
- `PlanStateStore._parts()`의 유효하지 않은 Plan ID 검증이 제거되어 계약된 `StateRecordError` 대신 예기치 않은 예외가 발생할 수 있다.

### 목표 폴더 구조

```text
.agents/scripts/worker_runner/
├── runtime.py                 # cohort 공통 WorkerRuntime 준비와 Task별 실행 facade
├── runner.py                  # Worker 설정·명령·process 실행 순서 조정
├── worker_process.py          # 임시 파일, subprocess, 출력과 로그 수명주기
├── worker_log.py              # 로그 tail과 완료 Hook
├── worker-guidance.md         # Worker 실행·Backend/Frontend 검증 운영 지침 원본
├── config.py                  # writable/read-only 권한 config 생성
├── codex_cli.py               # Codex 명령 생성
├── environment.py             # Worker 환경 생성
├── paths.py                   # Worker 물리 경로 계산
├── toolchain_paths.py         # Toolchain 읽기 경로 탐색
├── backend_verifier.py        # Worker용 Backend verifier CLI
├── frontend_verifier.py       # Worker용 Frontend verifier CLI
└── verifiers/                 # Backend·Frontend verifier 구현

.agents/skills/harness-exec/scripts/harness_runner/
├── cli.py                     # 전체 실행 수명주기와 외부 자원 정리
├── plan_parser.py             # 문서 표현을 실행 모델로 변환
├── models.py                  # Harness 실행 계약
├── worker_prompt.py           # Harness 공통 Prompt와 선택된 Worker 지침 조립
├── worker-prompt.md           # 실행 context·판정 교정 등 Harness 정책 원본
├── execution.py               # 병렬 scheduling과 결과 수집
├── task_executor.py           # 단일 Task 호출·교정·evidence 저장
├── scheduling.py              # 준비·차단 Task 계산
├── state.py                   # Task 상태 저장
├── worker_gateway.py          # 완성된 Prompt와 경로 계약을 Worker runner에 전달
└── 나머지 기존 모듈          # 현재 책임과 위치 유지
```

- 이미 한 가지 변경 이유를 가진 작은 모듈은 새 하위 package로 옮기지 않는다.
- 단순 forwarding만 하는 wrapper나 함수 하나만 위한 추가 파일은 만들지 않는다.
- `worker_runner`는 실행·종료 처리와 verifier 기술, `harness_runner`는 Plan·Task·Prompt 정책을 소유하며 의존 방향은 `harness_runner → worker_runner`만 허용한다.
- Worker의 도구 사용법, Backend·Frontend verifier 호출법과 종료 처리 지침은 `worker_runner`가 소유하고 Harness는 내용을 재정의하지 않는다.
- Harness는 Task의 writable 경로를 기준으로 Backend·Frontend 지침을 선택하며 관련 없는 Worker 지침을 모든 Task에 일괄 전달하지 않는다.
- Toolchain 경로는 모든 Worker가 공유하지만 Codex sandbox 실행 기술이므로 `worker_runner`가 탐색·검증한다. Harness는 경로 목록을 해석하거나 수정하지 않고 Worker가 준비한 불변 `WorkerRuntime`을 cohort 전체에서 재사용한다.
- cohort 공통 값은 project root, Codex executable/home, 정리된 base environment, Toolchain read 경로와 timeout이고, Task별 값은 run ID, Task 번호, writable/read-only 경로, verifier 환경 override, output/log 경로와 최종 Prompt다.

### 함수 배치 결정

#### Harness가 소유할 함수와 이유

| 모듈 | 함수·타입 | 결정 | 이유 |
| --- | --- | --- | --- |
| `invocation.py` | `parse_invocation()` | Harness 유지 | 사용자의 Harness 실행 요청과 `--from-task`를 해석하며 Worker process와 무관하다. |
| `plan.py` | `repository_root()`, `load_active_plan()`, `_complete_path()`, `complete_plan()` | Harness 유지 | Active Plan의 조회·완료 이동은 전체 실행 수명주기 정책이다. |
| `plan_parser.py` | `_task_region()`, `_common_prompt()`, `_detail_sections()`, `_section_body()`, `_bullet_values()`, `_prerequisite_numbers()`, `_minimum_quality_score()`, `parse_plan_text()` | Harness 유지 | Markdown Plan을 `Task` 계약으로 변환하는 기능이며 Worker가 문서 구조를 알면 안 된다. |
| `models.py` | `Task`, `ParsedPlan`, `HarnessRequest`, `TaskInvocation`, `TaskExecutionContext`, `VerificationResult`, `TaskResult`, `ExecutionReport` | Harness 유지 | Plan·실행·판정·보고 계약이다. Worker runner는 이 타입을 import하지 않고 원시 실행 입력과 `WorkerExecutionResult`만 다룬다. |
| `worker_prompt.py` | `load_harness_prompt_sections()`, `load_worker_guidance_sections()`, `select_worker_guidance()`, `validate_execution_context()`, `build_result_contract()`, `build_worker_prompt()` | Harness로 이동·구성 | Harness 정책과 Worker가 제공한 운영 지침을 Task별로 선택하여 최종 Prompt를 만드는 책임이다. |
| `worker_gateway.py` | `invoke_task()` 및 cohort용 gateway 생성 함수 | Harness 유지 | `TaskInvocation`을 최종 Prompt와 Task별 runtime 입력으로 바꾸는 유일한 adapter다. JSON 왕복 파싱은 제거한다. |
| `execution.py` | `_restore_from_evidence()`, `execute_workers()` | Harness 유지 | 선행 evidence 복원, 병렬 제출과 결과 수집은 여러 Worker를 조정하는 책임이다. |
| `scheduling.py` | `restore_succeeded_tasks()` | Harness 유지 | 저장된 성공 상태를 현재 실행 상태로 복원하는 coordinator 정책이다. |
| `scheduling.py` | `block_failed_dependents()`, `ready_task_numbers()`, `enqueue_ready_tasks()` | Harness에서 graph 기반 구조로 통합 | 소유 위치는 유지하되 매 완료마다 전체 Task를 재검색하지 않도록 cohort에서 만든 reverse dependent index의 전이 method로 대체한다. |
| `task_executor.py` | `_worker_output()`, `_record_failure()`, `execute_task()` | Harness 유지 | Worker 결과를 Task 계약으로 판정하고 교정 호출과 evidence 저장을 결정한다. |
| `worker_result.py` | `return_code()`, `_non_empty_text()`, `_report_contract_error()`, `objective_completion_error()`, `completion_error()`, `needs_decision_correction()`, `decision_correction()`, `task_result_from_worker()` | Harness 유지 | 결과 schema, Mandatory Gate, 판정 교정은 Harness 완료 정책이다. |
| `evidence.py` | `_json_bytes()`, `revision_fingerprint()`, `_valid_evidence()`, `_valid_record()`, `ExecutionRecordStore` 메서드 | Harness 유지 | Task revision과 TDD evidence의 신뢰·저장 정책이다. |
| `state.py` | `PlanStateStore`의 `_parts()`, `path_for()`, `_lock_for()`, `_validate_task_record()`, `_validate_document()`, `_read()`, `_task_key()`, `load_task_records()`, `update()`, `_write()` | Harness 유지·단순화 | Plan Task 상태 schema와 원자적 저장은 coordinator 상태 관리다. document 전체를 반환하는 public `load()` wrapper는 제거하고 `load_task_records()`가 한 번 읽어 현재 Plan records만 반환한다. |
| `report.py` | 상태·검증·이슈 rendering helper와 `build_execution_report()` | Harness 유지 | 여러 Worker 결과를 한 실행 Report로 조립한다. |
| `notion.py` | 환경 조회, 게시 Prompt와 `publish_report()` | Harness 유지 | 전체 Report 게시이며 Worker별 실행이나 로그 책임이 아니다. Codex executable은 WorkerRuntime이 준비한 값을 받아 중복 탐색하지 않는다. |
| `cli.py` | `_print_console()`, `_print_failure()`, `main()` | Harness 유지 | Plan, WorkerRuntime, verifier, ACL, Report와 완료 이동의 cohort 수명주기를 연다. |

#### Worker runner가 소유할 함수와 이유

| 모듈 | 함수·타입 | 결정 | 이유 |
| --- | --- | --- | --- |
| `runtime.py` | `WorkerRuntime`, `prepare_worker_runtime()` | Worker 내부로 추출 | Codex executable/home, base environment, base config, Toolchain read 경로와 timeout을 한 번 준비하는 기존 로직의 cohort 공통 Worker 실행 context다. Harness는 불변 runtime을 보관·재사용만 한다. |
| `runtime.py` | `WorkerRuntime.bind_task()`와 `WorkerTaskRuntime` | Worker 내부로 추출 | Task 번호·writable/read-only 경로·verifier override를 한 번 검증하고 Task permission config와 환경 delta를 고정하여 최초 실행과 판정 교정에서 재사용한다. |
| `runtime.py` | `WorkerTaskRuntime.execute()` | Worker 내부로 추출 | 최종 Prompt만 받아 시도별 run ID·환경 copy·output/log 경로를 만들고 내부 `runner.execute_worker()`를 호출한다. cohort·Task 공통 인자의 반복 전달을 없앤다. |
| `runner.py` | `execute_worker()` | Worker 유지·내부화 | 준비된 runtime과 Task별 입력으로 Codex 명령과 process 실행 순서만 조정한다. Harness model·Prompt policy·evidence를 해석하지 않는다. |
| `runtime.py` | 양의 Task 번호 검증 helper | `valids.py`에서 이동 | 공개 `WorkerRuntime.bind_task()` 경계에서 한 번만 검증하고 runner와 environment에는 검증된 문자열을 전달한다. |
| `paths.py` | `WorkerPaths`, `build_worker_paths()` | Worker 유지 | Gradle home, temp, Worker home과 npm cache는 Worker sandbox의 물리 경로다. |
| `environment.py` | `_read_project_java_home()` | Worker 유지 | Worker가 사용할 Java runtime을 저장소 설정에서 안전하게 읽는 실행 기술이다. cohort 준비 시 한 번 호출한다. |
| `environment.py` | `prepare_worker_base_environment()`, `build_task_environment()` 또는 동등 함수 | Worker 유지·분리 | CODEX_HOME·Java·cache·부모 전용 값 제거는 공통이고 run ID·Task 번호·검증된 verifier override는 시도별이므로 호출 시점을 분리한다. |
| `toolchain_paths.py` | `_npm_package_root()`, `_homebrew_package_root()`, `_homebrew_opt_package_root()`, `_append_unique_path()`, `_add_executable_paths()`, `_add_npm_paths()`, `_add_windows_git_roots()`, `collect_worker_readable_paths()` | Worker 유지 | OS별 Toolchain 설치 경로를 Worker sandbox read 권한으로 바꾸는 내부 기술이다. `prepare_worker_runtime()`만 호출하고 Task마다 재탐색하지 않는다. |
| `config.py` | `format_toml_key()`, `format_toml_value()`, `load_worker_config_template()`, `build_worker_config()`, `build_config_overrides()` | Worker 유지·분리 | base TOML read·검증은 cohort에서 한 번, writable/read-only/Toolchain 경로 merge는 Task copy에서 한 번, 문자열 command override 변환은 Task에서 한 번 수행한다. |
| `codex_cli.py` | `resolve_codex_executable()`, `resolve_codex_home()`, `build_codex_command()` | Worker 유지 | Codex 설치 탐색과 CLI 인자 생성은 Worker process adapter다. executable/home 탐색은 runtime 준비 시 한 번, command 생성은 Task마다 수행한다. |
| `worker_process.py` | `WorkerExecutionResult`, `read_worker_output()`, `_temporary_worker_artifacts()`, `_terminal_status()`, `run_worker_process()` | Worker 유지 | 한 Worker subprocess의 output/log 파일, 실행, JSON 읽기, 종료 상태와 cleanup 수명주기를 소유한다. |
| `worker_log.py` | `read_worker_log_tail()`, `with_worker_log_tail()`, `invoke_worker_completion_hook()` | Worker 유지 | 각 Worker 종료 시 bounded 로그와 관찰용 Hook을 기록하며 Harness Task 판정에는 관여하지 않는다. |
| `backend_verifier.py`, `frontend_verifier.py` | 각 `main()` | Worker 유지 | Worker subprocess가 호출하는 제한된 verifier CLI 진입점이다. |
| `verifiers/backend_client.py` | `_request()`, `request_backend_verification()`, `request_backend_formatting()` | Worker 유지 | Worker와 부모 verifier service 사이 loopback client 계약이다. |
| `verifiers/backend_formatting.py` | `_within()`, `BackendFormatter.scope()`, `targets()`, `format()`, `_contract_path()`, `_create_workspace()`, `_apply_workspace()`, `_timeout_output()` | Worker 유지 | Task 경로 안에서만 포맷하는 Worker 검증 실행 기술이다. |
| `verifiers/backend_service.py` | `validate_gradle_arguments()`, `BackendVerifier`의 environment·single-flight·Gradle·formatter·server lifecycle 메서드 | Worker 유지 | 허용 명령과 Backend 검증 실행·공유 제어를 소유한다. service base environment는 초기화 시 한 번 정리하고 각 검증은 copy를 사용하며, Harness는 cohort 시작·종료 시점만 결정한다. |
| `verifiers/frontend_client.py` | `request_frontend_verification()` | Worker 유지 | Worker와 부모 Frontend verifier service 사이 client 계약이다. |
| `verifiers/frontend_service.py` | `validate_npm_arguments()`, `_resolve_npm_executable()`, `_timeout_output()`, `FrontendVerifier`의 environment·검증·server lifecycle 메서드 | Worker 유지 | 허용 npm 명령과 Frontend 검증 실행을 소유한다. npm executable과 service base environment는 초기화 시 한 번 준비하고 각 검증은 copy를 사용하며, Harness는 cohort 시작·종료 시점만 결정한다. |
| `verifiers/transport.py` | `validate_loopback_http_url()`, `post_json()` | Worker 유지 | verifier client의 loopback 전송 보안과 JSON 통신 구현이다. |
| `verifiers/windows_acl.py` | `WindowsAclBackend`, `worker_permission_paths()`, `_existing_paths()`, `preserve_windows_acls()` | Worker 유지, Harness가 호출 시점 소유 | Windows Worker sandbox 권한 계산·복원 기술은 Worker에 두되, 모든 병렬 Worker 전후로 한 번 실행하는 cohort 시점은 Harness CLI가 소유한다. |
| `worker-guidance.md` | 실행·종료·Backend/Frontend 검증 section | Worker 유지 | Worker가 실제로 사용할 도구와 verifier 운영법의 원본이다. Harness는 Task 경로에 필요한 section을 선택할 뿐 내용을 복제하지 않는다. |

#### 제거하거나 이동할 현재 함수

- `worker_runner.invocation.parse_invocation()`과 `read_invocation()`은 제거한다. Harness가 이미 보유한 `TaskInvocation`을 JSON으로 바꾸어 다시 읽을 이유가 없다.
- `worker_runner.execution_context`의 `_record_id()`, `_valid_prior_tdd_evidence()`, `build_execution_context()`와 mode 상수는 Harness `worker_prompt.py` 또는 Harness 실행 model로 이동한다.
- `worker_runner.prompt`의 `load_prompt_sections()`, `build_result_contract()`, `build_worker_prompt()`는 Harness `worker_prompt.py`로 이동하되 Worker 운영 지침 원본은 `worker-guidance.md`에 남긴다.
- `worker_runner.valids.validate_task_number()`는 `runtime.py`의 private `bind_task()` 경계 검증으로 이동하고 `valids.py`는 제거한다.
- `worker_runner.__init__`는 `WorkerRuntime`, `WorkerTaskRuntime`, `prepare_worker_runtime()`만 공개한다. internal runner와 Harness 정책 helper는 재수출하지 않는다.

### 반복 제거 기준과 호출 시점

| 수명주기 | 한 번만 준비할 값·동작 | 소유 위치 | 반복하지 않는 방법 |
| --- | --- | --- | --- |
| Harness 실행 cohort | repository root, Active Plan과 Task graph | `harness_runner.cli/plan/execution` | CLI에서 한 번 읽고 coordinator와 gateway에 객체로 전달하며 Worker gateway가 `repository_root()`를 다시 호출하지 않는다. |
| Harness 실행 cohort | Harness Prompt policy section과 Worker guidance section parsing | `harness_runner.worker_prompt` | 불변 `WorkerPromptTemplate` 또는 동등 객체를 한 번 만들고 Task별 render에서 재사용한다. 파일 read와 Markdown section validation을 Worker 호출마다 반복하지 않는다. |
| Harness 실행 cohort | Codex executable/home, Worker 물리 경로, project Java home, cache 디렉터리 준비, 정리된 base environment | `worker_runner.runtime/environment/paths/codex_cli` | `prepare_worker_runtime()`이 한 번 계산·생성하고 immutable runtime에 저장한다. |
| Harness 실행 cohort | Python·Java·Node·npm·Git Toolchain read 경로 | `worker_runner.toolchain_paths` | 준비된 base environment로 한 번 탐색하여 runtime에 tuple로 저장한다. Harness와 Task 호출은 목록을 다시 계산하거나 해석하지 않는다. |
| Harness 실행 cohort | `config.toml` read·syntax·permission profile validation | `worker_runner.config/runtime` | immutable base config template을 한 번 읽고, Task마다 깊은 복사본에 writable/read-only 경로만 병합한다. shared template을 직접 변경하지 않는다. |
| Harness 실행 cohort | Backend·Frontend verifier server와 Windows ACL snapshot | Worker verifier 구현, Harness CLI 호출 시점 | server는 pool 전 한 번 시작·종료하고 ACL은 모든 Worker 전 한 번 capture, 모든 Worker 후 한 번 restore한다. |
| Harness 실행 cohort | Codex executable | `worker_runner.runtime` 준비, Harness Notion 게시 재사용 | Worker 실행과 Notion 게시가 같은 실행 파일을 사용하며 Notion 단계에서 PATH를 다시 탐색하지 않는다. |
| Task | writable/read-only 경로, 관련 Backend/Frontend guidance, verifier environment, 결과 contract, revision fingerprint와 prior evidence | `harness_runner.worker_gateway/worker_prompt/execution` | `TaskWorkerContext` 또는 동등한 immutable Task 준비 객체를 Task당 한 번 생성해 최초 호출과 판정 교정 호출에서 재사용한다. |
| Task | Task permission config override와 Codex command의 고정 부분 | `worker_runner.runtime/config/codex_cli` | Task 경로가 서로 다르므로 Task당 한 번 생성하고, 판정 교정 시 output 경로처럼 시도별 값만 교체한다. |
| 실행 시도 | run ID, output/log 임시 파일, Task environment 복사본, subprocess와 종료 Hook | `worker_runner.runtime/worker_process/worker_log` | 격리와 추적을 위해 최초 실행과 판정 교정마다 새로 만든다. 이 반복은 제거 대상이 아니다. |
| 실행 시도 | 최종 Prompt 전달 | `harness_runner.worker_prompt/worker_gateway` | 별도 Codex process마다 Prompt 전달은 필요하다. 다만 공통 section parsing, Task guidance 선택과 결과 contract 생성은 캐시하고 판정 교정 delta만 새로 반영한다. |

- `worker_gateway.invoke_task()` 내부의 `repository_root()`, `os.environ.copy()`, `json.dumps(asdict(invocation))`, `parse_invocation()` 연쇄는 제거한다.
- 현재 `build_worker_config()`가 Task마다 `config.toml`을 다시 읽는 동작은 base template 1회 load와 Task copy·merge로 분리한다.
- 현재 `execute_worker()`가 Task마다 `resolve_codex_executable()`, `resolve_codex_home()`, `_read_project_java_home()`, `build_worker_paths()`와 `collect_worker_readable_paths()`를 반복하는 동작은 runtime 준비 1회로 이동한다.
- 현재 CLI의 Backend/Frontend 경로 판별과 `environment_for_task()` 호출은 Task당 한 번 준비하여 판정 교정 Worker 호출에서 반복하지 않는다.
- Backend·Frontend verifier service의 base subprocess environment와 npm executable은 service 초기화 시 한 번 준비하고 검증 요청마다 새 탐색이나 부모 환경 정리를 반복하지 않는다.
- `PlanStateStore`는 상태 document 전체를 반환한 뒤 다시 Plan key를 조회하는 public wrapper를 제거하고 현재 Plan의 Task records만 한 번에 반환한다.
- Notion 게시에는 WorkerRuntime에서 이미 검증한 Codex executable을 전달하여 동일 PATH 탐색을 반복하지 않는다.
- `common_prompt`와 Worker 운영 지침은 각 격리 process가 알아야 하므로 최종 Prompt에 포함하지만, 원본 read·section parse·정적 validation은 cohort에서 한 번만 수행한다.

---

## 2. 실행 Task

### Task 1. 읽기 전용 경로 계약 통일

#### 선행 Task

- `없음`

#### 작업 목적

Plan의 `수정 금지 경로`를 문서 경계에서 읽기 전용 경로로 해석하고, Harness부터 Worker 권한 config와 verifier까지 실제 의미가 드러나는 하나의 `read_only_paths` 계약으로 전달한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/worker-prompt.md`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: Plan parsing, Task model, invocation JSON, Worker command, verifier formatting scope와 Windows ACL에서 `수정 금지 경로`가 read-only 권한으로 유지되는 실패 테스트를 먼저 작성한다.
- [ ] Green: Markdown heading `수정 금지 경로`는 호환성을 위해 유지하되 `plan_parser.py`가 이를 `Task.read_only_paths`로 변환하고 이후 모델·payload·함수 인자·지역 변수 이름을 `read_only_paths`로 통일한다.
- [ ] Backend formatter의 수정 차단과 Backend·Frontend verifier 환경 범위도 `read_only_paths`라는 동일한 의미를 사용하며, 해당 경로의 읽기까지 차단하는 정책은 추가하지 않는다.
- [ ] writable 경로와 read-only 경로가 겹치면 기존처럼 write 권한이 우선하고, Toolchain read 권한 및 저장소 밖 경로 거부 계약은 유지한다.
- [ ] 이전 `forbidden_paths` 이름의 내부 소비와 JSON field를 모두 제거하고, 사용되지 않는 호환 alias나 중복 변환을 남기지 않는다.
- [ ] Refactor: Plan → Harness model → gateway → Worker runner → Codex config/ACL/verifier로 이어지는 경로 목록이 각 경계에서 한 번만 변환되도록 정리하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_exec.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_invocation.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_command.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*verifier.py'`를 통과한다.
- [ ] `rg -n "forbidden_paths" .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests` 결과가 없어야 한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 읽기 전용 경로가 접근 불가 또는 쓰기 가능으로 설정됨
- `forbidden_paths` 내부 계약이나 불필요한 호환 alias가 남음
- 테스트 또는 정적 검증 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Red → Green → Refactor 실행 기록 누락
- `quality_score`가 기준 미달

#### 제외 범위

- Plan Markdown의 `수정 금지 경로` heading 변경
- Worker 권한 확대와 기본 권한 profile 변경
- Product Spec, Design Doc, Architecture 또는 보안 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Worker cohort 공통 Runtime과 Toolchain 준비

#### 선행 Task

- `Task 1`

#### 작업 목적

모든 Worker가 공유하는 Codex 실행 파일·home, project root, Java·cache 기반 환경, Toolchain read 경로와 timeout을 Worker 소유의 불변 runtime으로 한 번 준비하고, Task별 실행 정보와 verifier 환경만 매 호출마다 격리해 생성한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/worker-prompt.md`
- `.agents/skills/harness-exec/SKILL.md`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: 하나의 Harness 실행에서 두 Task를 호출할 때 Codex executable/home, project Java home과 Python·Java·Node·npm·Git Toolchain 경로는 한 번만 준비되고 run ID·Task 번호·verifier 환경은 호출마다 달라지는 실패 테스트를 먼저 작성한다.
- [ ] Green: `runtime.py`에 불변 `WorkerRuntime`과 `prepare_worker_runtime()`을 구현하여 project root, Codex executable/home, 정리된 base environment, base config template, Toolchain read 경로와 기본 timeout을 cohort 시작 시 한 번 계산한다.
- [ ] `config.py`는 `config.toml` read·syntax·profile 검증으로 immutable base template을 만드는 함수와, base copy에 Task writable/read-only 및 Toolchain read 경로를 병합하는 함수를 분리한다.
- [ ] runtime은 검증된 base config template을 한 번 보관하고 Task permission config 생성 시 깊은 복사본만 변경하여 병렬 Worker 사이 권한 경로가 섞이지 않게 한다.
- [ ] `toolchain_paths.py`의 OS·package 경로 helper와 `collect_worker_readable_paths()`는 Worker에 유지하고 `prepare_worker_runtime()`만 호출하게 하며 Harness에는 탐색 결과나 OS 분기 로직을 노출하지 않는다.
- [ ] `environment.py`는 Java·cache·Codex home과 부모 전용 값 제거를 담당하는 공통 base 준비와, base를 복사해 run ID·검증된 Task 번호·Task별 verifier override를 넣는 실행 환경 생성을 분리한다.
- [ ] Task 환경은 매 호출 새 dict로 생성하여 병렬 Worker끼리 run ID, Task 번호, Backend/Frontend verifier URL·token이 누출되지 않게 한다.
- [ ] `WorkerRuntime`, `WorkerTaskRuntime`과 오류·로그 표현에는 전체 environment, verifier token과 URL credential을 포함하지 않으며 민감한 Task별 연결 값은 subprocess environment에만 주입한다.
- [ ] 현재 Worker 실행이 내부적으로 보호하는 `CODEX_HOME`, `JAVA_HOME`, `PATH`, temp/cache 경로, `FLOW_BI_RUN_ID`, `FLOW_BI_TASK_NUMBER`, `CODEX_PERMISSION_PROFILE`의 우선순위를 그대로 유지하고, 기존에 사용하는 verifier 연결 값만 Task별 환경 delta로 병합한다. 새로운 외부 override 입력이나 거부 정책은 추가하지 않는다.
- [ ] `WorkerRuntime.bind_task()`는 Task 번호, writable/read-only 경로와 verifier override를 한 번 검증하여 immutable `WorkerTaskRuntime`을 만들고, Task permission config·command 고정 부분과 환경 delta를 최초 호출과 판정 교정에서 재사용한다.
- [ ] Task 번호는 `WorkerRuntime.bind_task()`에서 양의 정수로 한 번만 검증하고 environment builder와 internal runner에는 검증된 문자열을 전달하며, `valids.py`의 단일 helper module과 중복 검증을 제거한다.
- [ ] `WorkerTaskRuntime.execute()`는 최종 Prompt만 받아 시도별 run ID·환경 copy·output/log를 생성하고, project root·executable·base environment·timeout·Toolchain과 Task 경로를 반복 인자로 받지 않게 한다.
- [ ] Harness CLI 또는 gateway는 `prepare_worker_runtime()`을 Worker pool 생성 전에 한 번 호출하고 같은 immutable runtime을 모든 future에서 공유하되 내부 필드의 의미를 해석하거나 변경하지 않는다.
- [ ] Windows ACL 대상 경로는 WorkerRuntime의 검증된 base config와 전체 Task writable/read-only 합집합으로 한 번 계산하여 ACL 준비를 위해 `config.toml`을 다시 읽지 않는다.
- [ ] Refactor: `prepare_worker_runtime → toolchain/environment/config/codex resolution`, `WorkerRuntime.bind_task → Task config`, `WorkerTaskRuntime.execute → runner → command/process`의 단방향 호출을 유지하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] Worker runtime characterization test로 현재 보호 값 우선순위와 verifier 환경 결과를 먼저 고정하고, 공통 준비 1회, Task binding 1회, 두 Task의 독립 환경과 immutable runtime 공유를 검증한다.
- [ ] Worker config 테스트로 `config.toml`은 cohort에서 한 번만 읽고 두 Task의 writable/read-only 경로가 서로 다른 copy에만 반영되는지 검증한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_toolchain.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner_environment.py'`를 통과한다.
- [ ] Harness gateway와 WorkerRuntime 통합 테스트로 여러 Task가 하나의 runtime을 재사용하면서 Task별 verifier 환경만 받는지 검증한다.
- [ ] ACL 경로 계산 테스트로 WorkerRuntime의 base config를 재사용하며 별도의 config file read가 발생하지 않는지 검증한다.
- [ ] `rg -n "collect_worker_readable_paths\(" .agents/scripts/worker_runner` 결과는 `toolchain_paths.py`의 정의와 `runtime.py`의 단일 소비만 포함해야 한다.
- [ ] `rg -n "validate_task_number" .agents/scripts/worker_runner` 결과는 `runtime.py`의 private Task binding 경계와 호출만 포함하고 `valids.py`는 존재하지 않아야 한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Toolchain·Codex·Java 공통 탐색이 Task마다 반복됨
- `config.toml` read·profile 검증이 Task마다 반복되거나 Task permission merge가 shared base config를 변경함
- Toolchain 탐색 또는 sandbox permission 해석이 Harness로 이동함
- 병렬 Task 사이 run ID, Task 번호 또는 verifier token이 공유·누출됨
- Task override가 runtime 보호 환경 값을 덮어씀
- 공통 runtime 인자가 모든 `execute_worker()` 호출에 반복 전달됨
- 최초 실행과 판정 교정에서 동일 Task의 permission config·경로·verifier 환경을 다시 준비함
- 테스트 또는 정적 검증 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Red → Green → Refactor 실행 기록 누락
- `quality_score`가 기준 미달

#### 제외 범위

- 지원 Toolchain 종류, 탐색 경로와 read 권한 의미 변경
- Worker timeout 기본값과 cache 디렉터리 위치 변경
- Backend·Frontend verifier 허용 명령과 token 정책 변경
- Harness Prompt, scheduling, evidence와 상태 저장 구현 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. Harness 공통 Prompt와 실행 계약 소유권 이전

#### 선행 Task

- `Task 2`

#### 작업 목적

Harness가 `TaskInvocation`으로부터 공통 안내, Task 지시, 실행 context와 결과 JSON 계약을 완성하고 Worker runner에는 실행 가능한 최종 Prompt와 경로 계약만 전달하도록 의존 방향을 바로잡는다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: Harness가 완성된 Prompt를 만들고 Worker runner가 Harness 모델·JSON을 해석하지 않는 소유권 계약의 실패 테스트를 먼저 작성한다.
- [ ] Green: 실행 mode·이전 evidence·판정 교정 등 Harness 정책 section과 실행 context 검증·결과 계약 builder를 `harness_runner`가 소유하도록 이동하고 `TaskInvocation`을 직접 입력으로 최종 Prompt를 생성한다.
- [ ] `WorkerPromptTemplate` 또는 동등한 불변 객체가 Harness policy와 Worker guidance 파일을 cohort에서 한 번 읽어 section 누락·중복·순서를 검증하고 이후 Task render에서 재사용되게 한다.
- [ ] Worker 실행과 Backend·Frontend verifier 사용법 section은 `worker_runner/worker-guidance.md`에 남기고, Harness Prompt builder는 Task writable 경로에 해당하는 지침만 읽어 최종 Prompt에 포함한다.
- [ ] 모든 Task에 필요한 Worker 실행·종료·결과 제출 지침은 항상 한 번 포함하고, Backend·Frontend verifier 지침만 Task writable 경로에 따라 선택한다.
- [ ] Backend Task에는 Backend 검증·formatting 지침만, Frontend Task에는 Frontend 검증 지침만, 양쪽 경로를 수정하는 Task에는 두 지침을 포함하며 관련 없는 지침은 전달하지 않는다.
- [ ] Task별 선택된 Worker guidance, 결과 contract와 `WorkerRuntime.bind_task()`가 반환한 `WorkerTaskRuntime`을 `TaskWorkerContext` 또는 동등 객체로 한 번 준비하고 최초 Worker 호출과 판정 교정 호출에서 재사용한다.
- [ ] cohort에서 생성한 gateway는 repository root, WorkerRuntime, Prompt template과 Task context map을 보유하고 `invoke_task()`에서 `repository_root()`, `os.environ.copy()`, 경로 종류 판별과 verifier environment 생성을 반복하지 않는다.
- [ ] `worker_gateway.invoke_task()`는 `TaskInvocation`을 JSON으로 직렬화하지 않고 Harness의 Prompt builder를 직접 호출한 뒤 최종 Prompt만 준비된 `WorkerTaskRuntime.execute()`에 전달한다.
- [ ] `worker_runner`의 Harness 전용 `invocation.py`, `execution_context.py`, `prompt.py`를 제거하고 기존 `worker-prompt.md`는 Worker 운영 지침과 Harness 정책 section으로 분리하되 동일 구현을 forwarding wrapper나 재수출 alias로 남기지 않는다.
- [ ] `worker_runner.__init__`의 공개 계약은 `WorkerRuntime`, `WorkerTaskRuntime`, `prepare_worker_runtime()`만 유지하며 internal `execute_worker()`, Harness용 `parse_invocation()`과 Prompt helper를 재수출하지 않는다.
- [ ] 판정 교정 호출도 수정된 `TaskInvocation`으로 Harness가 새 Prompt를 완성하고, 최초 호출과 동일한 단방향 gateway를 사용한다.
- [ ] Refactor: 호출 방향을 `execution/task_executor → worker_gateway → worker_prompt + WorkerTaskRuntime.execute → internal runner`로 정리하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] Harness Prompt builder 단위 테스트로 section 누락·중복, 순서, 실행 mode, 이전 TDD evidence, 판정 교정, 결과 JSON 계약과 Task별 Worker 지침 선택을 검증한다.
- [ ] 두 Task와 한 번의 판정 교정 호출에서 Prompt/Worker guidance 원본은 한 번만 읽고, Worker guidance 선택·verifier 환경·결과 contract는 Task당 한 번만 준비되는지 호출 횟수로 검증한다.
- [ ] Harness gateway 통합 테스트로 JSON 왕복 없이 완성된 Prompt만 이미 준비된 `WorkerTaskRuntime.execute()`에 전달되는지 검증한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_worker*.py'`를 통과한다.
- [ ] `python -c "import sys; sys.path.insert(0, '.agents/scripts'); import worker_runner; assert sorted(worker_runner.__all__) == ['WorkerRuntime', 'WorkerTaskRuntime', 'prepare_worker_runtime']"`를 통과한다.
- [ ] `rg -n "parse_invocation|build_worker_prompt|build_execution_context" .agents/scripts/worker_runner` 결과가 없어야 하며 `worker-guidance.md`에는 Harness 실행 mode·evidence·판정 교정·결과 JSON 계약 section이 없어야 한다.
- [ ] `rg -n "json\.dumps\(asdict\(invocation\)" .agents/skills/harness-exec/scripts/harness_runner` 결과가 없어야 한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Harness가 `TaskInvocation`을 JSON으로 직렬화해 Worker에서 다시 파싱함
- Prompt/guidance 파일 read·section parsing 또는 Task별 guidance·verifier 환경·결과 contract 준비가 Worker 호출 시도마다 반복됨
- Worker runner가 Harness 공통 Prompt, 실행 mode, 이전 evidence 또는 결과 계약을 생성함
- Harness가 Worker 실행·verifier 지침을 중복 정의하거나 모든 Task에 관련 없는 지침까지 전달함
- `worker_runner`가 `parse_invocation` 또는 Prompt helper를 공개함
- Prompt section 순서, 실행 context, 판정 교정 또는 결과 JSON 의미 변경
- 테스트 또는 정적 검증 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Red → Green → Refactor 실행 기록 누락
- `quality_score`가 기준 미달

#### 제외 범위

- Worker 운영 지침과 결과 JSON schema의 의미 변경
- Worker subprocess, timeout, 종료 로그와 verifier 내부 구현 변경
- Harness scheduling, evidence와 상태 저장 흐름 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. Worker 실행·종료 로그·검증 경계 정리

#### 선행 Task

- `Task 3`

#### 작업 목적

Worker runner가 완성된 Prompt를 받아 권한·환경·명령을 구성하고 subprocess를 실행한 뒤 결과·bounded log tail·완료 Hook을 정리하며, Backend·Frontend verifier를 제한된 계약으로 제공하는 실행 기술 경계를 확립한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/skills/harness-exec/SKILL.md`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: 최종 Prompt 입력, Task별 권한·환경·명령, 정상·비정상 종료, timeout, bounded log tail, 완료 Hook, 임시 파일 cleanup과 verifier 제한 계약의 실패 테스트를 먼저 작성한다.
- [ ] Green: internal `execute_worker()`는 `WorkerTaskRuntime`이 제공한 검증된 Task 계약과 Harness가 완성한 Prompt를 변경 없이 받아 시도별 output 경로를 결합한 Codex 명령을 구성한다.
- [ ] `worker_process.py`는 output/log 임시 파일 생성부터 subprocess 실행, 결과 JSON 읽기, timeout·예외 log tail과 성공·실패·timeout 완료 Hook 호출 및 cleanup까지 한 Worker 수명주기를 소유한다.
- [ ] `worker_log.py`는 로그 tail과 Worker 종료 Hook만 소유하고 Harness의 Task 판정·evidence·상태를 해석하지 않는다.
- [ ] `worker-guidance.md`는 Worker 실행 방식, 종료 시 결과 제출, Backend·Frontend verifier와 formatter 사용법만 소유하고 Task별 Plan 내용·실행 mode·이전 evidence·판정 교정·결과 schema를 정의하지 않는다.
- [ ] Backend·Frontend verifier와 formatter는 허용된 명령·Task 경로·single-flight·Windows ACL 계약을 유지하며 Harness Prompt나 Task 상태를 생성하지 않는다.
- [ ] Backend·Frontend verifier service는 초기화 시 부모 전용 변수를 제거한 base subprocess environment와 executable을 한 번 준비하고, 각 검증 요청에서는 독립 copy에 요청별 값만 적용한다.
- [ ] Worker runner 내부에서 공통 Prompt, 실행 mode, 이전 TDD evidence, 판정 교정과 Harness 결과 계약을 재생성하거나 보완하지 않는다.
- [ ] Refactor: import 방향을 `runner → command/environment/process`, `process → log`, verifier CLI → verifier service로 유지하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner*.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_backend_verifier.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_frontend_verifier.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_windows_acl_verifier.py'`를 통과한다.
- [ ] Worker runner 실행·종료 처리와 verifier의 통합 경계 테스트를 통과한다.
- [ ] `rg -n "TaskInvocation|TaskExecutionContext|common_prompt|prior_tdd_evidence|decision_correction" .agents/scripts/worker_runner` 결과가 없어야 한다.
- [ ] Worker guidance section 테스트로 실행·종료·Backend·Frontend 지침은 Worker 쪽에 존재하고 Harness 정책 section은 존재하지 않는지 검증한다.
- [ ] 연속 Backend·Frontend 검증 테스트로 base environment 정리와 executable 탐색은 service당 한 번이고 요청별 환경 변경은 서로 누출되지 않는지 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Worker runner가 완성된 Prompt를 다시 해석하거나 변경함
- Worker 실행·종료·verifier 운영 지침이 Harness 코드에 중복 구현되거나 Worker 쪽에서 제거됨
- subprocess 결과·로그·Hook·cleanup이 둘 이상의 모듈에서 중복 처리됨
- 종료 상태별 Hook 또는 bounded log tail이 누락됨
- verifier가 허용 명령·Task 경로·single-flight 또는 ACL 계약을 우회함
- verifier가 동일 base environment 또는 executable을 요청마다 다시 준비하거나 요청별 환경을 공유함
- 테스트 또는 정적 검증 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Red → Green → Refactor 실행 기록 누락
- `quality_score`가 기준 미달

#### 제외 범위

- Harness Prompt, scheduling, evidence와 상태 저장 구현 변경
- timeout, 로그 tail 크기, verifier 허용 명령과 권한 정책의 의미 변경
- 새로운 verifier 또는 외부 서비스 추가

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. Harness 실행과 상태 전이 통합 검증

#### 선행 Task

- `Task 4`

#### 작업 목적

병렬 coordinator, 단일 Task executor, scheduling과 상태 저장의 호출 순서를 명확히 하여 Harness가 완성한 Prompt의 Worker 호출·판정 교정·evidence·상태가 한 번씩만 처리되게 한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: Worker 정상·비정상 종료, timeout, 예기치 않은 호출 예외, 판정 교정 1회, corrected output, evidence 저장 실패, 상태 저장 실패, 잘못된 Plan ID, 선행 Task 차단과 완료마다 전체 Task를 재검색하는 scheduling을 재현하는 실패 테스트를 먼저 작성한다.
- [ ] Green: `task_executor.py`가 Worker 1회 호출과 필요한 경우의 판정 교정 1회, 결과 계약 검증 및 PASS evidence 저장을 소유하고 모든 Worker 호출 결과를 현재 호출의 output 기준으로 변환한다.
- [ ] 예상 가능한 외부 process 실패와 예기치 않은 Worker 호출 실패가 ThreadPool future 밖으로 누출되어 Harness 전체를 중단하지 않고 원인을 보존한 실패 `TaskResult`로 변환되게 한다.
- [ ] `execution.py`는 fingerprint와 prior evidence를 Task당 한 번 조회한 뒤 실행 필요성이 확정된 Task의 `TaskInvocation`만 준비해 running으로 전이·제출하고, 최종 Prompt 생성은 gateway에 맡기며 완료 future 수집과 최종 상태 저장을 한 위치에서 수행한다.
- [ ] `scheduling.py`는 현재의 결정적 ready 순서, 직접·연쇄 blocked 결과와 상태 전이 시점을 characterization test로 고정한 뒤, Task graph와 역방향 dependent index를 cohort에서 한 번 준비하여 같은 결과를 내면서 매 완료마다 전체 Task를 다시 검색하지 않는다.
- [ ] scheduling은 상태 계산만 담당하고 동일 Task의 상태를 중복 갱신하지 않으며, 상태 저장 호출 시점은 coordinator 한 곳에 두고 저장 실패를 성공으로 숨기지 않는다.
- [ ] `PlanStateStore._parts()`가 잘못된 Plan ID를 계약된 `StateRecordError`로 거부하도록 복구하고, 상태 파일의 schema와 원자적 저장 계약을 유지한다.
- [ ] `PlanStateStore.load_task_records()`가 상태 document를 한 번 읽고 현재 Plan records만 반환하게 하며 document 전체를 노출하는 중복 public `load()` wrapper를 제거한다.
- [ ] CLI는 WorkerRuntime에서 이미 검증한 Codex executable을 `publish_report()`에 전달하여 Notion 게시 단계의 중복 PATH 탐색을 제거하되 게시 동작과 실패 정책은 변경하지 않는다.
- [ ] 공백만 바꾸거나 오류 메시지를 불필요하게 약화한 변경은 제거하고, Harness가 Worker runner 내부 helper를 역으로 import하지 않도록 한다.
- [ ] Refactor: CLI → execution coordinator → task executor → worker gateway, 그리고 coordinator → scheduling/state의 호출 방향을 유지하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_task_executor.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_exec.py'`를 통과한다.
- [ ] Harness coordinator, Prompt builder, gateway와 단일 Task executor의 통합 경계 테스트를 통과한다.
- [ ] 독립 Task와 다단계 의존 Task 테스트로 Task graph는 한 번 생성되고 완료·실패 전파가 영향받는 dependent만 방문하는지 검증한다.
- [ ] 상태 저장 테스트로 현재 Plan records를 한 번의 read 경로로 반환하고 document 전체를 노출하는 public API가 남지 않는지 검증한다.
- [ ] Notion 게시 통합 테스트로 WorkerRuntime의 Codex executable이 재사용되고 별도 executable 탐색이 호출되지 않는지 검증한다.
- [ ] `rg -n "from worker_runner import .*parse_invocation|worker_runner\.(invocation|execution_context|prompt)" .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests` 결과가 없어야 한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/scripts/harness_runner`를 통과한다.
- [ ] `git diff --check -- .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Worker 호출·판정 교정·evidence 또는 상태 저장이 중복 실행됨
- fingerprint·prior evidence가 Task당 반복 조회되거나 scheduling이 Worker 완료마다 전체 Task graph를 다시 검색함
- 상태 records 조회가 document load와 wrapper에서 중복되거나 Notion 게시가 Codex executable을 다시 탐색함
- Harness가 최종 Prompt 생성을 Worker runner에 위임하거나 Worker 내부 helper를 import함
- 예기치 않은 Worker 호출 예외가 future에서 누출되어 전체 Harness를 중단함
- 상태 저장 실패가 성공으로 보고되거나 잘못된 Plan ID가 `StateRecordError` 외 예외로 노출됨
- 테스트 또는 정적 검증 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Red → Green → Refactor 실행 기록 누락
- `quality_score`가 기준 미달

#### 제외 범위

- 최대 병렬 Worker 수와 Task 의존성 정책 변경
- evidence 또는 상태 JSON schema 변경
- Report, Notion 게시와 Active Plan 완료 이동 정책 변경
- 새로운 하위 package 또는 forwarding wrapper 추가

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- 새 사용자 기능, CLI 옵션, Plan 형식, 제품 공개 API, verifier 또는 외부 서비스가 추가되지 않아야 한다.
- 새 파일·타입·함수는 기존 로직의 추출과 재배치에만 사용되고, characterization test가 보장하는 기존 실행 결과와 실패 의미가 유지되어야 한다.
- Plan의 `수정 금지 경로`가 내부 실행 계약에서 read-only 권한으로 일관되게 해석되어야 한다.
- Harness가 공통 Prompt·실행 context·결과 계약을 완성하고 Task에 필요한 Worker 운영 지침만 선택해 준비된 `WorkerTaskRuntime.execute()`에 전달해야 한다.
- Worker runner가 실행·종료 로그·Hook·cleanup과 Backend·Frontend verifier 운영 지침을 소유하고 Harness 정책을 생성하지 않아야 한다.
- `worker_runner`와 `harness_runner` package import, Worker 호출, 병렬 실행, 판정 교정, evidence와 상태 저장 흐름이 정상 동작해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- 사용자 기능, CLI 옵션, Plan 형식, 제품 공개 API, verifier 또는 외부 서비스가 새로 추가됨
- 파일·함수 이동이나 반복 제거 과정에서 권한, verifier, timeout, 로그·Hook·cleanup, Task 순서, 상태·evidence·Report·Notion·Plan 완료 의미가 변경됨
- `forbidden_paths` 내부 계약이 남거나 read-only 경로의 실제 권한이 달라짐
- Harness와 Worker 사이 Prompt 책임이 역전되거나 Worker별 운영 지침이 잘못된 Task에 전달됨
- Worker 또는 Harness import와 호출 흐름이 깨짐
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- Product Spec, Design Doc, Architecture 또는 보안 최소 권한 원칙과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
