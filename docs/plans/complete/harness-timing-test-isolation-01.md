# 작업 계획: harness-timing-test-isolation-01

## 1. 기본 정보

### 사용자 요청

Harness phase timing 작업에서 생긴 불필요한 수정과 구현을 정리하고, 필요한 변경만 남긴다.

### 작업 목적

phase timing 검증 추가 과정에서 기존의 광범위한 회귀 테스트 파일 세 개가 대량 교체됐다. 기존 파일은 원래 내용을 보존하고, timing 기능에 필요한 신규 검증만 별도 소형 테스트 파일에 격리하여 최소 변경 원칙과 테스트 보존 요구를 충족한다. 전체 Harness 테스트에 이미 존재하는 legacy import/API 불일치는 이번 범위에서 숨기거나 확장하지 않는다.

### 작업 유형

- refactor
- test

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `없음`

---

## 2. 실행 Task

### Task 1. 기존 테스트 복원 및 timing 전용 테스트 격리

#### 선행 Task

- `없음`

#### 작업 목적

HEAD의 기존 테스트 파일 세 개를 내용 변경 없이 복원하고, 이번 timing 작업에서 새로 필요해진 복수 실행 timing·phase prompt·phase marker PYTHONPATH 검증만 별도 테스트 파일로 옮긴다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/tests/test_harness_runner_modules.py`
- `.agents/skills/harness-exec/tests/test_harness_worker_prompt.py`
- `.agents/skills/harness-exec/tests/test_worker_runner_environment.py`
- `.agents/skills/harness-exec/tests/test_harness_timing_runs.py`
- `.agents/skills/harness-exec/tests/test_harness_phase_prompt.py`
- `.agents/skills/harness-exec/tests/test_worker_phase_marker_environment.py`

#### 수정 금지 경로

- `.agents/scripts/worker_runner/`
- `.agents/skills/harness-exec/scripts/harness_runner/`
- `.codex/hooks/`
- `backend/`
- `frontend/`

#### 구현 항목

- [ ] `test_harness_runner_modules.py`, `test_harness_worker_prompt.py`, `test_worker_runner_environment.py`를 HEAD와 동일하게 복원한다.
- [ ] 복수 Worker 실행의 purpose·attempt·timing 보존 검증을 `test_harness_timing_runs.py`에 둔다.
- [ ] phase marker prompt 순서·context·허위 implementation phase 방지 검증을 `test_harness_phase_prompt.py`에 둔다.
- [ ] PYTHONPATH prepend·보호 및 실제 subprocess phase event 전달 검증을 `test_worker_phase_marker_environment.py`에 둔다.
- [ ] 새 테스트에서 timing 요구와 무관한 기존 계약을 중복 구현하지 않는다.
- [ ] 기존 테스트를 삭제·skip하거나 단언을 약화하지 않는다.

#### TDD 정책

- REGRESSION_ONLY

#### 검증 항목

- [ ] `git diff --exit-code HEAD -- .agents/skills/harness-exec/tests/test_harness_runner_modules.py .agents/skills/harness-exec/tests/test_harness_worker_prompt.py .agents/skills/harness-exec/tests/test_worker_runner_environment.py`가 통과한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_timing_runs.py'`가 통과한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_phase_prompt.py'`가 통과한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_phase_marker_environment.py'`가 통과한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_timing.py'`와 `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_harness_time_report.py'`가 통과한다.
- [ ] `node --test .codex/hooks/tests/worker-time-logging.test.mjs`가 통과한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/tests`가 통과한다.
- [ ] 전체 `test_*.py` 실행 결과를 HEAD baseline의 legacy import/API 실패와 비교해 신규 실패가 없는지 기록한다.
- [ ] `git diff --stat`으로 대량 테스트 삭제가 이번 변경 diff에서 제거됐는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 기존 세 테스트 파일의 HEAD 대비 diff가 없어야 한다.
- 신규 timing 전용 테스트가 독립 실행 가능해야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- 기존 테스트 삭제·skip 또는 단언 약화
- `quality_score`가 기준 미달

#### 제외 범위

- legacy Harness 테스트와 현재 구현 사이의 기존 불일치 전면 수정
- timing 수집·보고 구현 재설계
- 제품 코드, API, DB, 인증·권한 변경

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
- 기존 세 테스트 파일의 HEAD 대비 diff가 없어야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
