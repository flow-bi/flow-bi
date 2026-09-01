# 작업 계획: harness-notion-time-report-02

## 1. 기본 정보

### 사용자 요청

Notion Harness 시간 분석 Report를 이전 수동 분석 Report처럼 전체 요약, Task별 소요 시간, phase별 시간과 비율, tool 통계 및 해석 메모를 표 중심으로 확인할 수 있는 양식으로 변경한다.

### 작업 목적

현재 bullet 목록 형태의 시간 분석을 비교와 스캔이 쉬운 Markdown 표 구조로 개선하여, Notion Report 하나에서 실행 전체와 Task별 병목, 미귀속 시간, phase 및 tool 관측값을 일관되게 파악할 수 있게 한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`, `.codex/hooks/WORKER_LOG_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 수동 분석 양식 기반 Notion 시간 Report 구현

#### 선행 Task

- `없음`

#### 작업 목적

기존 Worker timing 계산 계약과 Notion 게시 흐름을 유지하면서, 전체·Task별 시간 분석을 이전 수동 분석과 같은 섹션 및 Markdown 표 양식으로 렌더링하고 경계 조건을 회귀 테스트로 고정한다.

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
- `docs/design-docs`
- `docs/quality`
- `docs/plans/state`

#### 구현 항목

- [ ] Red 단계에서 시간 분석 섹션이 `실행 시간 요약`, `Task별 소요 시간`, `전체 phase 분석`, `해석 메모` 순서로 구성되고 각 분석 영역이 Markdown 표로 출력되어야 한다는 실패 테스트를 먼저 추가한다.
- [ ] `실행 시간 요약` 표에 timing 기록 Task 수, timing 미기록 Task 수, 전체 Worker 시간, 전체 미귀속 시간과 비율을 사람이 읽는 분·초 및 원본 ms와 함께 표시한다.
- [ ] `Task별 소요 시간` 표에 Task 번호·제목, 실행 상태, Worker 시간, 전체 대비 비율, 미귀속 시간과 Task 대비 비율, timing 분류를 Task 번호순으로 표시한다.
- [ ] timing이 없는 failed·blocked·legacy Task도 Task별 표에서 누락하지 않고 시간·비율·분류를 `미기록`으로 표시하며, timing 관측 오류가 있으면 기존 Task 상세의 관측 상태와 분리 규칙을 유지한다.
- [ ] `전체 phase 분석` 표는 `analysis`, `test_code`, `implementation`, `implementation_and_test`, `refactor`, `documentation`, `verification`, `finalization` 순서로 phase별 합계, 전체 Worker 시간 대비 비율, tool 호출 수, tool 실행 시간, 명시·추론 분류를 표시한다.
- [ ] 각 Task의 `Worker 시간` 상세는 Area와 Run ID를 유지하고, canonical phase별 소요 시간, Task 대비 비율, tool 호출 수, tool 실행 시간, 명시·추론 분류를 Markdown 표로 표시한다.
- [ ] 관측되지 않은 phase는 실제 0ms로 오인되지 않도록 `미기록`으로 표시하고, timing은 있으나 전체 시간이 0ms인 경우 비율을 `분석 불가`로 표시하여 0으로 나누지 않는다.
- [ ] 사람 읽기 시간, 원본 ms, 소수점 첫째 자리 비율 등 기존 계산·반올림 계약을 유지한다.
- [ ] 유효한 timing은 Task 성공·실패·timeout과 관계없이 집계하고 timing 없는 Task는 0ms로 대체하지 않는다.
- [ ] `phase.duration_ms`는 경과 시간 구간이고 `tool_duration_ms`는 phase 경계를 걸쳐 중복될 수 있는 별도 관측값이므로 서로 더하거나 Worker 전체 시간에 가산하지 않는다는 내용을 `해석 메모`에 명확히 표시한다.
- [ ] 기존 실행 메타데이터, 최종 피드백, Worker 수행 내용, 검증 결과, Quality Score, 남은 문제, Notion Page 제목과 단일 게시 정책을 유지한다.
- [ ] `build_execution_report`가 만든 표 중심 시간 분석 본문이 기존 CLI에서 `publish_report`로 변경 없이 한 번 전달되는지 회귀 테스트로 확인한다.
- [ ] Harness 실행 문서에 표 중심 시간 분석 섹션의 출력 항목과 미기록·중복 시간 처리 규칙을 실제 구현과 일치하도록 갱신한다.
- [ ] Green 단계에서 최소 구현으로 신규·기존 관련 테스트를 통과시키고, Refactor 단계에서 표 행 생성과 집계·포맷 책임을 명확한 함수로 정리한 뒤 같은 테스트를 다시 통과시킨다.

