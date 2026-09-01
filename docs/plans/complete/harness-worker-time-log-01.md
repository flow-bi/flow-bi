# 작업 계획: harness-worker-time-log-01

## 1. 기본 정보

### 사용자 요청

제품 기능을 변경하지 않고 Harness가 실행하는 각 Worker의 영역별 총 작업 시간, phase별 작업 시간과 tool 호출 수·실행 시간, 전체 실행 시간, phase 분류 출처, 시작·종료·실패 상태를 raw log와 집계 tree에 기록한다. 동일 Task 번호의 재실행과 Parent·Worker 기록을 분리하고, Worker가 로그 디렉터리에 직접 쓰지 않은 상태에서 인증된 localhost 부모 서비스를 통해 phase와 tool 이벤트를 기록한다. 잘못된 인증 정보·URL·phase·run ID를 거부하고 정상·실패·timeout·재실행·phase 미기록·sandbox 제한·기존 포맷 호환성을 TDD로 검증한다.

### 작업 목적

현재 run ID와 Task 번호 중심의 Worker 실행 로그를 허용 경로 기반 기존 area 분류와 phase/tool 시간 계측까지 확장하여, 실행 결과와 무관하게 Worker별 작업 분포와 실패 지점을 안전하고 일관되게 분석할 수 있게 한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Worker 실행 계측과 인증된 부모 수집 서비스

#### 선행 Task

- `없음`

#### 작업 목적

Worker의 허용 경로에서 기존 area 값을 결정하고, 부모가 소유한 인증된 localhost 서비스와 Worker용 marker 호출 경로를 통해 시작·phase·tool·종료 이벤트를 안전하게 Node 기록기로 전달한다.

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

- [ ] 먼저 Worker 시작, 명시적 phase 전환, tool 시작·종료, 정상 종료 시간 집계 계약이 구현 전에는 실패하는 Python 테스트를 작성하고 Red 결과를 기록한다.
- [ ] `worker_runner`의 `WORKERS`에 이미 정의된 area 값과 현재 frontend 허용 경로 판별 기준을 그대로 재사용하여 Task의 `allowed_paths`에서 단일 Worker area를 결정하고, 새 값 추가나 기존 값 이름 변경 없이 run 환경과 모든 로깅 이벤트에 전달한다.
- [ ] 실행마다 UUID run ID와 별도 인증 토큰을 생성하고 task number, area, 부모 session ID를 실행 컨텍스트에 결합하며, 동일 Task 번호 재실행이 서로 다른 run ID로 분리되고 상속된 이전 실행의 URL·토큰·run 값이 재사용되지 않게 한다.
- [ ] 부모 프로세스만 로그 저장 권한을 갖도록 loopback 주소에만 바인딩하는 실행별 수집 서비스를 만들고, Worker에는 localhost URL과 인증 토큰만 전달하며 외부 host URL, 잘못된 토큰, 허용 목록 밖 phase, 현재 실행과 다른 run ID, 종료된 run의 이벤트를 기본 거부한다.
- [ ] 부모 서비스가 검증된 이벤트만 Node 로그 기록기 CLI에 전달하고 그 구조화 JSON 응답을 확인하게 하며, Worker sandbox에는 `.codex-logs` 쓰기 권한을 추가하지 않는다.
- [ ] Worker가 `analysis`, `test_code`, `implementation`, `implementation_and_test`, `refactor`, `documentation`, `verification`, `finalization` 중 하나를 명시적으로 전환할 수 있는 marker CLI와 invocation 안내를 추가하고, 전환 시 이전 phase 종료 시각과 새 phase 시작 시각을 기록한다.
- [ ] Codex 실행의 구조화된 tool 시작·종료 이벤트를 run에 연결하여 tool 이름, 입력 기반 분류 정보, 시작·종료·소요 시간을 수집하고, 명시 marker가 없을 때 읽기·검색은 analysis, 테스트 파일 작업은 test_code, 제품 코드와 테스트의 동시 변경은 implementation_and_test, 구현 파일 변경은 implementation, 포맷·구조 정리는 refactor, 문서 변경은 documentation, 테스트·lint·build·문법·diff 확인은 verification, 최종 응답 처리는 finalization으로 추론하며 일치하지 않는 간격은 미귀속 시간으로 남긴다.
- [ ] phase 출처는 raw 이벤트마다 `explicit` 또는 `inferred`로 보존하고 두 출처가 한 run에 함께 있으면 집계가 이를 구분할 수 있는 혼합 상태를 표현하며, tool은 시작 시점의 phase에 귀속하고 중복·누락된 종료 이벤트를 멱등하고 안전하게 처리한다.
- [ ] Worker 시작부터 정상·실패·timeout·subprocess 예외·최종 JSON 파싱 실패까지 모든 종료 경로에서 exit code, status, summary, total duration을 한 번 기록하고 수집·기록 실패는 진단 정보로 남기되 실제 Worker 반환 코드나 실패를 성공으로 변경하거나 숨기지 않는다.
- [ ] 최소 구현으로 Python 테스트를 Green으로 만든 뒤 area 판정, 이벤트 검증, 서비스 수명주기, 시간 계산 책임을 분리해 Refactor하고 각 단계의 실행 증거를 남긴다.

