# 작업 계획: harness-worker-time-log-02

## 1. 기본 정보

### 사용자 요청

실제 Harness 실행에서 각 Task Worker의 시작·종료·전체 작업 시간, area, phase별 시간, tool 호출 수와 실행 시간, 명시·추론 분류가 raw log와 집계 tree에 누락 없이 기록되게 수정하고, Task별 시간 정보를 콘솔과 Notion 최종 Report에서도 확인할 수 있게 한다.

### 작업 목적

테스트 fixture에서는 통과했지만 실제 실행 순서에서 `worker_start`가 유실되고 tool 이벤트와 Report 표시가 누락되는 회귀를 수정하여 Worker 관측 로그가 실제 Harness 실행 결과를 정확히 반영하도록 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.codex/hooks/WORKER_LOG_SCHEMA.md`

---

## 2. 실행 Task

### Task 1. 실제 Worker 수명주기와 tool 시간 수집 복구

#### 선행 Task

- `없음`

#### 작업 목적

실제 `execute_worker` 실행 순서에서도 Worker 시작 이벤트를 session에 정확히 연결하고 `codex exec --json` 이벤트 스트림에서 tool 수명주기를 자동 수집하여 raw log와 tree 시간 집계를 완성한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec/tests`
- `.codex/hooks`

#### 수정 금지 경로

- `.codex-logs`
- `frontend`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] 먼저 실제 순서인 부모 runner 시작 → `worker_start` 전송 시도 → Codex `UserPromptSubmit` session 생성 → phase/tool/end를 재현하여 현재 raw log에 `worker_start`가 없고 tree timing이 비어 실패하는 Python·Node 회귀 테스트를 작성하고 Red 결과를 기록한다.
- [ ] `worker_start`가 Task pending session 생성 전 도착해도 유실하지 않도록 부모 측에서 실제 프로세스 시작 시각을 보존한 채 제한적으로 대기·재전송하거나 Node 측 run-scoped provisional 상태와 결합하고, session이 확정된 뒤 run ID·task number·area·session ID가 있는 시작 레코드를 정확히 한 번 기록한다.
- [ ] 시작 이벤트 결합은 잘못된 run ID·task number·area·부모 session·토큰을 계속 거부하고 무제한 재시도·외부 URL·Worker 직접 로그 쓰기를 허용하지 않으며, 기록 실패가 실제 Worker 성공·실패·timeout 결과를 변경하거나 숨기지 않게 한다.
- [ ] Worker 명령에 지원되는 `codex exec --json`을 적용하고 JSONL stdout과 stderr를 안전하게 분리·소비하여 tool item 시작·완료 이벤트를 run-scoped `tool_start`·`tool_end`로 변환하되 기존 `-o` 최종 JSON 응답, 16 KiB 실패 tail, timeout, 임시 파일 정리 계약을 유지한다.
- [ ] tool 이벤트의 안정된 item ID로 시작·완료를 짝짓고 부모가 관찰한 단조 시각으로 duration을 계산하며, 로그에는 허용된 tool 이름과 분류 메타데이터만 전달하고 command·patch·파일 내용·토큰 등 tool 입력 원문과 민감정보를 저장하지 않는다.
- [ ] 명시 phase marker가 활성 상태면 tool을 해당 phase에 귀속하고 marker가 없으면 안전하게 축약한 tool 종류·분류를 기준으로 phase를 추론하며, 중복 완료·시작 없는 완료·열린 tool·열린 phase·비 JSON 진행 행을 멱등하고 안전하게 처리한다.
- [ ] start·phase·tool·end 이벤트에 신뢰된 부모 발생 시각을 보존하여 Worker 전체 시간과 phase/tool 시간이 0 또는 음수가 되지 않게 하고, 종료 시 열린 구간을 한 번 닫아 정상·실패·timeout·subprocess 예외·최종 JSON 파싱 실패에서도 시간을 유실하지 않는다.
- [ ] Node tree 집계가 실제 run의 `worker_start`와 `worker_end`를 사용해 기존 area 값, `total_duration_ms`, `phases`, `unattributed_duration_ms`, 명시·추론 classification을 Task 노드에 투영하고 Parent·subagent 레코드는 Worker 합계에서 제외하게 한다.
- [ ] 기존 raw/tree 로그 형식을 읽는 하위 호환성을 유지하고 과거의 시작 이벤트 없는 run 때문에 tree 전체 생성이 실패하지 않게 하되, 기존 `.codex-logs` 데이터를 삭제·재작성하거나 근거 없는 시간을 합성하지 않는다.
- [ ] `.codex/hooks/WORKER_LOG_SCHEMA.md`에 실제 JSONL tool 변환, 시작 이벤트 결합, 시간 기준, 유실·부분 로그 호환 규칙을 구현과 일치하게 반영한다.
- [ ] 최소 구현으로 실제 순서 회귀 테스트를 Green으로 만든 뒤 JSONL stream parsing, event buffering, 시간 측정, Node 저장·tree 집계 책임을 분리하는 Refactor를 수행해 각 단계의 실행 증거를 남긴다.

