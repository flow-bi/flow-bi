# 작업 계획: calendar-09

## 1. 기본 정보

### 사용자 요청

일정 추가 시 팀과 프로젝트 대상을 원시 ID로 직접 입력하지 않고, 접근 가능한 팀과 프로젝트의 이름을 확인하여 선택할 수 있게 한다.

### 작업 목적

사용자가 알기 어려운 내부 식별자를 외워 입력하는 흐름을 제거한다. 서버가 현재 인증 사용자에게 허용된 팀과 프로젝트의 최소 식별 정보만 제공하고, 일정 추가 화면은 이름 기반 다중 선택 UI를 제공하되 기존 일정 생성 API에는 선택된 ID 배열을 그대로 전송하여 저장 계약과 접근성 검증을 유지한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `backend/BACKEND.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `CAL-TARGET-NAME-001`: 인증 사용자는 일정 추가에 사용할 수 있는 자신의 소속 팀과 참여 중인 활성 프로젝트를 `id`, `name` 조합으로 조회할 수 있다.
- `CAL-TARGET-NAME-002`: 대상 목록 API는 다른 팀, 참여하지 않은 프로젝트, 비활성 프로젝트를 반환하지 않고 인증되지 않았거나 비활성인 사용자의 요청을 안전하게 거부한다.
- `CAL-TARGET-NAME-003`: 일정 추가 모달은 `TEAM` 유형에서 팀 이름을, `PROJECT` 유형에서 프로젝트 이름을 다중 선택 가능한 컨트롤로 표시하며 원시 ID 입력 필드를 노출하지 않는다.
- `CAL-TARGET-NAME-004`: 화면에서 선택한 이름은 대응하는 ID 배열로 변환되어 기존 `teamTargetIds`, `projectTargetIds` 생성 계약으로 전송되고, 유형 전환 시 다른 유형의 대상 선택은 초기화된다.
- `CAL-TARGET-NAME-005`: 대상 목록의 로딩, 빈 결과, 조회 실패와 재시도 상태를 텍스트로 제공하고 키보드와 보조기술로 대상 이름과 선택 상태를 확인할 수 있다.
- `CAL-TARGET-NAME-006`: 이름 선택부터 일정 생성 요청까지의 핵심 흐름을 Component Test와 Cypress E2E로 검증한다.

---

## 2. 실행 Task

### Task 1. 접근 가능한 일정 대상 이름 조회 API

#### 선행 Task

- `없음`

#### 작업 목적

현재 인증 사용자가 일정 대상으로 지정할 수 있는 소속 팀과 참여 중인 활성 프로젝트만 이름과 ID로 제공하는 보호 API를 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule/controller`
- `backend/src/main/java/com/flowbi/domain/schedule/dto`
- `backend/src/main/java/com/flowbi/domain/schedule/service`
- `backend/src/main/java/com/flowbi/domain/schedule/repository`
- `backend/src/test/java/com/flowbi/domain/schedule/controller`
- `backend/src/test/java/com/flowbi/domain/schedule/repository`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [x] Red: `GET /api/schedules/target-options`가 인증 사용자의 소속 팀과 참여 중인 활성 프로젝트를 최상위 `teams`, `projects` 목록과 각 항목의 `id`, `name` 필드로 반환하는 Controller 및 PostgreSQL 통합 테스트를 먼저 작성하고, Endpoint가 없어 실패하는 결과를 기록한다.
- [x] Red: 다른 팀, 참여하지 않은 프로젝트와 비활성 프로젝트가 응답에서 제외되고, 인증되지 않은 요청은 `401 Unauthorized`, 비활성 Actor는 기존 안전한 인증 실패 계약으로 거부되는 테스트를 작성한다.
- [x] Green: 일정 대상 선택 전용 DTO와 Service 경계를 추가하고, `ScheduleController`가 검증된 `LoginPrincipal`의 내부 사용자 ID만 사용해 대상 목록을 조회하도록 구현한다.
- [x] Green: JDBC Adapter는 기존 일정 생성 참조 검증과 같은 접근 정책을 재사용하여 Actor의 소속 팀과 활성 프로젝트 참여 관계를 파라미터 바인딩 Query로 조회하고, 각 목록을 이름과 ID의 안정적인 순서로 반환한다.
- [x] Green: 응답은 선택에 필요한 `id`, `name` 외의 직원 정보, 프로젝트 참여자 정보와 내부 상태를 포함하지 않으며, 조회 결과를 권한 판정의 대체 수단으로 사용하지 않고 일정 생성 시 기존 서버 검증을 다시 수행한다.
- [x] Green: `backend/API.md`와 OpenAPI 계약에 보호 Endpoint, 성공 응답, 접근 범위, 최소 응답 필드와 오류 계약을 동기화한다.
- [x] Refactor: 대상 옵션 조회가 기존 팀·프로젝트 접근 판정과 다른 의미를 만들지 않도록 중복 Query 또는 판정 로직을 최소 범위에서 정리하고 Controller가 Repository에 직접 의존하지 않게 한다.
- [x] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 권한 범위나 테스트 단언을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [x] `backend`에서 `./gradlew test --tests "com.flowbi.domain.schedule.controller.ScheduleTargetOptionsControllerTest" --tests "com.flowbi.domain.schedule.repository.ScheduleTargetOptionsPostgresTest" --tests "com.flowbi.domain.schedule.controller.ScheduleOpenApiContractTest"`를 실행하여 인증, 최소 응답, 팀 소속, 활성 프로젝트 참여와 OpenAPI 계약을 검증한다.
- [x] 저장소 루트에서 `rg -n "target-options|teams|projects|id|name" backend/API.md backend/src/main/java/com/flowbi/domain/schedule backend/src/test/java/com/flowbi/domain/schedule`를 실행하여 Endpoint 계약과 구현·테스트 연결을 확인한다.
- [x] 저장소 루트에서 `git diff --check -- backend/src/main/java/com/flowbi/domain/schedule backend/src/test/java/com/flowbi/domain/schedule backend/API.md`를 실행하여 변경 범위의 patch 형식을 검증한다.