#### TDD 정책

- REQUIRED

#### 검증 항목

- [ ] Worker 시작·phase·tool·종료 시간, area, 정상·실패·timeout, 동일 Task 재실행 분리, phase 미기록 추론, 잘못된 URL·토큰·phase·run ID 거부, 로깅 실패 비간섭을 다루는 Python 단위 테스트를 실행한다.
- [ ] Worker sandbox 설정에 `.codex-logs` 직접 쓰기 권한이 없고 localhost 수집 URL만 사용할 수 있음을 Python 권한·환경 테스트로 확인한다.
- [ ] `python -m unittest discover -s .agents/skills/harness-exec/tests -p 'test_worker*.py'`를 실행해 관련 Worker runner 회귀가 없는지 확인한다.
- [ ] 변경한 Python 파일에 `python -m py_compile`을 실행해 정적 문법 검사를 통과한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Red → Green → Refactor 단계와 결과가 실행 기록에 남아야 한다.
- 정상·실패·timeout에서 실제 Worker 결과와 시간 이벤트가 함께 보존되어야 한다.
- 기존 `WORKERS` area 값과 허용 경로 기반 판별 기준을 변경하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 문법 검사 실패
- Red 단계 없이 구현을 먼저 추가하거나 테스트 단언을 약화함
- Worker가 `.codex-logs`에 직접 쓰거나 비-loopback URL로 로그를 전송함
- 잘못된 토큰·phase·run ID가 허용되거나 로깅 실패가 Worker 결과를 변경함
- 실패·timeout 종료 이벤트 또는 duration이 유실됨
- 기존 area 값 추가·이름 변경 또는 허용 경로와 무관한 임의 분류가 발생함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만임

#### 제외 범위

- Node raw log·집계 tree 스키마와 저장 구현
- 제품 기능, DB schema, 공개 API, 인증·권한 정책 변경
- 기존 로그 데이터 삭제 또는 운영 배포

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Node Worker 시간 로그 집계 및 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

부모 서비스가 전달한 Worker 수명주기·phase·tool 이벤트를 기존 raw log와 tree에 하위 호환 형태로 저장하고, Python 수집 계층과 Node 기록 계층이 실제 계약대로 통합되는지 검증한다.

#### 수정 가능 경로

- `.codex/hooks`
- `.agents/skills/harness-exec/tests`

#### 수정 금지 경로

- `.agents/scripts/worker_runner`
- `.codex-logs`
- `frontend`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] 먼저 Worker start·phase·tool·end raw 이벤트와 집계 tree의 duration 계산이 구현 전에는 실패하는 Node 테스트를 작성하고, 정상·실패·timeout·재실행·phase 미기록·Parent 중복 방지·legacy 입력 시나리오의 Red 결과를 기록한다.
- [ ] Node 기록기 입력을 run ID, task number, area, session ID가 있는 Worker 이벤트와 기존 Parent·subagent 이벤트로 명확히 구분하고, Worker start에는 시작 시각과 실행 식별자를, end에는 exit code, status, summary, 종료 시각과 전체 duration을 기록한다.
- [ ] raw log의 Worker phase 시작·종료와 tool 시작·종료 이벤트에 area, run ID, task number, session ID, phase, 분류 출처, tool 식별자와 소요 시간을 기록하되 기존 record_type과 필드를 제거하거나 의미를 바꾸지 않는다.
- [ ] tree의 Worker 노드에 area와 `total_duration_ms`, `phases`, `unattributed_duration_ms`, `classification` 집계를 추가하고 각 phase 항목에 `phase`, `duration_ms`, `tool_calls`, `tool_duration_ms`와 명시·추론 출처 구분을 보존한다.
- [ ] phase 전환 시 이전 구간을 닫고, 종료 시 열린 phase와 tool을 안전하게 종결하며, 전체 실행 시간과 phase·미귀속 시간의 합 및 tool 소요 시간이 음수가 되거나 중복 집계되지 않도록 단조 시간 기준으로 계산한다.
- [ ] 동일 task number라도 run ID별 독립 Worker 노드를 유지하고 Parent의 primary 기록이나 subagent 기록을 Worker area·시간 합계에 포함하지 않으며, raw log와 tree 양쪽에서 area를 동일하게 투영한다.
- [ ] phase marker가 전혀 없는 run은 tool 입력 추론 결과를 `inferred`로 기록하고, 명시·추론이 함께 있는 run은 각 phase의 출처를 잃지 않으며, 어떤 규칙에도 귀속되지 않은 시간은 `unattributed_duration_ms`에만 포함한다.
- [ ] 기존 raw log와 tree를 읽어 새 집계를 만들 수 있는 하위 호환 로더를 유지하고, 기존 필드·노드·usage 결과를 보존하며 손상 데이터 복구와 atomic write 동작을 약화하지 않는다.
- [ ] Node CLI의 성공과 유효성 오류·인증 이후 기록 오류를 모두 단일 JSON 객체로 stdout에 반환하고 비정상 종료에서도 빈 stdout을 만들지 않으며, 토큰이나 민감한 tool 입력 원문은 raw log·오류에 기록하지 않는다.
- [ ] Python 부모 서비스가 Node CLI를 호출하는 통합 테스트를 추가하여 Worker가 로그 디렉터리 쓰기 권한 없이 명시 phase를 기록하고, 실패·timeout 종료도 raw log와 tree에 남으며, 잘못된 요청은 거부되고 Parent와 Worker가 중복 집계되지 않음을 검증한다.
- [ ] 로그 이벤트와 tree 집계 필드, 허용 phase, area 판정 출처, 명시·추론 분류, 호환성 규칙을 `.codex/hooks` 아래의 로그 스키마 문서에 기록한다.
- [ ] 최소 구현으로 Node 및 통합 테스트를 Green으로 만든 뒤 이벤트 검증·저장·집계·tree 투영 책임을 분리해 Refactor하고 각 단계의 실행 증거를 남긴다.