#### TDD 정책

- REQUIRED

#### 검증 항목

- [ ] 실제 runner와 Node CLI 통합 fixture에서 `worker_start`가 phase보다 먼저 한 번 기록되고 동일 run의 task number·area·session ID와 결합되는지 검증한다.
- [ ] JSONL fixture의 tool 시작·완료·중복·누락·비 JSON·열린 tool과 명시 marker 유무를 검증하고 raw log 및 tree의 phase별 `tool_calls`, `tool_duration_ms`, classification이 일치하는지 확인한다.
- [ ] 정상·실패·timeout·subprocess 예외·최종 JSON 파싱 실패에서 `worker_end`, exit code, status, summary, 양의 전체 duration과 열린 구간 종료가 보존되는지 Python·Node 테스트로 검증한다.
- [ ] 동일 Task 번호 재실행이 run ID별로 분리되고 Parent·subagent가 Worker timing에 포함되지 않으며 과거 시작 누락 로그도 tree 생성을 중단하지 않는지 검증한다.
- [ ] 잘못된 token·외부 URL·phase·run ID·task number·area·session과 종료 후 이벤트가 거부되고 Worker sandbox에 `.codex-logs` 쓰기 권한이 없는지 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker*.py'`와 `node --test .codex/hooks/tests/*.test.mjs`를 실행한다.
- [ ] 변경한 Python 파일에 `python -m py_compile`, 변경한 `.mjs` 파일에 `node --check`, 저장소에 `git diff --check`를 실행한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Red → Green → Refactor 단계와 실제 실행 순서 증거가 실행 기록에 남아야 한다.
- 실제 Worker run마다 raw log에 시작·종료와 area가 한 번씩 기록되고 tree에 양의 전체 시간과 phase/tool 집계가 있어야 한다.
- 명시 marker가 없는 tool도 추론 phase로 기록되고 명시·추론 출처가 구분되어야 한다.
- 정상·실패·timeout에서 실제 Worker 결과와 시간 로그가 함께 보존되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- Python·Node 테스트, 문법 검사 또는 `git diff --check` 실패
- 실제 실행 순서를 재현하지 않고 기존 역순 fixture만으로 성공 판정함
- `worker_start` 유실·중복, 0 또는 음수 전체 시간, phase/tool 집계 누락 발생
- tool 입력 원문·토큰·민감정보 저장 또는 Worker 직접 로그 쓰기 허용
- 로깅 실패가 Worker 결과를 성공으로 변경하거나 실패·timeout을 숨김
- 동일 Task 재실행 병합 또는 Parent·subagent 중복 집계
- 기존 로그 데이터 삭제·파괴적 변환 또는 하위 호환성 파괴
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만임

#### 제외 범위

- 제품 Frontend·Backend 기능과 DB schema·공개 API 변경
- 과거 불완전 로그의 추정 backfill 또는 기존 로그 데이터 삭제
- 새로운 외부 관측 서비스·유료 API·의존성 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Task 시간 Report 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