#### 완료 조건

- `CAL-TARGET-NAME-001`, `CAL-TARGET-NAME-002`를 충족하고 대상 이름 조회 API가 기존 일정 대상 접근 정책과 일치해야 한다.
- Red → Green → Refactor 실행 결과와 권한·데이터 최소화 검증이 기록되어야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 일정 생성·조회와 참석자 검색 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 다른 팀, 참여하지 않은 프로젝트 또는 비활성 프로젝트가 응답에 포함됨
- 요청 Body나 Query Parameter의 사용자 ID를 Actor로 신뢰하거나 인증·접근 검증을 우회함
- 이름 선택에 불필요한 개인정보, 참여자 목록 또는 내부 상태를 응답함
- Controller가 Repository에 직접 의존하거나 기존 일정 생성 참조 검증과 다른 접근 정책을 구현함
- 테스트 단언 삭제·약화, 필수 검증 실패 또는 3회 수정 후에도 같은 문제가 지속됨
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경이 발생함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 팀·프로젝트 생성, 수정, 삭제와 조직·프로젝트 관리 API
- DB Schema 또는 Migration 변경과 팀·프로젝트 이름의 유일성 정책 추가
- 일정 생성 요청의 `teamTargetIds`, `projectTargetIds` 계약 변경

#### 작업 결과

- Red: 신규 Controller·PostgreSQL·OpenAPI 테스트를 먼저 추가했고 대상 옵션 DTO가 없어 `compileTestJava`가 실패하는 것을 확인했다.
- Green: DTO, Service, JDBC 조회와 Controller Endpoint를 구현한 뒤 지정 테스트가 `BUILD SUCCESSFUL`로 통과했다.
- Refactor: Controller가 Repository에 직접 의존하지 않도록 Service 경계를 유지하고 formatter 적용 후 `spotlessCheck`를 통과했다.
- 검증: 지정 테스트, 전체 Backend `test`, `spotlessCheck`, `build`, 계약 검색과 `git diff --check`를 통과했다.
- 필수 Gate: 요구사항, 범위, 권한·보안, TDD, 자동 검증, 계약 동기화와 Critical Finding 검사가 모두 `PASS`였다.
- `quality_score`: `94`

#### 남은 문제

`none`

---

### Task 2. 일정 추가 대상 이름 선택 UI 및 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

