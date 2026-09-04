# 작업 계획: harness-01

## 1. 기본 정보

### 사용자 요청

`harness_runner` 하위 코드에서 충분히 분리되지 않은 책임을 찾아 모듈 경계를 정리하고, 현재 저장소에서 사용되지 않는 코드와 중복 인터페이스를 제거한다.

### 작업 목적

현재 `parse.py`에 혼재한 Harness 호출문 파싱과 Active Plan 파싱을 분리하고, 538줄 규모의 `execution.py`가 함께 담당하는 Worker 결과 계약 검증·결과 변환·재개 상태 복원·의존 Task 스케줄링을 명확한 내부 경계로 나눈다. 저장소 전체 참조로 미사용이 확인된 내부 타입·상수·필드·인자를 제거하되 Harness의 실행 순서, 재개, 증거 저장, 판정 교정, Report 및 verifier 연동 계약은 변경하지 않는다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.agents/skills/harness-exec/SKILL.md`

---

## 2. 실행 Task

### Task 1. 호출문 파서와 Active Plan 파서 책임 분리

#### 선행 Task

- 없음

#### 작업 목적

서로 다른 입력 계약인 `$harness-exec` 호출문과 Active Plan Markdown을 독립 모듈로 분리하고, 파싱 과정의 미사용 상수와 의미 없는 전달용 함수를 제거하여 각 파서의 변경 이유를 하나로 제한한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/skills/harness-exec/SKILL.md`
- `.agents/scripts/worker_runner`
- `docs`

#### 구현 항목

- [ ] Red: 호출 옵션 파싱과 Plan Task/경로/품질점수 파싱의 정상·실패·경계 계약을 각각 독립적으로 고정하는 테스트를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: 호출문 파싱과 Plan Markdown 파싱을 별도 모듈로 이동하고 `cli.py`, `plan.py` 및 테스트 import를 새 책임 경계에 맞춰 갱신한다.
- [ ] 저장소 전체 참조를 확인한 뒤 미사용 `CORE_SECTION_NAMES`, 단순 전달만 하는 `_path_values`, 이전 혼합 파서 모듈의 잔여 코드와 불필요한 공백·주석을 제거한다.
- [ ] Refactor: 정규식, 섹션 추출, 오류 타입의 소유 위치를 각 파서에 맞게 정리하되 기존 사용자 오류 메시지와 생성되는 `HarnessRequest`·`ParsedPlan` 값은 유지하고 Red → Green → Refactor 명령 및 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_exec.py'`로 Active Plan 파싱과 quality score 경계를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`로 호출문 파싱, `--from-task`, Task 파싱 계약을 검증한다.
- [ ] `rg -n "CORE_SECTION_NAMES|_path_values|harness_runner\.parse" .agents/skills/harness-exec` 결과에 제거 대상 정의나 이전 import가 남지 않았는지 확인한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/scripts/harness_runner`로 변경한 Python 모듈의 구문을 검증한다.

#### 완료 조건

- 호출문 파서와 Active Plan 파서가 서로를 import하지 않고 각 입력 계약만 담당해야 한다.
- 기존 호출 옵션, Task 본문, 경로, 선행 Task 및 quality score 파싱 결과와 오류 의미가 유지되어야 한다.
- 적용 가능한 Mandatory Gate가 모두 PASS이고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 파서 분리 후 기존 유효 입력의 결과 또는 기존 무효 입력의 거부 동작이 달라짐
- 제거 대상으로 명시한 미사용 심볼 또는 이전 혼합 모듈 import가 남음
- 테스트나 compileall 실패, TDD 기록 누락 또는 검증 우회
- `quality_score`가 기준 미달

#### 제외 범위

- Active Plan Markdown 형식 또는 `$harness-exec` CLI 문법 변경
- Worker payload, 실행 스케줄, 상태 및 증거 저장 동작 변경
- `.agents/skills/harness-exec/SKILL.md` 개정

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Worker 결과 계약과 실행 증거 책임 분리

#### 선행 Task

- `Task 1`

#### 작업 목적

`execution.py`에서 Worker JSON 계약 검증, 판정 교정 입력 생성, `TaskResult` 변환 및 실행 증거 fingerprint 책임을 분리하고 실제 소비자가 없는 내부 모델과 인자를 제거한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/skills/harness-exec/SKILL.md`
- `.agents/scripts/worker_runner`
- `docs`

