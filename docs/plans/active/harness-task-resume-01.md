# 작업 계획: harness-task-resume-01

## 1. 기본 정보

### 사용자 요청

Harness 실행 중 일부 Task가 실패한 뒤 같은 Plan을 다시 실행할 때, `docs/plans/state` 아래 기능별 JSON 파일에 Plan 번호와 Task별 진행 상태를 보존한다. 예를 들어 `user-01`, `user-02` Plan은 `user.json`의 `01`, `02` 항목으로 구분하고 각 항목 안에는 `task1`, `task2`처럼 Task별 상태를 기록한다. JSON 파일은 코드로 엄격하게 검증할 수 있는 하나의 루트 객체여야 하며, 실패하거나 차단된 Task에만 이유를 기록한다. Mandatory Gate, TDD, 검증 결과와 품질점수 증거는 이 상태 파일에 기록하지 않는다.

### 작업 목적

현재 Harness가 완료 Task의 Worker까지 다시 호출하는 문제를 해결한다. Plan ID의 마지막 두 자리 번호와 기능명을 분리해 `docs/plans/state/<feature>.json`의 단일 객체에 Plan별·Task별 상태를 모으고, 현재 Plan의 Task 번호와 상태 스키마가 유효한 `succeeded` Task를 복원하여 후속 Task 실행을 이어간다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.agents/skills/harness-exec/SKILL.md`

---

## 2. 실행 Task

### Task 1. 단순 Task 상태 저장 및 완료 Task 재사용

#### 선행 Task

- `없음`

#### 작업 목적

`docs/plans/state/<feature>.json`의 단일 객체에 Plan 번호별·Task별 진행 상태를 원자적으로 저장하고, 같은 Plan 재실행 시 스키마가 유효한 `succeeded` Task를 Worker 호출 없이 선행 Task 성공으로 복원하여 실패·차단·미진행 Task부터 실행한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`
- `.agents/skills/harness-exec/SKILL.md`
- `docs/plans`

#### 수정 금지 경로