일정 추가 모달에서 원시 팀·프로젝트 ID 입력을 제거하고, 서버가 허용한 이름 목록을 키보드로 선택하여 기존 ID 배열 생성 요청으로 전송할 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-create`
- `frontend/cypress/e2e/calendar`
- `frontend/cypress/e2e/schedule-management.cy.ts`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/schedule-calendar`
- `frontend/src/shared`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [x] Red: 일정 대상 옵션 API 타입·조회 함수와 생성 모달 Component Test를 먼저 작성하여 팀·프로젝트 이름 표시, 다중 선택, 원시 ID 입력 부재, 선택 ID 전송, 유형 전환 초기화를 단언하고 현재 UI에서 실패하는 결과를 기록한다.
- [x] Red: 로딩, 빈 목록, `401`·`403`을 포함한 조회 오류, 재시도와 필수 대상 미선택 오류가 화면에서 구분되는 테스트를 작성하고 오류를 빈 목록이나 성공 상태로 변환하지 않는지 검증한다.
- [x] Green: `scheduleCreateApi`에 `GET /api/schedules/target-options` 응답 타입과 `authenticatedFetch` 기반 조회 함수를 추가하고 TanStack Query가 대상 옵션의 로딩·오류·재시도 상태를 소유하게 한다.
- [x] Green: `TEAM` 유형은 접근 가능한 팀 이름, `PROJECT` 유형은 참여 중인 활성 프로젝트 이름을 `fieldset`·`legend`와 이름 레이블을 가진 체크박스 목록으로 표시하고, 원시 `팀 대상 ID`·`프로젝트 대상 ID` 입력을 제거한다.
- [x] Green: 체크박스 선택은 React Hook Form의 `teamTargetIds`, `projectTargetIds`에 ID만 저장하고 기존 `CreateScheduleRequest` 계약을 변경하지 않으며, 일정 유형 전환 시 다른 유형의 선택을 비운다.
- [x] Green: 목록 로딩 중 안내, 선택 가능한 대상이 없는 빈 상태, 조회 실패 Alert와 재시도 버튼, 필수 대상 미선택 오류를 해당 컨트롤과 연결하고 제출 중 중복 요청 방지와 기존 모달 닫기·초점 복귀 동작을 유지한다.
- [x] Green: 이름이 화면과 접근 가능한 이름에 표시되고 원시 ID가 사용자용 Label이나 도움말로 노출되지 않으며, 데스크톱과 390px 모바일에서 목록이 모달 밖으로 overflow되지 않게 한다.
- [x] Green: 기존 `schedule-management.cy.ts`의 ID 직접 입력 흐름을 이름 선택 계약으로 갱신하고 `frontend/cypress/e2e/calendar`에 이름 선택 후 생성 요청의 ID 배열을 검증하는 Cypress 시나리오를 추가한다.
- [x] Refactor: 대상 옵션 Query, 선택 상태와 API 변환 책임을 `schedule-create` 기능 경계에 유지하고 참석자 검색 및 일정 생성 Query Key와 충돌하지 않도록 정리한다.
- [x] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 원시 ID 입력을 복구하거나 테스트를 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [x] `frontend`에서 `npm run test:unit -- src/features/schedule-create/ScheduleCreateModal.test.tsx`를 실행하여 이름 표시, 다중 선택, ID 변환, 유형 전환, 로딩·빈 상태·오류·재시도와 접근 가능한 오류 연결을 검증한다.
- [x] `frontend`에서 `npm run typecheck`와 `npm run lint -- src/features/schedule-create cypress/e2e/calendar cypress/e2e/schedule-management.cy.ts`를 실행하여 API 타입, Form 타입과 변경 범위 정적 검증을 수행한다.
- [x] `frontend`에서 `npx cypress run --spec "cypress/e2e/calendar/schedule-target-name-selection.cy.ts,cypress/e2e/schedule-management.cy.ts"`를 실행하여 이름 선택과 생성 요청 ID 배열을 실제 브라우저 흐름으로 검증한다.
- [x] Task 1의 API 응답 필드와 Frontend 타입·이름 선택·ID 전송 흐름이 충돌 없이 통합되고 기존 일정 생성 및 참석자 검색에 회귀가 없는지 Component Test와 Cypress 결과로 확인한다.
- [x] 저장소 루트에서 `rg -n "팀 대상 ID|프로젝트 대상 ID" frontend/src/features/schedule-create frontend/cypress/e2e` 결과가 0건이고, `rg -n "target-options|teamTargetIds|projectTargetIds" frontend/src/features/schedule-create frontend/cypress/e2e`가 조회와 전송 계약을 찾는지 확인한다.
- [x] 저장소 루트에서 `git diff --check -- frontend/src/features/schedule-create frontend/cypress/e2e/calendar frontend/cypress/e2e/schedule-management.cy.ts`를 실행하여 변경 범위의 patch 형식을 검증한다.