#### 구현 항목

- [ ] Red: Worker 종료 코드, JSON 누락, Mandatory Gate, 검증 항목 대응, quality score, 비표준 성공 판정 1회 교정, 명시적 실패 판정 및 `TaskResult` 변환을 독립 결과 계약 테스트로 먼저 고정하고 의도한 실패를 기록한다.
- [ ] Green: Worker 결과의 객관적 완료 검증·최종 판정·교정 payload·보고용 결과 변환을 전용 내부 모듈로 이동하고 `execution.py`는 호출 및 실행 흐름만 조정하도록 축소한다.
- [ ] 저장소 전체 참조를 다시 확인한 뒤 미사용 `WorkerFailure` 모델과 보고·스케줄링에서 소비되지 않는 `TaskResult.final_status` 필드를 제거하되 Worker 출력의 필수 `final_status` 검증 계약은 유지한다.
- [ ] `revision_fingerprint`가 즉시 폐기하는 `root`, `common_prompt` 인자를 제거하고 모든 호출부와 테스트를 Task 계약 기반 signature로 정렬하며 기존 fingerprint 값과 증거 재사용 의미가 유지되는지 검증한다.
- [ ] Refactor: 결과 계약 오류 문구와 판정 교정 횟수는 유지하고 선행 Task의 파서 분리와 충돌하지 않도록 import 방향을 단순화한 뒤 Red → Green → Refactor 명령 및 결과를 기록한다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_exec.py'`로 분리된 Worker 결과 계약의 정상·실패·quality score 회귀를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`로 판정 교정, 증거 저장·재사용, 손상 기록 거부와 선행 Task 결과의 충돌이 없음을 검증한다.
- [ ] `rg -n "WorkerFailure|TaskResult\([^\n]*final_status|revision_fingerprint\(" .agents/skills/harness-exec`로 제거 대상과 갱신된 fingerprint 호출부를 점검한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/scripts/harness_runner`로 변경한 Python 모듈의 구문을 검증한다.

#### 완료 조건

- Worker 결과 계약 검증과 결과 변환이 실행 스케줄러와 분리되고 기존 성공·실패·교정 판정이 유지되어야 한다.
- 미사용 모델·결과 필드·fingerprint 인자가 제거되고 저장·복원 가능한 실행 증거의 계약이 바뀌지 않아야 한다.
- 적용 가능한 Mandatory Gate가 모두 PASS이고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- Worker 출력의 `final_status`, Mandatory Gate, 검증 증거 또는 quality score 검증이 완화됨
- 판정 교정이 두 번 이상 실행되거나 명시적 실패가 성공으로 변환됨
- 선행 Task 파서 변경과 충돌하거나 증거 fingerprint 및 재사용 회귀가 발생함
- 테스트나 compileall 실패, TDD 기록 누락 또는 검증 우회
- `quality_score`가 기준 미달

#### 제외 범위

- Worker JSON schema와 Quality Model 변경
- Worker subprocess 실행 방식, verifier 프로토콜 또는 Report 문구 변경
- 기존 실행 기록의 migration 또는 삭제

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 재개 상태와 의존 Task 실행 통합 검증

#### 선행 Task

- `Task 2`

#### 작업 목적

`execute_workers`에 남은 상태 문서 해석, 재개 증거 복원, 의존 Task 준비·차단, 상태 전이 책임을 저장소와 스케줄링 경계로 정리하고 분리된 파서 및 Worker 결과 계약을 통해 전체 Harness 흐름이 동일하게 동작하도록 통합한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/skills/harness-exec/SKILL.md`
- `.agents/scripts/worker_runner`
- `docs`

#### 구현 항목

