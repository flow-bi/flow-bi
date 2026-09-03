# 작업 계획: harness-phase-marker-path-01

## 1. 기본 정보

### 사용자 요청

Worker 실행 환경에서 `worker_runner.phase_marker` 모듈을 찾지 못해 Harness phase 시간이 미기록되는 문제를 해결하고, 다음 Harness 실행부터 phase별 작업 시간이 정상적으로 기록되게 한다.

### 작업 목적

Harness가 Worker에 전달하는 Python 실행 환경의 module search path에 저장소의 `.agents/scripts`를 안전하게 포함하여 기존 phase marker 명령이 어느 Task 작업 디렉터리에서도 실행되게 한다. 부모 환경의 기존 `PYTHONPATH`는 보존하고 중복 경로와 비밀값 노출 없이 subprocess 수준 회귀 테스트로 실제 module import 가능성을 검증한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `.agents/skills/harness-exec/SKILL.md`, `.agents/scripts/worker_runner/prompts/execution-guidance.md`

---

## 2. 실행 Task

### Task 1. Worker phase marker module path 전달 수정

#### 선행 Task

- `없음`

#### 작업 목적

Worker 환경 구성 단계에서 `.agents/scripts` 절대 경로를 `PYTHONPATH`에 정확히 한 번 추가하고 보호하여, phase marker module 실행이 성공하고 다음 Harness run의 명시적 phase 이벤트가 부모 수집기로 전달될 수 있게 한다.

#### 수정 가능 경로

- `.agents/skills/harness-exec/scripts/harness_runner/preparation`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.codex/hooks`
- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: `build_worker_environment`가 생성한 환경으로 저장소 루트에서 `FLOW_BI_PYTHON_EXECUTABLE -m worker_runner.phase_marker`를 실행할 때 module import가 실패하는 현재 문제를 재현하는 subprocess 회귀 테스트를 먼저 작성하고 의도한 실패 결과를 기록한다.
- [ ] Red: 부모 `PYTHONPATH`가 비어 있는 경우와 기존 경로 및 `.agents/scripts` 중복을 포함한 경우 모두 저장소 `.agents/scripts` 절대 경로가 정확히 한 번만 앞에 위치하고 기존의 서로 다른 경로 순서는 보존되어야 한다는 환경 계약을 테스트로 고정한다.
- [ ] Green: Worker 공통 환경에 저장소 `.agents/scripts` 절대 경로를 prepend한 `PYTHONPATH`를 구성하고 Task별 override가 해당 보호값을 덮어쓰지 못하도록 기존 보호 환경변수 정책에 포함한다.
- [ ] Green: 생성된 Worker 환경과 임시 run 환경을 사용한 subprocess에서 `worker_runner.phase_marker`가 import되고, 유효 phase 및 인증된 loopback 수집기 조건에서 phase 이벤트가 기록되는 최소 통합 경계를 검증한다.
- [ ] Refactor: 경로 정규화와 중복 제거를 기존 환경 구성 책임 안의 작은 함수로 정리하고 PATH·Java·temp·부모 세션 환경 계약에 영향을 주지 않도록 관련 회귀 테스트를 다시 실행한다.

#### TDD 정책

- REQUIRED

#### 검증 항목

- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker_timing.py'`로 module import, 기존 phase 이벤트 수집, 정상·실패·timeout timing 계약을 검증한다.
- [ ] 추가한 환경 회귀 테스트로 빈 값·기존 값·중복 값의 `PYTHONPATH` 병합, 절대 경로 사용, Task override 차단 및 부모 환경 불변성을 검증한다.
- [ ] subprocess 회귀 테스트에서 준비된 Worker 환경으로 `worker_runner.phase_marker` module이 실제 로드되고 유효한 phase 이벤트가 loopback 수집기에 도달하는지 확인한다.
- [ ] `python -m compileall -q .agents/skills/harness-exec/scripts/harness_runner/preparation .agents/skills/harness-exec/tests`로 변경한 Python 모듈과 테스트의 문법을 정적 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 요구사항 `R1`인 Worker subprocess의 `worker_runner.phase_marker` module import가 준비된 환경에서 성공해야 한다.
- 요구사항 `R2`인 저장소 `.agents/scripts` 절대 경로의 단일 prepend, 기존 `PYTHONPATH` 보존, Task override 차단이 검증되어야 한다.
- 요구사항 `R3`인 명시적 phase 이벤트의 인증된 loopback 수집기 전달이 subprocess 통합 테스트로 확인되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 PATH, Java, temp, 부모 session 및 Worker timing 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 준비된 Worker 환경에서 `worker_runner.phase_marker` import 또는 이벤트 전송이 실패함
- `.agents/scripts`가 `PYTHONPATH`에 없거나 중복되고 기존의 서로 다른 경로가 손실됨
- Task별 환경 override가 보호된 `PYTHONPATH`를 변경함
- phase marker 경로 또는 수집기 인증정보가 로그나 결과에 노출됨
- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `85` 미만임

#### 제외 범위

- Worker phase 종류, timing 집계 수식, raw/tree log schema 또는 Notion Report 양식 변경
- 기존 완료 Plan, 과거 실행 로그와 과거 Notion Page의 소급 수정
- 시스템 전역 Python 환경, shell profile 또는 사용자 전역 환경변수 변경
- 제품 Frontend·Backend 코드, API, DB, 인증·권한 정책 변경

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
- 준비된 Worker 환경에서 phase marker module과 loopback 이벤트 전송이 실제 subprocess로 검증되어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 다음 Harness 실행에서도 module import 실패로 명시적 phase timing을 기록할 수 없음
- 남은 문제가 사용자 확인 없이 방치됨
