# 작업 계획: harness-notion-time-report-01

## 1. 기본 정보

### 사용자 요청

기존 Notion Harness 실행 보고서에 Task별 및 전체 Worker 시간 분석을 추가한다.

### 작업 목적

Harness 실행 결과에 이미 수집되는 Worker timing을 사람이 비교하기 쉬운 형태로 집계하여, 별도의 로그 수작업 분석 없이 Notion Report에서 Task별 소요 시간, phase별 비중, 전체 합계와 미귀속 시간을 확인할 수 있게 한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`, `.codex/hooks/WORKER_LOG_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Notion Harness 시간 분석 Report 집계 및 검증

#### 선행 Task

- `없음`

#### 작업 목적

기존 Worker timing 모델과 Notion 게시 흐름은 유지하면서, Report 본문에 Task별·전체 시간 분석을 일관된 계산 규칙으로 표시하고 성공·실패·차단·legacy 실행의 경계 조건을 회귀 테스트로 고정한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner/report.py`
- `.agents/skills/harness-exec/tests/test_harness_runner_modules.py`
- `.agents/skills/harness-exec/SKILL.md`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.codex/hooks`
- `.agents/skills/harness-exec/scripts/harness_runner/models.py`
- `.agents/skills/harness-exec/scripts/harness_runner/notion.py`
- `.agents/skills/harness-exec/scripts/harness_runner/cli.py`
- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design`
- `docs/quality`
- `docs/plans/state`

#### 구현 항목

- [ ] Red 단계에서 여러 Task의 timing을 입력했을 때 Report 본문에 전체 Worker 시간, timing 기록 Task 수, 미기록 Task 수, 전체 미귀속 시간, canonical phase별 합계와 전체 시간 대비 비율이 표시되어야 한다는 실패 테스트를 먼저 추가한다.
- [ ] Red 단계에서 각 Task의 Worker 전체 시간, 전체 Report 대비 비율, 미귀속 시간과 Task 시간 대비 비율, canonical phase별 duration과 Task 시간 대비 비율, tool 호출 수와 tool 실행 시간을 확인하는 실패 테스트를 추가한다.
- [ ] phase 출력 순서는 `analysis`, `test_code`, `implementation`, `implementation_and_test`, `refactor`, `documentation`, `verification`, `finalization`으로 고정하고, 해당 Task에 관측되지 않은 phase는 실제 0ms로 오인되지 않도록 `미기록`으로 구분한다.
- [ ] 시간은 사람이 읽을 수 있는 분·초 표현과 원본 ms를 함께 표시하고, 비율은 소수점 첫째 자리까지 일관되게 반올림한다.
- [ ] 전체 시간과 전체 phase 합계는 timing이 존재하는 Task만 합산하며, timing이 없는 blocked·legacy Task는 0ms로 대체하지 않고 `미기록` Task 수와 각 Task 상태로 구분한다.
- [ ] 성공, 실패, timeout 여부와 무관하게 유효한 timing은 집계에 포함하고, timing 관측 오류는 기존처럼 Worker 업무 결과 및 시간 집계와 분리해 표시한다.
- [ ] 기록된 timing이 하나도 없는 Report와 전체 시간이 0ms인 경계 입력에서도 0으로 나누지 않고, 분석 불가 또는 `미기록` 상태를 명확히 표시한다.
- [ ] `phase.duration_ms`는 경과 시간 구간, `tool_duration_ms`는 phase 경계를 걸쳐 중복될 수 있는 별도 관측값이므로 서로 더하거나 Worker 전체 시간에 가산하지 않는다는 설명을 Report와 Harness 실행 문서에 반영한다.
- [ ] 기존 Task 상태, 수행 내용, 검증 결과, Quality Score, 남은 문제, Task 정렬과 Notion Page 제목 형식을 유지한다.
- [ ] `build_execution_report`가 생성한 시간 분석 본문이 기존 CLI의 `publish_report` 호출을 통해 변경 없이 Notion MCP 게시 payload에 포함되는 현재 통합 경계를 테스트로 확인하며, Notion 인증·상위 Page 설정·게시 횟수 정책은 변경하지 않는다.
- [ ] Green 단계에서 최소 구현으로 모든 신규·기존 관련 테스트를 통과시키고, Refactor 단계에서 시간 포맷·비율·집계 책임을 명확한 작은 함수로 정리한 뒤 동일 테스트를 다시 통과시킨다.

#### TDD 정책

- REQUIRED

Report 출력 계약을 변경하는 신규 기능이므로 `Red → Green → Refactor` 순서와 각 단계의 테스트 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] Red 단계에서 새 시간 분석 테스트가 기존 구현의 집계 또는 표시 누락 때문에 의도대로 실패한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`가 Green 및 Refactor 단계에서 통과한다.
- [ ] 테스트에서 Task별 비율, 전체 phase 합계, 미귀속 합계, canonical phase 순서, 분·초와 ms 표시, 소수점 첫째 자리 반올림을 검증한다.
- [ ] 테스트에서 일부 또는 전체 timing 미기록, 0ms, 실패, timeout, blocked, timing 관측 오류를 검증하고 미기록 값을 0으로 합산하지 않는지 확인한다.
- [ ] 테스트에서 tool 실행 시간이 phase duration 또는 Worker 전체 시간에 가산되지 않고 별도 정보로만 표시되는지 확인한다.
- [ ] 테스트에서 렌더링된 시간 분석 본문이 기존 Notion 게시 payload에 포함되며 Page 생성 정책이 달라지지 않는지 확인한다.
- [ ] `git diff --check -- .agents/skills/harness-exec/scripts/harness_runner/report.py .agents/skills/harness-exec/tests/test_harness_runner_modules.py .agents/skills/harness-exec/SKILL.md`가 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 시간 집계는 timing이 기록된 Task만 대상으로 하며 phase duration과 tool duration을 중복 합산하지 않아야 한다.
- Notion Report에서 전체 요약과 각 Task 상세를 같은 계산 규칙으로 확인할 수 있어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- Red 단계 실패 증거 또는 Green·Refactor 통과 증거 누락
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- timing 미기록 Task를 0ms로 합산하거나 성공 Task만 집계함
- phase duration과 tool duration을 더해 경과 시간을 과대 계산함
- 기존 Notion 게시 정책, Task 상태 또는 Report 핵심 섹션을 변경함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Worker 로그 schema와 timing 수집·phase 판정 로직 변경
- Notion MCP 인증, 상위 Page, 게시 방식 또는 외부 서비스 설정 변경
- 기존 실행 로그를 다시 파싱하거나 과거 Notion Page를 수정하는 마이그레이션
- Backend, Frontend 제품 기능 및 조직도 구현 변경
- phase 종류 추가·삭제 또는 의미 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- Report 시간 분석과 기존 Notion 게시 흐름이 정상적으로 통합되어야 한다.
- 수정 범위가 Task 1의 `수정 가능 경로`를 벗어나지 않아야 한다.
- Task 1의 `수정 금지 경로`에 변경이 없어야 한다.
- Harness 실행 문서와 실제 Report 출력 계약이 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- Task 1이 실패함
- 필수 검증 명령이 실패함
- 수정 가능 경로 밖의 변경이 발생함
- 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- timing 미기록·0ms·실패·timeout 경계 조건이 명확히 구분되지 않음
- phase duration과 tool duration의 중복 가능성이 Report에서 설명되지 않거나 계산에 잘못 반영됨
- 기존 Notion 게시 흐름 또는 Worker timing 수집 계약과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