Node가 확정한 run별 시간 집계를 Harness 실행 결과 모델로 전달하여 콘솔과 Notion Report에서 Task별 area·전체 시간·phase/tool 시간을 확인할 수 있게 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner`
- `.agents/skills/harness-exec`

#### 수정 금지 경로

- `.codex/hooks`
- `.codex-logs`
- `frontend`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] 먼저 성공·실패·timeout Worker 결과에 timing summary가 있어도 `TaskResult`와 실행 Report에서 누락되는 현재 동작을 재현하는 Python 테스트를 작성하고 Red 결과를 기록한다.
- [ ] 부모 Worker gateway가 Node의 확정된 run ID·task number·area·전체 duration·phase 집계·미귀속 시간·classification을 구조화된 결과로 읽고, `.agents/scripts/worker_runner`의 `WorkerExecutionResult` 결과 전달 필드에서 Harness `TaskResult`까지 연결하되 기존 호출자와 실행 기록 호환성을 유지한다. 이 Task에서는 Task 1의 Worker 이벤트 수집·Node raw/tree 집계 알고리즘을 변경하지 않는다.
- [ ] timing summary의 run ID와 task number가 현재 invocation과 일치하고 duration·tool count가 유효한 비음수 정수인지 검증하며, 불일치하거나 파싱할 수 없는 관측 데이터는 Worker 업무 결과와 분리된 명시적 관측 실패로 표시한다.
- [ ] 콘솔·Notion 실행 Report의 각 Task에 area, run ID, Worker 전체 시간, 미귀속 시간, classification과 phase별 duration·tool 호출 수·tool 실행 시간을 사람이 읽을 수 있는 단위와 원본 millisecond 값으로 함께 표시한다.
- [ ] 성공·실패·timeout·blocked Task를 구분하고 시간이 없는 blocked Task와 legacy 실행은 `미기록`으로 표시하며, 누락을 0ms로 위장하거나 Parent 시간을 Worker 시간으로 대체하지 않는다.
- [ ] 같은 Task 번호가 재실행되면 현재 실행의 고유 run ID와 timing만 연결하고 이전 run과 합산하지 않으며, Task 번호순 Report 정렬과 기존 work summary·verification·quality score·remaining issues 표시를 유지한다.
- [ ] Harness 실행 결과가 실패하거나 Notion 게시가 실패해도 가능한 Task timing을 Report 본문에 포함하고, 관측 실패가 실제 구현 실패·timeout·검증 실패 원인을 가리지 않게 한다.
- [ ] `harness-exec` 실행·결과 보고 문서에 Task timing 표시와 미기록 의미를 반영하고 제품 코드나 기존 로그 파일을 변경하지 않는다.
- [ ] 최소 구현으로 Report 테스트를 Green으로 만든 뒤 timing DTO 검증·Worker 결과 전달·Report rendering 책임을 분리하는 Refactor를 수행해 각 단계의 실행 증거를 남긴다.

#### TDD 정책

- REQUIRED

#### 검증 항목

- [ ] 성공·실패·timeout·blocked·legacy timing 미기록 Task의 모델 변환과 Report 렌더링을 Python 단위 테스트로 검증한다.
- [ ] 여러 phase와 명시·추론 혼합, tool 호출 0건·복수 건, 미귀속 시간이 있는 fixture가 console·Notion 공통 본문에 정확히 표시되는지 검증한다.
- [ ] 동일 Task 번호 재실행에서 현재 run만 표시되고 Task 번호순 정렬, summary, verification, quality score, remaining issues가 회귀하지 않는지 확인한다.
- [ ] 선행 Task의 실제 Node timing summary와 Harness 모델 계약이 충돌하지 않는지 신규 gateway 통합 fixture로 검증한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`를 실행하고 변경한 Python 파일에 `python -m py_compile`을 실행한다.
- [ ] `git diff --check`를 실행하고 `.codex-logs`, 제품 경로, 수정 가능 경로 밖 변경이 없는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Red → Green → Refactor 단계와 결과가 실행 기록에 남아야 한다.
- 콘솔과 Notion Report에서 각 실행 Task의 고유 run ID, area, 전체 시간, phase/tool 시간과 분류를 확인할 수 있어야 한다.
- timing 누락·오류는 0으로 위장하지 않고 업무 결과와 분리해 표시되어야 한다.
- 기존 Report 필드와 성공·실패·차단 판정이 유지되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- Python 테스트, 문법 검사 또는 `git diff --check` 실패
- Task timing이 콘솔 또는 Notion Report 중 한쪽에서 누락됨
- 누락 timing을 0ms로 표시하거나 Parent 시간을 Worker 시간으로 사용함
- run ID 불일치·동일 Task 재실행 병합 또는 과거 run timing 연결
- timing 오류가 실제 Worker 실패·timeout·검증 결과를 변경하거나 숨김
- 기존 summary·verification·quality score·remaining issues·Task 정렬 회귀
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만임

#### 제외 범위

- Task 1의 Worker 이벤트 수집·Node raw/tree 집계 알고리즘 변경 (`WorkerExecutionResult` 결과 전달 계약 보완은 이 Task 범위에 포함)
- 제품 UI 대시보드 또는 외부 관측 시스템 추가
- 기존 Notion Page나 과거 raw/tree 로그의 소급 수정

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
- 관련 로그 스키마·실행 문서와 실제 구현이 일치해야 한다.
- 실제 Harness 정상·실패·timeout fixture에서 raw log와 tree에 Task별 area·전체 시간·phase/tool 집계가 기록되어야 한다.
- 같은 timing이 현재 run ID로 Harness 콘솔과 Notion Report에 표시되고 Parent·이전 run과 혼동되지 않아야 한다.
- tool 입력 원문·토큰·민감정보가 로그와 Report에 노출되지 않고 Worker의 `.codex-logs` 직접 쓰기가 금지되어야 한다.
- 관련 Python·Node 테스트, 정적 문법 검사와 `git diff --check`가 모두 통과해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 실제 실행에서 시작·전체 시간·tool 이벤트가 유실되거나 tree와 Report가 불일치함
- 동일 Task 재실행 또는 Parent·Worker 시간이 중복·혼합됨
- 민감한 tool 입력·토큰 노출, Worker 직접 로그 쓰기 또는 외부 URL 전송이 발생함
- 기존 로그 데이터 삭제·파괴적 변환 또는 제품 기능·DB·API·인증 정책 변경이 발생함
- 남은 문제가 사용자 확인 없이 방치됨
