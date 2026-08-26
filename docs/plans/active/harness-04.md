# 작업 계획: harness-04

## 1. 기본 정보

### 사용자 요청

Worker 분리 이후의 전체 함수 호출 흐름을 점검하고, 불필요하게 전달되는 값과 부자연스러운 호출 시점을 정리한다. Worker 경로 권한에서 접근 금지를 뜻하는 이름 대신 실제 동작인 읽기 전용 의미를 사용하며, 과도하게 분리하지 않은 유지보수 가능한 폴더 구조로 다듬는다.

### 작업 목적

Harness가 Plan을 읽어 Task를 실행하고 결과와 상태를 저장하기까지의 호출 경계를 명확히 한다. 현재 import 단계에서 깨지는 Worker process 계약을 복구하고, `forbidden_paths`라는 이름과 실제 `read` 권한의 불일치를 제거하며, coordinator·단일 Task 실행·상태 저장의 책임과 호출 시점을 자연스럽게 정리한다.

### 작업 유형

- refactor
- bugfix
- test

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/plans/_template.md`

### 현재 확인된 문제

- `runner.py`가 `worker_process.py`에 존재하지 않는 `invoke_worker_logger`를 import하여 Worker invocation과 Harness 통합 테스트가 import 단계에서 실패한다.
- 실행 컨텍스트를 별도 모듈로 옮긴 뒤 기존 소비자가 사용하던 실행 mode 상수의 import 계약이 정리되지 않았다.
- Plan의 `수정 금지 경로`는 Worker가 읽을 수 있고 쓸 수만 없는 경로인데, 내부 모델과 payload에서는 `forbidden_paths`로 전달되어 접근 금지처럼 해석된다.
- Harness CLI, Plan model, gateway, Worker invocation, runner, Codex config, verifier와 Windows ACL까지 동일한 경로 목록이 서로 다른 이름으로 반복 전달된다.
- 단일 Task의 Worker 호출·판정 교정·evidence 저장은 분리되었지만, 예외 변환과 상태 전이의 소유권 및 호출 순서가 coordinator와 자연스럽게 맞물리는지 회귀 검증이 부족하다.
- `PlanStateStore._parts()`의 유효하지 않은 Plan ID 검증이 제거되어 계약된 `StateRecordError` 대신 예기치 않은 예외가 발생할 수 있다.

### 목표 폴더 구조

```text
.agents/scripts/worker_runner/
├── invocation.py              # JSON 입력 파싱과 Prompt 조립 경계
├── execution_context.py       # 실행 mode와 이전 TDD evidence 검증
├── runner.py                  # Worker 설정·명령·process 실행 순서 조정
├── worker_process.py          # 임시 파일, subprocess, 출력과 로그 수명주기
├── worker_log.py              # 로그 tail과 완료 Hook
├── config.py                  # writable/read-only 권한 config 생성
├── codex_cli.py               # Codex 명령 생성
├── environment.py             # Worker 환경 생성
├── toolchain_paths.py         # Toolchain 읽기 경로 탐색
└── verifiers/                 # Backend·Frontend verifier 구현

.agents/skills/harness-exec/scripts/harness_runner/
├── cli.py                     # 전체 실행 수명주기와 외부 자원 정리
├── plan_parser.py             # 문서 표현을 실행 모델로 변환
├── models.py                  # Harness 실행 계약
├── execution.py               # 병렬 scheduling과 결과 수집
├── task_executor.py           # 단일 Task 호출·교정·evidence 저장
├── scheduling.py              # 준비·차단 Task 계산
├── state.py                   # Task 상태 저장
├── worker_gateway.py          # Harness와 Worker runner adapter
└── 나머지 기존 모듈          # 현재 책임과 위치 유지
```

- 이미 한 가지 변경 이유를 가진 작은 모듈은 새 하위 package로 옮기지 않는다.
- 단순 forwarding만 하는 wrapper나 함수 하나만 위한 추가 파일은 만들지 않는다.
- `worker_runner`는 실행 기술, `harness_runner`는 Plan·Task 정책을 소유하는 현재 최상위 경계를 유지한다.

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
- [ ] Refactor: Plan → Harness model → gateway → Worker invocation → Codex config/ACL/verifier로 이어지는 경로 목록이 각 경계에서 한 번만 변환되도록 정리하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

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

### Task 2. Worker invocation과 process 수명주기 연결 복구

#### 선행 Task

- `Task 1`

#### 작업 목적

Worker 호출 입력, 실행 컨텍스트, 명령 생성, subprocess와 완료 Hook의 소유권을 명확히 하고 현재 깨진 import 계약과 불필요한 인자 전달을 복구한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/worker-prompt.md`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: package import, invocation parse, 실행 mode 상수, 명령 생성, 정상·오류·timeout·Hook·임시 파일 cleanup을 재현하는 실패 테스트를 먼저 작성한다.
- [ ] Green: `runner.py`가 실제 존재하는 공개 이름만 import하도록 고치고, 기본 완료 logger 선택은 process 수명주기 소유 모듈에서 처리하여 coordinator가 기본 구현을 불필요하게 전달하지 않게 한다.
- [ ] `execution_context.py`가 실행 mode와 이전 evidence 검증을 소유하고, `invocation.py`는 JSON field 추출과 Prompt 입력 조립만 담당하게 한다.
- [ ] 실행 mode 상수의 필요한 소비자는 소유 모듈에서 직접 import하게 하고, 이전 모듈을 통한 재수출이나 forwarding alias는 만들지 않는다.
- [ ] `execute_worker()`는 검증된 task number, 환경, Toolchain read 경로와 Task 경로 권한으로 명령을 한 번 구성한 뒤 `run_worker_process()`를 한 번 호출하며 process 세부 예외와 로그 처리를 중복 소유하지 않는다.
- [ ] `worker_process.py`가 output/log 임시 파일의 생성부터 cleanup, subprocess 예외의 bounded log tail, 완료 Hook 호출 시점을 일관되게 소유한다.
- [ ] Refactor: import 방향을 `runner → command/environment/process`, `process → log` 단방향으로 유지하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_invocation.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_runner*.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_prompt.py'`를 통과한다.
- [ ] Worker invocation과 process 수명주기의 통합 경계 테스트를 통과한다.
- [ ] `python -c "import sys; sys.path.insert(0, '.agents/scripts'); import worker_runner"`를 통과한다.
- [ ] `rg -n "invoke_worker_logger|from \.invocation import .*NEW_OR_CHANGED|from \.invocation import .*RERUN" .agents/scripts/worker_runner .agents/skills/harness-exec/tests` 결과가 없어야 한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`와 `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- `worker_runner` package 또는 Harness gateway import 실패
- 기본 logger, subprocess 예외 또는 cleanup이 둘 이상의 모듈에서 중복 처리됨
- Worker Prompt, timeout, output JSON 또는 Hook 의미 변경
- 테스트 또는 정적 검증 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Red → Green → Refactor 실행 기록 누락
- `quality_score`가 기준 미달