- `AGENTS.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `docs/plans/_template.md`
- `docs/plans/active`
- `docs/plans/test`
- `docs/plans/z_archive`
- `.agents/skills/harness-plan`

#### 구현 항목

- [ ] Red 단계에서 앞 Task 성공 후 뒤 Task가 실패한 Plan을 재실행하면 성공 Task까지 다시 호출되는 현상과, 여러 Plan 번호 및 병렬 Task의 상태가 기능별 단일 JSON 객체에 안전하게 누적되지 않는 현상을 재현하는 실패 테스트를 먼저 작성하여 의도한 이유로 실패함을 기록한다.
- [ ] Plan ID의 마지막 `-NN`을 Plan 번호로 분리하고 나머지 전체를 기능명으로 사용하여, `user-01`과 `user-02`는 `docs/plans/state/user.json`, `user-profile-01`은 `docs/plans/state/user-profile.json`을 사용하도록 안전한 경로 변환을 구현한다.
- [ ] 기능별 JSON은 배열이나 여러 JSON 값이 아닌 하나의 루트 객체로 저장하고, 최상위에 `"01"`, `"02"` Plan 번호 키를 두며 각 Plan 객체 바로 아래에 `"task1"`, `"task2"` Task 키를 둔다.
- [ ] 상태 파일은 하나의 객체로 직렬화하고 `01 → task1 → status: succeeded`, `01 → task2 → status: failed, reason: 테스트 실패`, `02 → task1 → status: pending` 계층을 동일 객체 안에 표현한다.
- [ ] 각 Task 값은 `status`를 가진 객체로 제한하고 허용 상태를 `pending`, `running`, `succeeded`, `failed`, `blocked`로 고정한다. `failed`와 `blocked`에는 비어 있지 않은 문자열 `reason`을 필수로 저장하고, 나머지 상태에는 `reason`을 저장하지 않는다.
- [ ] 상태 JSON에는 Mandatory Gate, TDD, 검증 결과, 품질점수, 실행 출력 또는 실행 증거를 저장하지 않는다. 기존 내부 실행 증거 저장 기능은 상태 JSON과 분리된 현재 동작을 유지한다.
- [ ] `docs/plans/state`가 없으면 최초 기록 시 생성하고, 각 Task의 `pending`, `running`, `succeeded`, `failed`, `blocked` 상태를 기존 임시 파일·원자적 교체 방식으로 저장한다. 병렬 Task가 같은 기능 JSON을 갱신할 때 다른 Plan·Task 항목을 잃지 않도록 동일 Harness 프로세스의 읽기-수정-쓰기를 직렬화한다.
- [ ] 상태 파일을 읽을 때 루트·Plan·Task 값이 모두 객체인지, Plan 키가 두 자리 숫자인지, Task 키가 현재 Plan의 `taskN`과 일치하는지, 상태와 조건부 `reason`이 정확한지 코드로 검증한다. JSON 파싱 또는 스키마 검증 실패를 성공으로 간주하거나 임의로 덮어쓰지 않는다.
- [ ] 실행 시작 시 현재 Plan 번호 아래의 `succeeded` Task만 Worker 호출 없이 성공 결과로 복원해 선행 Task 조건을 충족하도록 한다. 실패·차단·미진행 상태와 중단된 `running` 상태는 재실행 대상으로 유지한다.
- [ ] 병렬 실행과 선행 Task 차단 전파에서도 모든 Task의 최종 상태가 기록되고, 재실행 Report가 건너뛴 Task와 이번 실행 Task를 구분할 수 있도록 기존 결과 모델과 메시지를 최소 범위로 연결한다.
- [ ] Green 단계의 최소 구현 후 중복된 상태 저장·복원 로직만 리팩터링하고, Red → Green → Refactor 각 단계의 명령과 결과를 Harness 실행 기록에 남긴다.
- [ ] `.agents/skills/harness-exec/SKILL.md`에 `docs/plans/state/<feature>.json`의 단일 객체 스키마, 실패·차단 이유와 완료 Task 재사용 동작을 현재 구현과 일치하도록 간단히 갱신한다.

#### 검증 항목

- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_harness_runner_modules.py`로 기능명·Plan 번호 경로 분리, 단일 루트 객체, `01/02 → task1/task2` 계층, 상태 allowlist, 실패·차단 이유, 증거 필드 미기록, 다른 항목 보존, 병렬 갱신, 상태 전이, 부분 실패 후 재실행, 완료 Task 미호출, 선행 Task 성공 복원, 미완료 상태 재개, 잘못된 JSON·스키마와 원자적 저장 실패를 검증한다.
- [ ] `python -m unittest .agents/skills/harness-exec/tests/test_harness_exec.py`로 기존 Task 완료 계약과 품질점수 판정 회귀가 없는지 검증한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/scripts/harness_runner`로 변경된 Python 모듈의 구문과 import 가능성을 검증한다.
- [ ] `git diff --check -- .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests .agents/skills/harness-exec/SKILL.md`로 변경 범위의 patch 형식 오류와 후행 공백이 없는지 검증한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 재검증을 반복하고, 이후에도 실패하면 우회하지 않고 Task 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 같은 Plan 재실행 시 스키마가 유효한 `succeeded` Task의 Worker는 다시 호출되지 않고, 미완료 Task가 선행 Task 규칙에 따라 실행되어야 한다.
- `user-01`과 `user-02`의 상태가 `docs/plans/state/user.json`의 `01`, `02` 아래에 각각 보존되고, 각 Plan의 Task가 `task1`, `task2` 키로 확인 가능해야 한다.
- 상태 파일 전체가 하나의 JSON 객체이고 모든 Plan·Task 상태를 코드로 검증할 수 있어야 한다.
- `failed`·`blocked` Task에는 이유가 있고 그 외 상태에는 이유나 실행 증거가 없어야 하며, 병렬 상태 갱신이 다른 Plan 또는 Task 상태를 유실하지 않아야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- 스키마가 유효하지 않거나 `succeeded`가 아닌 Task를 건너뜀
- 상태 기록 실패를 성공으로 처리하거나 기능별 상태 JSON을 비원자적으로 덮어씀
- Plan 번호 또는 Task 상태 갱신 중 같은 기능의 다른 Plan·Task 기록을 유실함
- 상태 JSON에 Mandatory Gate, TDD, 검증 결과, 품질점수 또는 실행 증거를 기록함
- `quality_score`가 기준 미달

#### 제외 범위

- Active Plan 본문에 진행 상태를 기록하거나 Plan 파일 형식을 변경하는 작업
- 새로운 데이터베이스, 외부 서비스, 의존성 또는 `docs/plans/state` 밖의 새 상태 저장소 도입
- 기존 `.execution-records` 파일의 삭제, 자동 마이그레이션 또는 상태 JSON과의 통합
- 같은 Plan 번호에서 Task 본문만 변경된 경우를 감지하기 위한 fingerprint 저장
- 여러 Harness 프로세스가 같은 상태 파일을 동시에 수정하는 프로세스 간 잠금
- 실패 Task의 자동 원인 수정, Task 실행 순서 정책 또는 최대 병렬 실행 수 변경
- 제품 Frontend·Backend 코드와 검증 규칙 완화

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
- 관련 문서와 실제 구현이 일치해야 한다.
- Harness 실행기가 모든 Task 완료 후 `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`를 한 번 실행해 전체 회귀가 없어야 한다.
- Harness 실행기가 모든 Task 완료 후 `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`를 한 번 실행해 전체 Python 구문을 검증해야 한다.
- 같은 Plan의 부분 실패 후 재실행에서 `succeeded` Task는 건너뛰고 실패·미진행 Task부터 이어서 실행되어야 한다.
- `docs/plans/state/<feature>.json`의 단일 객체에서 Plan 번호별·Task별 상태와 실패·차단 이유를 조회할 수 있어야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 상태 JSON의 객체 구조와 현재 Plan의 Task 키를 검증하지 않고 Task를 건너뜀
- 기능별 JSON의 Plan 번호 또는 Task 계층이 요청한 구조와 다르거나 상태 갱신 중 기존 항목이 유실됨
- 실패·차단 이외의 Task에 이유 또는 실행 증거를 기록하거나 실패·차단 이유를 누락함
- 남은 문제가 사용자 확인 없이 방치됨