#### TDD 정책

- REQUIRED

Report 출력 계약을 변경하는 신규 기능이므로 `Red → Green → Refactor` 순서와 각 단계의 테스트 결과를 실행 기록에 남긴다.

#### 검증 항목

- [ ] Red 단계에서 새 표 양식 테스트가 기존 bullet 출력 때문에 의도대로 실패한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_runner_modules.py'`가 Green 및 Refactor 단계에서 통과한다.
- [ ] 테스트에서 네 개 시간 분석 하위 섹션의 순서와 Markdown 표 헤더·행 구성을 검증한다.
- [ ] 테스트에서 전체 요약과 Task별 표의 시간, 전체·Task 대비 비율, 상태, 미귀속 시간, timing 분류 및 Task 번호순 정렬을 검증한다.
- [ ] 테스트에서 전체 phase 표와 Task 상세 phase 표의 canonical 순서, 시간·비율, tool 호출 수·실행 시간, 명시·추론 분류를 검증한다.
- [ ] 테스트에서 일부·전체 timing 미기록, 관측 오류, 0ms, success, failure, timeout, blocked, legacy 입력을 검증한다.
- [ ] 테스트에서 phase duration과 tool duration을 합산하지 않으며 해석 메모에 중복 가능성과 비가산 원칙이 표시되는지 확인한다.
- [ ] 테스트에서 표 중심 시간 분석 본문이 기존 Notion 게시 payload에 포함되고 게시 호출이 한 번만 발생하는지 확인한다.
- [ ] `git diff --check -- .agents/skills/harness-exec/scripts/harness_runner/report.py .agents/skills/harness-exec/tests/test_harness_runner_modules.py .agents/skills/harness-exec/SKILL.md`가 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- Notion Report의 전체 및 Task별 시간 분석을 Markdown 표로 비교할 수 있어야 한다.
- timing 미기록과 0ms가 구분되고 phase duration과 tool duration이 중복 합산되지 않아야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- Red 단계 실패 증거 또는 Green·Refactor 통과 증거 누락
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 표에서 timing 미기록 Task 또는 canonical phase가 누락됨
- timing 미기록을 0ms로 표시하거나 phase duration과 tool duration을 합산함
- 기존 Notion 게시 정책 또는 Report의 비시간 핵심 섹션을 변경함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Worker 로그 schema, timing 수집 및 phase 판정 로직 변경
- 개별 tool 이름·명령별 분석처럼 현재 timing 모델에 없는 데이터 추가
- Notion MCP 인증, 상위 Page, 게시 방식 또는 외부 서비스 설정 변경
- 기존 Notion Page와 과거 실행 로그의 수정·마이그레이션
- Backend, Frontend 제품 기능 및 조직도 구현 변경
- phase 종류의 추가·삭제 또는 의미 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 결과와 기존 Notion 게시 흐름이 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- Harness 실행 문서와 실제 표 중심 Report 출력 계약이 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 표 중심 양식에서 전체·Task별·phase별 분석이나 해석 메모가 누락됨
- timing 미기록·0ms·상태별 경계 조건이 명확히 구분되지 않음
- 기존 Notion 게시 흐름 또는 Worker timing 계약과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