#### 제외 범위

- Worker Prompt 문구와 결과 JSON schema 변경
- timeout, 로그 tail 크기와 Hook 보관 정책 변경
- Backend·Frontend verifier 내부 구현 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. Harness 실행과 상태 전이 통합 검증

#### 선행 Task

- `Task 2`

#### 작업 목적

병렬 coordinator, 단일 Task executor, scheduling과 상태 저장의 호출 순서를 명확히 하여 Worker 결과·판정 교정·evidence·상태가 한 번씩만 처리되게 한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/SKILL.md`
- `docs/plans/active`
- `docs/plans/state`

#### 구현 항목

- [ ] Red: Worker 정상·비정상 종료, timeout, 예기치 않은 호출 예외, 판정 교정 1회, corrected output, evidence 저장 실패, 상태 저장 실패, 잘못된 Plan ID와 선행 Task 차단을 재현하는 실패 테스트를 먼저 작성한다.
- [ ] Green: `task_executor.py`가 Worker 1회 호출과 필요한 경우의 판정 교정 1회, 결과 계약 검증 및 PASS evidence 저장을 소유하고 모든 Worker 호출 결과를 현재 호출의 output 기준으로 변환한다.
- [ ] 예상 가능한 외부 process 실패와 예기치 않은 Worker 호출 실패가 ThreadPool future 밖으로 누출되어 Harness 전체를 중단하지 않고 원인을 보존한 실패 `TaskResult`로 변환되게 한다.
- [ ] `execution.py`는 evidence 조회 후 실행 필요성이 확정된 Task만 running으로 전이·제출하고, 완료 future 수집과 최종 상태 저장을 한 위치에서 수행한다.
- [ ] `scheduling.py`는 ready·blocked 계산만 담당하고 동일 Task의 상태를 중복 갱신하지 않으며, 상태 저장 실패는 성공으로 숨기지 않는다.
- [ ] `PlanStateStore._parts()`가 잘못된 Plan ID를 계약된 `StateRecordError`로 거부하도록 복구하고, 상태 파일의 schema와 원자적 저장 계약을 유지한다.
- [ ] 공백만 바꾸거나 오류 메시지를 불필요하게 약화한 변경은 제거하고, `execution.py`, `task_executor.py`, `scheduling.py`, `state.py` 외의 기존 Harness 모듈은 이동하지 않는다.
- [ ] Refactor: CLI → execution coordinator → task executor → Worker gateway, 그리고 coordinator → scheduling/state의 호출 방향을 유지하고 Red → Green → Refactor 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_task_executor.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`를 통과한다.
- [ ] `python -B -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_exec.py'`를 통과한다.
- [ ] Harness coordinator와 단일 Task executor의 통합 경계 테스트를 통과한다.
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
- Plan의 `수정 금지 경로`가 내부 실행 계약에서 read-only 권한으로 일관되게 해석되어야 한다.
- `worker_runner`와 `harness_runner` package import, Worker 호출, 병렬 실행, 판정 교정, evidence와 상태 저장 흐름이 정상 동작해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- `forbidden_paths` 내부 계약이 남거나 read-only 경로의 실제 권한이 달라짐
- Worker 또는 Harness import와 호출 흐름이 깨짐
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- Product Spec, Design Doc, Architecture 또는 보안 최소 권한 원칙과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