#### 완료 조건

- `CAL-TARGET-NAME-003`부터 `CAL-TARGET-NAME-006`까지 충족하고 사용자가 내부 ID를 직접 입력하지 않아도 일정 대상을 지정할 수 있어야 한다.
- Red → Green → Refactor 실행 결과와 Component·Cypress 검증이 기록되어야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 일정 생성, 참석자 검색, 유형별 공개 범위, 중복 제출 방지와 모달 접근성에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 팀 또는 프로젝트의 원시 ID 입력 필드가 일정 추가 화면에 남음
- 화면 선택과 요청의 ID 배열이 불일치하거나 유형 전환 후 다른 유형 대상이 전송됨
- 로딩·빈 상태·오류를 구분하지 않거나 API 실패를 빈 목록 또는 성공으로 표시함
- 키보드로 이름 목록을 선택할 수 없거나 Label·오류 연결이 누락됨
- 실제 API와 다른 Mock으로 Component 또는 Cypress 테스트를 통과시킴
- 테스트 단언 삭제·약화, 필수 검증 실패 또는 3회 수정 후에도 같은 문제가 지속됨
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경이 발생함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 일정 상세·수정 모달의 팀·프로젝트 ID 표시 또는 입력 개선
- 팀·프로젝트 검색, 페이지네이션, 즐겨찾기와 최근 선택 기능
- 팀·프로젝트 이름 변경과 중복 이름 관리 정책

#### 작업 결과

- Red: 대상 이름 선택, 오류·재시도와 유형 전환 테스트를 먼저 추가했고 기존 UI에서 신규 테스트 3건이 실패하는 것을 확인했다.
- Green: API 타입·조회, TanStack Query와 이름 기반 체크박스 UI를 구현하고 선택 결과가 기존 ID 배열로 전송되도록 연결했다.
- Refactor: 대상 옵션 Query Key를 분리하고 조회·선택·변환 책임을 `schedule-create` 기능 경계에 유지했다.
- 검증: Frontend 단위 테스트 127건, `typecheck`, 변경 범위 ESLint, Cypress와 `git diff --check`를 통과했다.
- 필수 Gate: 요구사항, 범위, 권한·보안, TDD, 자동 검증, 계약 동기화와 Critical Finding 검사가 모두 `PASS`였다.
- `quality_score`: `93`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- `CAL-TARGET-NAME-001`부터 `CAL-TARGET-NAME-006`까지 모두 충족해야 한다.
- 모든 Task의 구현 항목과 검증 항목이 통과해야 한다.
- Task 1의 접근 가능한 대상 이름 API와 Task 2의 이름 선택 UI가 기존 ID 기반 생성 계약으로 정상 통합되어야 한다.
- 각 Task가 Red → Green → Refactor 순서와 검증 결과를 실행 기록에 남겨야 한다.
- Backend 전체 `spotlessCheck`, `test`, `build`와 Frontend 전체 `check`, 관련 Cypress E2E를 Harness 최종 검증에서 통과해야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- `backend/API.md`, 서버 응답 타입과 프런트엔드 API 타입이 일치해야 한다.
- 인증·객체 접근, 데이터 최소화, TDD, 자동 검증과 Contract Sync Gate가 모두 `PASS`여야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 구현 항목 또는 검증 항목이 실패함
- 인증 사용자에게 허용되지 않은 팀·프로젝트가 노출되거나 선택·생성될 수 있음
- 원시 팀·프로젝트 ID 입력이 일정 추가 사용자 흐름에 남음
- 이름 선택 결과와 일정 생성 ID 배열이 불일치함
- Backend API 문서, 서버 DTO와 Frontend 타입이 불일치함
- 필수 테스트 단언을 삭제·약화하거나 권한·오류 검증을 우회함
- Task별 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 관련 Product Spec, Design Doc, Architecture 또는 Security 원칙과 충돌함
- 남은 문제가 사용자 확인 없이 방치되거나 전체 `quality_score`가 `90` 미만임
