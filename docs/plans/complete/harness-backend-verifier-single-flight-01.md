# 작업 계획: harness-backend-verifier-single-flight-01

## 1. 기본 정보

### 사용자 요청

동일 Harness Task Worker가 완료되지 않은 Backend build 검증을 새 명령으로 다시 호출하여 중복 요청과 HTTP 429가 발생하고, 먼저 시작한 build가 성공했는데도 Task가 검증 실패로 판정되는 문제를 해결한다.

### 작업 목적

Backend verifier가 실행 중인 동일 검증 요청을 하나의 single-flight 실행으로 결합해 Gradle 프로세스를 한 번만 실행하고 모든 동일 요청자에게 같은 최종 결과를 반환하도록 한다. 또한 Worker가 장시간 실행 중인 shell 명령을 새 verifier 호출로 재시도하지 않고 기존 실행의 완료를 기다리며, 최종 판정에는 완료된 최신 검증 결과만 사용하도록 실행 지침을 명확히 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `없음`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `.agents/skills/harness-exec/SKILL.md`, `docs/plans/z_archive/harness-backend-verifier-01.md`, `docs/plans/z_archive/harness-worker-decision-01.md`

---

## 2. 실행 Task

### Task 1. Backend verifier 동일 요청 single-flight 처리

#### 선행 Task

- `없음`

#### 작업 목적

동일한 Backend Gradle 또는 formatter 요청이 첫 실행 완료 전에 다시 들어오면 새 프로세스를 시작하거나 HTTP 429로 실패시키지 않고 진행 중인 실행에 합류시켜 동일한 완료 결과를 반환한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner/backend_verifier.py`
- `.agents/skills/harness-exec/tests/test_backend_verifier.py`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `.agents/skills/harness-plan`
- `.agents/skills/harness-exec/scripts/harness_runner`

#### 구현 항목

- [ ] Red: 지연된 `build`가 실행 중일 때 동일 인자의 두 번째 요청을 보내면 현재 구현이 HTTP 429를 반환하는 현상을 재현하고, 요구 동작인 단일 subprocess 실행과 두 요청의 동일 최종 결과 반환을 단언하는 실패 테스트를 먼저 작성하여 의도한 이유로 실패함을 기록한다.
- [ ] 검증 종류와 검증된 인자를 기반으로 실행 중 요청의 안정적인 key를 구성하고, 같은 key의 동시 요청은 최초 요청이 소유한 실행에 합류하도록 thread-safe single-flight 조정 로직을 구현한다.
- [ ] 합류한 요청은 별도 Gradle 또는 formatter 프로세스를 시작하지 않고 최초 실행의 `returncode`, `output`, `timed_out`을 그대로 반환하며 성공·실패·timeout 결과를 모두 동일하게 공유한다.
- [ ] 최초 실행이 예외 또는 timeout으로 종료되어도 모든 대기 요청을 해제하고 실행 중 상태를 정리하여 deadlock이나 영구 점유가 남지 않도록 한다.
- [ ] 인자 또는 검증 종류가 다른 동시 요청은 기존 직렬 실행 보호를 유지하고 동일 요청으로 잘못 합치지 않으며, allowlist·token·localhost·고정 작업 디렉터리·shell 미사용 계약을 변경하지 않는다.
- [ ] 완료된 요청 결과를 장기 cache하지 않아 코드 수정 후 같은 명령을 명시적으로 재실행하면 새로운 subprocess가 실행되도록 한다.
- [ ] Green 최소 구현 후 single-flight 상태와 동기화 책임을 명확한 내부 단위로 정리하고 Red → Green → Refactor 각 단계의 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python .agents/skills/harness-exec/tests/test_backend_verifier.py`로 동일 `build` 동시 요청의 단일 subprocess 실행, 동일 성공 결과 공유, 실패·timeout 전파, 대기 해제, 서로 다른 요청의 비결합, 완료 후 정상 재실행을 검증한다.
- [ ] 기존 테스트로 인증 실패, 허용되지 않은 Gradle 인자, 고정 wrapper·작업 디렉터리, formatter 경로 계약과 원본 파일 보호가 유지되는지 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner`로 변경된 Python 코드의 구문과 import 가능성을 검증한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner/backend_verifier.py .agents/skills/harness-exec/tests/test_backend_verifier.py`로 patch 형식 오류와 후행 공백이 없는지 검증한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 동일 범위 재검증을 반복하고, 이후에도 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 동일 실행 중 Backend 검증 요청 수와 관계없이 해당 key의 실제 subprocess는 정확히 한 번만 실행되고 모든 요청자가 같은 최종 결과를 받아야 한다.
- 기존 verifier 보안 경계와 서로 다른 검증의 동시 실행 방지에 회귀가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Compile 검증 실패
- 동일 요청이 두 개 이상의 Gradle 또는 formatter subprocess를 시작함
- 동일 요청의 합류자가 HTTP 429 또는 최초 실행과 다른 결과를 받음
- 다른 인자 또는 다른 검증 종류의 요청을 같은 실행 결과로 잘못 결합함
- 실패·timeout·예외에서 대기 요청이 해제되지 않거나 실행 상태가 남음
- 완료 결과를 재사용하여 코드 변경 뒤의 명시적 재검증을 생략함
- 인증, allowlist, 경로 격리 또는 shell 미사용 계약을 약화함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- `quality_score`가 기준 미달