#### TDD 정책

- REQUIRED

#### 검증 항목

- [ ] `node --test .codex/hooks/tests/*.test.mjs`로 기존 로그 테스트와 Worker 시간 집계의 정상·실패·timeout·재실행·phase 미기록·Parent 분리·legacy 호환 시나리오를 검증한다.
- [ ] Python 부모 서비스와 실제 Node CLI 사이의 신규 통합 테스트를 실행하여 선행 Task 인터페이스와의 충돌이 없고 sandbox 제한에서도 로그가 기록되는지 확인한다.
- [ ] 변경한 `.mjs` 파일에 `node --check`를 실행하고 변경한 Python 통합 테스트에 `python -m py_compile`을 실행한다.
- [ ] raw log fixture와 생성 tree를 대조하여 area, 전체 duration, phase duration, tool 호출 수·실행 시간, 미귀속 시간, 분류 출처, status가 요구 스키마와 일치하는지 확인한다.
- [ ] `git diff --check`를 실행하고 기존 로그 파일 삭제, 제품 경로 변경, 수정 가능 경로 밖 변경이 없는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Red → Green → Refactor 단계와 결과가 실행 기록에 남아야 한다.
- Python 부모 서비스와 Node 기록기의 통합 검증이 정상·실패·timeout에서 통과해야 한다.
- raw log와 tree가 동일한 run ID·task number·area를 사용하고 Parent 기록을 Worker 집계에 포함하지 않아야 한다.
- 기존 로그 포맷과 데이터가 삭제 없이 하위 호환되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- Node 또는 Python 통합 테스트, 정적 문법 검사, `git diff --check` 실패
- Red 단계 없이 구현을 먼저 추가하거나 테스트 단언을 약화함
- Worker 시간·phase·tool 집계가 raw log와 tree에서 불일치함
- 동일 Task 재실행이 합쳐지거나 Parent·subagent 시간이 Worker 집계에 중복 포함됨
- 실패·timeout 로그 유실, 음수 duration, 열린 phase·tool의 중복 종료가 발생함
- Node CLI 오류가 빈 stdout 또는 파싱할 수 없는 출력으로 반환됨
- 기존 로그 필드 제거·의미 변경, 기존 로그 데이터 삭제 또는 손상 복구·atomic write 약화
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만임

#### 제외 범위

- 제품 화면·백엔드 기능, DB schema 또는 공개 API 변경
- 인증 정책 변경, 외부 서비스 도입, 운영 배포
- 기존 worker area 값 추가·이름 변경
- 과거 로그 데이터의 삭제 또는 파괴적 일괄 변환

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
- 관련 로그 스키마 문서와 실제 구현이 일치해야 한다.
- Harness 실행의 모든 Worker에 기존 area 정보가 기록되고 Worker 전체 시간과 phase·tool 집계가 raw log와 tree 양쪽에 남아야 한다.
- 명시 phase와 추론 phase가 구분되고 phase 미기록, 정상, 실패, timeout, 동일 Task 재실행이 각각 유실이나 혼동 없이 표현되어야 한다.
- Worker가 `.codex-logs`에 직접 쓰지 않고 인증된 localhost 부모 서비스를 통해서만 기록해야 한다.
- 관련 Python 및 Node 테스트, 정적 문법 검사와 `git diff --check`가 모두 통과해야 한다.
- 기존 로그 포맷과 데이터가 하위 호환되고 Parent·Worker 로그가 중복 집계되지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- Product Spec 또는 Design Doc과 충돌함
- 기존 worker area 분류 체계를 변경하거나 새 area를 추가함
- Worker 직접 로그 쓰기, 외부 URL 수락, 인증 우회 또는 토큰·민감 입력 로그 노출이 발생함
- 실패·timeout 로그 유실, Parent·Worker 중복 집계 또는 동일 Task 재실행 병합이 발생함
- 기존 로그 데이터 삭제, 포맷 비호환 또는 제품 기능·DB schema·공개 API·인증 정책 변경이 발생함
- 남은 문제가 사용자 확인 없이 방치됨