- [ ] Red: 성공 Task 복원, `--from-task` 증거 검증, 손상 상태 거부, 실패 후손 차단, 병렬 준비 순서, 상태 저장 실패를 상태·스케줄링 경계 테스트로 먼저 고정하고 의도한 실패를 기록한다.
- [ ] Green: 상태 파일의 내부 Plan key 해석을 `PlanStateStore`가 소유하게 하여 `execution.py`의 private `_parts` 접근을 제거하고, 복원·준비·차단 전이를 명확한 내부 함수 또는 모듈로 분리한다.
- [ ] `execute_workers`의 중복 `invoker`/`call_worker` 입력을 저장소 내 모든 호출부가 사용하는 하나의 주입 경계로 통합하고 중복 분기와 호환용 잔여 인터페이스를 제거한다.
- [ ] Worker 실행, 증거 저장, 상태 갱신, 후속 Task 활성화가 한 방향으로 이어지도록 정리하되 최대 병렬도, Task 번호 순서, 실패·차단 전파와 재개 정책은 유지한다.
- [ ] Refactor: Task 1과 Task 2에서 분리한 모듈을 실제 CLI 흐름에 연결하고 중복 상태 오류 처리와 불필요한 import를 정리한 뒤 Red → Green → Refactor 명령 및 결과를 기록한다.

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`로 이 Task가 변경한 재개, 증거, 상태, 병렬 의존성 및 선행 Task 계약과의 회귀를 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_browser_verifier.py'`로 CLI에서 browser/backend verifier 환경과 분리된 실행 경계가 통합되는지 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_frontend_verifier.py'`로 frontend Task에만 환경이 전달되는 기존 통합 계약을 검증한다.
- [ ] `rg -n "states\._parts|\binvoker\b|WorkerFailure|CORE_SECTION_NAMES" .agents/skills/harness-exec/scripts/harness_runner .agents/skills/harness-exec/tests` 결과에 제거 대상 private 접근·중복 입력·미사용 심볼이 남지 않았는지 확인한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 통합된 Python 모듈의 구문을 검증한다.

#### 완료 조건

- `execution.py`가 상태 JSON 내부 구조나 Worker 결과 필드 검증 세부사항을 직접 소유하지 않고 실행 조정 책임에 집중해야 한다.
- 정상 실행, 재실행, `--from-task`, 병렬 실행, Worker 실패, 상태·증거 오류의 기존 외부 동작이 유지되어야 한다.
- 제거 대상으로 확정한 private 접근, 중복 주입 인터페이스 및 미사용 심볼이 저장소 내에 남지 않아야 한다.
- 적용 가능한 Mandatory Gate가 모두 PASS이고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 선행 Task에서 분리한 파서 또는 Worker 결과 계약과 통합되지 않거나 import cycle이 발생함
- 재개 시 신뢰할 수 없는 상태·증거를 성공으로 취급하거나 실패 후손 Task를 실행함
- 병렬도, 실행 순서, 상태 전이, verifier 환경 또는 CLI 종료 코드가 달라짐
- 테스트나 compileall 실패, TDD 기록 누락 또는 검증 우회
- `quality_score`가 기준 미달

#### 제외 범위

- Task 상태 JSON schema, 실행 기록 schema 또는 저장 위치 변경
- 동시 실행 프로세스 수, 재시도 정책 및 Plan 완료 이동 정책 변경
- Notion 게시 방식, verifier 구현 및 `worker_runner` 리팩터링
- 제품 Frontend, Backend, API 또는 DB 변경

#### 작업 결과

`none`

#### 남은 문제

---

## 3. 전체 완료 조건

- 전체 완료조건은 무조건 완료이다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 검증 명령 또는 Mandatory Gate가 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- `ARCHITECTURE.md`, `CONVENTIONS.md`, `.agents/skills/harness-exec/SKILL.md`, Product Spec 또는 Design Doc의 기존 계약과 충돌함
- 테스트 삭제, 단언 약화, 검증 우회 또는 기존 실행 기록 삭제로 통과시킴
- 공개 동작이나 저장 schema를 변경하거나 새로운 의존성을 도입함
- 기존 activePlan의 변경을 덮어쓰거나 충돌을 확인하지 않은 채 동일 파일을 수정함
- 전체 `quality_score`가 `85` 미만임