#### 제외 범위

- 제품 Backend·Frontend 코드 또는 제품 테스트 변경
- Gradle Task, timeout 또는 품질 게이트 완화
- 여러 Harness 프로세스 사이의 분산 single-flight 또는 영구 결과 cache
- Worker sandbox 권한 확대
- Browser·Frontend verifier의 동시성 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Worker 실행 중 명령 재호출 방지 및 결과 정합성 지침

#### 선행 Task

- `Task 1`

#### 작업 목적

Worker가 Backend verifier CLI의 완료 전 shell 상태를 실패나 무응답으로 오인해 새 명령을 시작하지 않고 기존 실행을 계속 기다리며, 최종 JSON에는 실제로 완료된 검증 결과를 일관되게 반영하도록 한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner/invocation.py`
- `.agents/skills/harness-exec/tests/test_worker_runner.py`
- `.agents/skills/harness-exec/SKILL.md`

#### 수정 금지 경로

- `backend`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `.agents/skills/harness-plan`
- `.agents/skills/harness-exec/scripts/harness_runner`
- `.agents/scripts/worker_runner/backend_verifier.py`

#### 구현 항목

- [ ] Red: 생성된 Worker Prompt가 실행 중인 Backend verifier shell 명령의 기존 실행을 기다리거나 polling해야 한다는 계약과 중복 CLI 호출 금지를 포함하지 않는 현상을 재현하는 실패 테스트를 먼저 작성한다.
- [ ] Backend 검증 지침에 shell 도구가 진행 중 상태 또는 실행 session을 반환하면 같은 verifier CLI를 새 shell 명령으로 시작하지 말고 기존 실행을 wait/poll하여 최종 종료 코드와 출력을 확인하도록 명시한다.
- [ ] 같은 명령의 재실행은 이전 실행이 확정적으로 종료되고, 실패 원인을 수정했거나 명시적인 재검증이 필요한 경우에만 허용하도록 실패 후 재실행 지침을 구체화한다.
- [ ] HTTP 429 등 실행 중 충돌 응답만으로 필수 검증을 실패 처리하지 않고 기존 실행의 최종 결과를 먼저 확인하며, 나중에 도착한 실제 완료 결과와 모순되는 `automated_verification` 또는 `decision`을 제출하지 않도록 안내한다.
- [ ] Backend verifier 외의 Harness Skill 재호출 금지, 부모 verifier 사용, Gradle 직접 실행 금지, TDD와 최종 JSON 계약은 그대로 유지한다.
- [ ] `.agents/skills/harness-exec/SKILL.md`에 실행 중 verifier 명령의 중복 호출 금지와 동일 요청 single-flight 동작을 현재 구현과 일치하도록 간단히 기록한다.
- [ ] Green 최소 지침 변경 후 중복되거나 모호한 재실행 표현을 정리하고 Red → Green → Refactor 각 단계의 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `python .agents/skills/harness-exec/tests/test_worker_runner.py`로 신규·재실행 Worker Prompt 모두에 기존 shell 실행 wait/poll, 중복 verifier CLI 금지, 확정 종료 후 재실행, 최종 결과 정합성 지침이 포함되는지 검증한다.
- [ ] `python .agents/skills/harness-exec/tests/test_backend_verifier.py`를 다시 실행해 Task 1의 single-flight 계약과 Worker 지침이 일치하는지 검증한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`로 전체 Worker와 Harness Python 구문을 검증한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner/invocation.py .agents/skills/harness-exec/tests/test_worker_runner.py .agents/skills/harness-exec/SKILL.md`로 patch 형식 오류와 후행 공백이 없는지 검증한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 동일 범위 재검증을 반복하고, 이후에도 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- Worker가 진행 중인 Backend verifier shell 실행을 새 CLI 호출로 중복 시작하도록 안내받지 않아야 한다.
- Worker 최종 결과가 실행 중 충돌 응답과 나중에 완료된 실제 검증 결과를 서로 모순되게 보고하지 않아야 한다.
- 기존 Harness 실행·TDD·검증·판정 계약에 회귀가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Compile 검증 실패
- Worker Prompt가 진행 중 명령에 새 verifier CLI 재호출을 허용하거나 유도함
- 확정적인 종료 결과 없이 429 또는 중간 상태만으로 필수 검증을 실패 처리하도록 안내함
- 실제 실패 결과를 숨기거나 성공으로 변환하도록 안내함
- Worker가 Gradle을 직접 실행하거나 Harness Skill을 재호출하도록 계약을 약화함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- `quality_score`가 기준 미달

#### 제외 범위

- Worker 도구 런타임 자체의 session 관리 방식 변경
- Harness Runner가 Worker의 검증 결과를 임의로 PASS로 교정하는 기능
- 제품 코드와 제품 검증 결과의 수정 또는 재판정
- Browser·Frontend verifier Prompt의 재실행 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. Worker 검증 환경 및 Harness 회귀 정합성 복구

#### 선행 Task

- `Task 2`

#### 작업 목적

Task 2 전체 회귀에서 드러난 Worker sandbox 임시 경로 권한과 Python 실행 경로 수집 누락을 복구하고, 현재 Harness Runner 결과 계약과 맞지 않는 테스트 fixture를 정합화하여 single-flight 변경을 전체 회귀로 신뢰성 있게 검증한다.

#### 수정 가능 경로

- `.agents/scripts/worker_runner/codex.py`
- `.agents/scripts/worker_runner/config.toml`
- `.agents/scripts/worker_runner/runner.py`
- `.agents/skills/harness-exec/scripts/harness_runner/execution.py`
- `.agents/skills/harness-exec/tests/test_backend_verifier.py`
- `.agents/skills/harness-exec/tests/test_worker_runner.py`
- `.agents/skills/harness-exec/tests/test_browser_verifier.py`
- `.agents/skills/harness-exec/tests/test_frontend_verifier.py`
- `.agents/skills/harness-exec/tests/test_harness_exec.py`
- `.agents/skills/harness-exec/tests/test_harness_runner_modules.py`

#### 수정 금지 경로

- `backend/src`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `.agents/skills/harness-plan`

#### 구현 항목

- [ ] Red: Harness 전체 Python 테스트의 실패 결과를 기록하고, Worker 임시 디렉터리 정리 권한 오류, 프로젝트 상위 `package.json` 읽기 경로 누락, 현재 Runner 결과 계약과 불일치하는 fixture를 각각 원인별로 확인한다.
- [ ] `backend/.gradle-user-home` 아래 Worker 임시 파일과 디렉터리를 생성·정리할 수 있도록 재귀 쓰기 권한을 부여하되 제품 Backend 소스의 읽기 전용 경계를 확대하지 않는다.
- [ ] Worker readable path 수집에 실제 `project_root`와 그 상위의 `package.json` 경로를 포함하고, Runner가 실행 시 전달받은 `project_root`를 명시적으로 전달한다.
- [ ] macOS의 `/var`와 `/private/var` 경로 별칭 및 Python 3.14에서도 formatter symlink 거부 테스트가 실제 일반 파일 formatter 실행으로 잘못 진행되지 않도록 fixture를 안정화한다.
- [ ] Harness CLI lifecycle mock은 실제 실행 보고서 계약을 충족하도록 하고, completion 결과 fixture에는 필수 결과 필드를 포함하며, `--from-task` 테스트는 유효한 Plan ID와 올바른 parser import를 사용하도록 정합화한다.
- [ ] 테스트 단언이나 품질 게이트를 약화하지 않고, 현재 production contract를 정확히 표현하는 fixture와 환경 설정만 최소 수정한다.

#### 검증 항목

- [ ] `python .agents/skills/harness-exec/tests/test_worker_runner.py`를 통과한다.
- [ ] `python .agents/skills/harness-exec/tests/test_backend_verifier.py`를 통과한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`로 Harness 전체 회귀를 통과한다.
- [ ] `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`를 통과한다.
- [ ] `git diff --check -- .agents/scripts/worker_runner .agents/skills/harness-exec/tests`를 통과한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- Worker sandbox에서 임시 디렉터리 생성과 정리가 모두 가능해야 한다.
- 프로젝트 루트가 기본값과 다른 테스트·실행에서도 해당 루트의 상위 `package.json` 읽기 경로가 전달되어야 한다.
- Harness 전체 Python 테스트가 품질 게이트 완화 없이 통과해야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 제품 Backend·Frontend 코드 권한을 확대하거나 변경함
- 테스트 삭제, 단언 약화 또는 검증 우회로 회귀 테스트를 통과시킴
- Worker 임시 경로 정리 오류 또는 readable path 누락이 남음
- Harness 전체 Python 테스트, compileall 또는 diff check 실패
- 수정 가능 경로 밖 변경
- `quality_score`가 기준 미달

#### 제외 범위

- 제품 Backend·Frontend 구현 및 테스트 변경
- Browser·Frontend verifier 동시성 정책 변경
- Harness 품질 게이트 또는 완료 조건 완화
- Worker sandbox 전체 권한 확대

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
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 지연된 Backend `build`에 동일 Task Worker가 중복 요청을 보내도 실제 Gradle build는 한 번만 실행되고 모든 요청이 같은 성공·실패·timeout 결과를 받아야 한다.
- Worker는 진행 중인 verifier shell 실행을 기다리고, 확정적으로 완료된 검증 결과만 Mandatory Gate와 최종 판정에 반영해야 한다.
- Backend verifier의 인증, allowlist, 경로 격리, timeout, formatter 적용과 서로 다른 요청의 동시 실행 방지 계약이 유지되어야 한다.
- Harness 실행기가 모든 Task 완료 후 `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_*.py'`를 한 번 실행해 전체 회귀가 없어야 한다.
- Harness 실행기가 모든 Task 완료 후 `python -m compileall -q .agents/scripts/worker_runner .agents/skills/harness-exec/scripts/harness_runner`를 한 번 실행해 전체 Python 구문을 검증해야 한다.
- 기존에 수정된 제품 Backend 파일은 되돌리거나 덮어쓰지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 품질 정책 또는 기존 Harness verifier 계약과 충돌함
- 동일 실행 중 요청이 실제 Gradle 프로세스를 중복 실행하거나 서로 다른 최종 결과를 반환함
- 진행 중 상태를 확정 실패로 처리하여 실제 성공 결과와 모순되는 Task 판정을 제출함
- 기존 제품 변경을 되돌리거나 Harness 문제 해결 범위에 포함함
- 남은 문제가 사용자 확인 없이 방치됨
