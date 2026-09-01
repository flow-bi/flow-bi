# 작업 계획: meeting-room-06

## 1. 기본 정보

### 사용자 요청

회의실 예약 취소가 정상 동작하지 않는 버그를 수정하고, 회의실 예약 생성·수정 시 참석자 ID를 직접 입력하는 대신 일정 등록 화면처럼 참석자 이름을 검색해 선택하도록 개선한다.

### 작업 목적

인증된 예약 소유자가 CSRF 보호와 객체 수준 권한을 유지하면서 예약과 연결 일정을 안전하게 취소할 수 있게 한다. 회의실 예약의 참석자 입력은 기존 일정 참석자 후보 검색 계약을 재사용하여 사용자가 이름으로 검색·선택하게 하고, 서버에는 검증 가능한 내부 사용자 ID만 전달하여 사용성·권한·데이터 정합성을 함께 보장한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`, `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/API.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 회의실 예약 취소 Backend 회귀 수정

#### 선행 Task

- `없음`

#### 작업 목적

실제 로그인 Principal을 사용하는 예약 소유자의 취소 요청이 예약과 연결 일정을 하나의 트랜잭션에서 취소하고, 미인증·비소유·반복·동시 요청에서도 기존 안전한 계약을 유지하도록 결함을 수정한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red: 실제 `LoginPrincipal` 기반 인증 사용자가 `DELETE /api/room-reservations/:reservationId`를 호출하는 HTTP 회귀 테스트를 먼저 작성하여 현재 취소 실패를 재현하고, 요청 속성·Body·Query·임시 Header의 사용자 ID로 성공할 수 없음을 함께 단언한다.
- [ ] Red: 예약 소유자의 정상 취소, 비소유·미존재 대상의 동일한 `404`, 같은 소유자의 반복 취소 `204`, 동시 취소 수렴, 연결 일정 취소 실패 Rollback을 관련 Service·Persistence 테스트로 고정한다.
- [ ] Green: 인증 Principal의 내부 사용자 ID만 취소 Actor로 사용하고, 예약 잠금 조회·소유권 검증·예약과 연결 일정의 `CANCELED` 전환·취소 시각 기록이 한 트랜잭션에서 완료되도록 실패 원인의 최소 구현만 수정한다.
- [ ] Green: 성공은 Body 없는 `204`, 미인증은 `401`, 존재하지 않거나 소유하지 않은 대상은 `404`, 상태 전이 충돌은 `409 ROOM_RESERVATION_CANCEL_CONFLICT`로 유지하며 오류 응답으로 대상 존재 여부를 노출하지 않는다.
- [ ] Refactor: 취소 상태 전이와 연결 일정 협력의 중복만 범위 내에서 정리하고, 감사 기록에는 Actor·시각·예약 및 일정 식별자·결과 외 제목·설명·참석자·Session 정보를 추가하지 않는다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최초 실행을 포함해 최대 3회까지 같은 Task의 검증을 반복하며, 이후에도 실패하면 권한·트랜잭션·단언을 우회하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*RoomControllerTest' --tests '*RoomReservationHttpFlowIntegrationTest' --tests '*RoomReservationCancelServiceTest'`로 실제 Principal, HTTP 상태, 소유권과 멱등 취소를 검증한다.
- [ ] `cd backend && ./gradlew test --tests '*RoomReservationCancelTransactionTest' --tests '*RoomReservationCancelRollbackTest' --tests '*RoomReservationCancelConcurrencyTest'`로 예약·연결 일정의 원자성, Rollback과 동시 취소 수렴을 검증한다.
- [ ] 취소 후 예약이 회의실 기본 조회와 충돌 검사에서, 연결 일정이 Calendar 기간·상세 기본 조회에서 제외되고 물리 삭제되지 않는지 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 변경한 Java Formatting을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-023과 일정 및 알림 설계 결정 3의 Soft Cancel·연결 일정 취소 계약을 충족해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 TDD `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 인증·인가, IDOR 방지, 감사 정보 최소화와 트랜잭션 원자성이 유지되어야 한다.
- 공개 API 및 DB 계약 변경이 없어 `backend/API.md`, `backend/DB_SCHEMA.md`, Migration 갱신 대상이 없어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 예약 또는 연결 일정만 취소되는 부분 성공, 물리 삭제 또는 취소 시각 누락
- 미인증·비소유 사용자의 취소 성공, 사용자 ID 위조, 대상 존재 여부 또는 민감정보 노출
- 반복·동시 취소가 멱등하게 수렴하지 않거나 실패 후 데이터가 일부 변경됨
- 테스트, Spotless 또는 필수 검증 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- 요구사항·Product Spec·Design Doc·보안 정책과 다른 동작 구현
- 3회 검증 후에도 결함이 남거나 `quality_score`가 기준 미달

#### 제외 범위

- 예약 복구와 물리 삭제
- 알림 발송 기능 신규 구현
- DB Schema 또는 Migration 변경
- 일반 Calendar 일정의 직접 취소 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 회의실 예약 취소 Frontend 흐름 수정

#### 선행 Task

- `Task 1`

#### 작업 목적

예약 소유자가 PC와 Mobile에서 확인 절차를 거쳐 회의실 예약을 취소하고, 성공 후 회의실 현황과 Calendar가 즉시 갱신되며 실제 세션·CSRF 계약과 오류 복구가 유지되게 한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `frontend/src/features/auth`
- `frontend/src/features/schedule-calendar`
- `frontend/src/features/schedule-create`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red: 인증된 예약 소유자가 취소 확인 Dialog에서 실행할 때 Session Cookie와 CSRF Header를 포함한 `DELETE` 요청이 전송되지 않거나 성공 결과가 화면·Calendar에 반영되지 않는 실패 Component 및 Cypress 시나리오를 먼저 작성한다.
- [ ] Red: 비소유 예약에는 취소 행동이 노출되지 않고, `401`·`404`·`409`·네트워크 실패에서는 성공 안내 없이 재로그인·최신 상태 조회·재시도 행동을 제공하는 실패 시나리오를 작성한다.
- [ ] Green: 회의실 Gateway의 취소 요청을 공통 인증 요청 경계로 보내 CSRF 보호를 유지하고, 중복 제출을 차단한 채 성공한 경우에만 현재 회의실 현황·Calendar 목록·선택 상세 Query를 정확히 무효화한다.
- [ ] Green: 취소 확인에는 예약 제목·회의실·시간과 연결 일정도 함께 취소된다는 결과를 표시하고, 성공 후 Dialog를 닫아 취소된 예약을 기본 화면에서 제거하며 안정적인 인접 행동으로 포커스를 복귀시킨다.
- [ ] Refactor: PC·Mobile의 동일 취소 상태와 메시지를 하나의 흐름으로 유지하고, 서버의 `canEdit`은 행동 노출에만 사용하되 실제 소유권 검증은 서버가 수행하도록 한다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최초 실행을 포함해 최대 3회까지 같은 Task의 검증을 반복하며, 이후에도 실패하면 테스트 단언이나 CSRF·권한 검증을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/meeting-room`으로 취소 요청, 중복 제출, Query 무효화, 오류 상태와 포커스 복귀를 검증한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/meeting-room/cancel.cy.ts'`로 PC·Mobile의 확인·철회·성공·실패와 키보드 흐름을 검증한다.
- [ ] Cypress에서 취소 요청이 인증 Session과 CSRF 계약을 사용하고 요청 Body·Query에 사용자 ID나 역할을 포함하지 않는지 확인한다.
- [ ] Task 1의 `204`·`401`·`404`·`409` 및 Soft Cancel 계약과 Frontend Gateway·화면 상태가 충돌하지 않고 기존 예약 조회·수정 흐름에 회귀가 없는지 확인한다.
- [ ] `cd frontend && npm run typecheck && npm run lint && npm run format:check`로 타입, 정적 분석과 Formatting을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-023과 NFR-006의 PC·Mobile 취소 흐름을 충족해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 TDD `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 미인증·비소유·충돌·네트워크 실패를 성공으로 표시하지 않고 접근 가능한 확인·복구 동작을 제공해야 한다.
- 사용자 ID·역할·Session 식별자를 요청 Body·Query·화면·로그에 추가하지 않아야 한다.
- 공개 API와 문서 변경 없이 Task 1의 취소 계약을 사용해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 취소 요청에 CSRF가 누락되거나 중복 요청이 전송됨
- 비소유 예약에 취소 행동이 노출되거나 실패를 성공으로 표시함
- 성공 후 회의실·Calendar가 오래된 예약을 계속 표시하거나 관련 없는 Query를 무효화함
- PC·Mobile·키보드·포커스 시나리오, 단위 테스트, Cypress, 타입, lint 또는 Formatting 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- Product Spec·Design Doc·보안 정책과 다른 동작 구현
- 3회 검증 후에도 결함이 남거나 `quality_score`가 기준 미달

#### 제외 범위

- 예약 복구와 관리자 강제 취소 UI
- 알림함과 취소 알림 발송
- Calendar 화면의 직접 예약 일정 취소
- 전역 인증 UI 또는 Query 구조 재설계

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 회의실 예약 참석자 표시 계약 보완

#### 선행 Task

- `Task 2`

#### 작업 목적

회의실 예약 수정 화면이 저장된 참석자를 원시 ID가 아닌 최소 이름 정보로 복원할 수 있도록 예약 상세 응답을 호환 가능한 형태로 보완하고, 기존 일정 참석자 후보 검색의 권한·개인정보 최소화 계약을 그대로 재사용할 수 있게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red: 예약 소유자가 수정 상세를 조회할 때 기존 참석자별 `userId`와 `displayName`이 안정적인 순서로 반환되지 않는 실패 Service·Controller·API 계약 테스트를 먼저 작성한다.
- [ ] Red: 비소유·미존재 예약은 참석자 이름을 노출하지 않고 동일한 `404`를 반환하며, 참석자 후보 검색은 인증된 Actor가 선택 가능한 활성 사내 사용자만 이름 또는 사번 부분 일치로 반환하는 기존 보안 회귀 테스트를 유지·보강한다.
- [ ] Green: `GET /api/room-reservations/:reservationId`에 수정 화면용 최소 참석자 목록 `attendees`를 추가하고 각 항목에는 `userId`와 `displayName`만 제공한다. 기존 `attendeeIds`는 호환성을 위해 유지하되 두 목록의 ID와 순서가 일치하도록 한다.
- [ ] Green: 참석자 이름 해석은 Schedule의 공개 Identity 경계를 통해 수행하고 Room Service가 User Repository 구현체에 직접 의존하지 않게 하며, 이메일·전화번호·조직 정보·재직 상태 등 불필요한 개인정보를 응답하지 않는다.
- [ ] Green: 생성·수정 요청은 계속 `attendeeIds`만 받고 서버에서 활성·접근 가능 여부, 중복, 회의실 수용 인원을 재검증하며 이름이나 클라이언트 표시값을 신뢰하지 않는다.
- [ ] Refactor: 참석자 후보와 예약 상세의 최소 표시 타입·변환 중복만 관련 경계에서 정리하고, 추가 응답 계약과 보안·오류 조건을 `backend/API.md`에 동기화한다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최초 실행을 포함해 최대 3회까지 같은 Task의 검증을 반복하며, 이후에도 실패하면 개인정보·권한·계약 검증을 우회하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*RoomReservationDetailServiceTest' --tests '*RoomControllerTest' --tests '*RoomOpenApiContractTest'`로 소유 예약 상세, 참석자 표시 정보와 공개 계약을 검증한다.
- [ ] `cd backend && ./gradlew test --tests '*ScheduleIdentity*' --tests '*ScheduleAttendee*' --tests '*RoomReservationServiceTest' --tests '*RoomReservationUpdateServiceTest'`로 후보 검색 권한과 생성·수정 시 참석자 재검증을 확인한다.
- [ ] 응답에 `userId`, `displayName` 외 개인정보가 없고 비소유·미존재 예약에서 참석자 존재 여부가 노출되지 않는지 확인한다.
- [ ] Task 2가 사용하는 기존 예약 조회·수정·취소 Gateway 계약과 참석자 상세 응답의 호환 필드 추가가 충돌하지 않고 취소 흐름에 회귀가 없는지 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 변경한 Java Formatting을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-020, FR-022와 Calendar의 참석자 검색·선택 결정을 충족해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 TDD `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 예약 상세의 `attendeeIds` 호환성을 유지하면서 `attendees`와 ID·순서가 일치해야 한다.
- 참석자 검색·상세 응답이 최소 개인정보와 객체 수준 권한을 지키고 생성·수정 검증을 대체하지 않아야 한다.
- API 변경은 `backend/API.md`와 동기화되고 DB Schema 및 Migration 변경 대상은 없어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 참석자 이름 누락, ID·이름 매핑 또는 순서 불일치
- 비소유·미존재 예약이나 후보 검색을 통한 사용자 존재 여부·불필요한 개인정보 노출
- 클라이언트가 전송한 이름을 신뢰하거나 비활성·접근 불가·중복·수용 인원 초과 참석자를 저장함
- API 문서 불일치, 테스트 또는 Spotless 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- Product Spec·Design Doc·보안 정책과 다른 동작 구현
- 3회 검증 후에도 결함이 남거나 `quality_score`가 기준 미달

#### 제외 범위

- 별도 회의실 전용 참석자 검색 Endpoint 추가
- 이메일·전화번호·팀·직급 표시
- DB Schema와 참석자 관계 구조 변경
- 일반 일정 참석자 정책 또는 검색 순위 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 이름 검색 기반 회의실 참석자 선택 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

회의실 예약 생성·수정 패널에서 원시 참석자 ID 입력을 제거하고, 일정 등록 화면과 동일한 `등록자도 참석` 제어와 후보 검색 계약으로 참석자를 이름으로 찾아 선택·제거한다. 요청에는 등록자 참석 여부와 선택된 사용자 ID만 전달하고 인증 사용자 ID는 전달하지 않는다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`
- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/API.md`
- `docs/product-specs/meeting-room.md`
- `docs/design-docs/schedule-and-notification.md`

#### 수정 금지 경로

- `frontend/src/features/auth`
- `frontend/src/features/schedule-create`
- `frontend/src/features/schedule-calendar`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red: 생성·수정 패널에 원시 `참석자 ID` 입력이 노출되고 이름 검색·결과 선택·기존 참석자 이름 복원이 불가능한 Component 및 Cypress 실패 시나리오를 먼저 작성한다.
- [ ] Red: 검색 Loading·빈 결과·`401`·`403`·네트워크 오류, 중복 선택, 선택 제거, 회의실 수용 인원 초과, 검색 중 제출의 사용자 관찰 결과를 실패 테스트로 고정한다.
- [ ] Green: Meeting Room Gateway에서 기존 `GET /api/schedules/attendee-candidates?query=` 계약을 사용해 이름 또는 사번으로 후보를 검색하고, 응답의 `displayName`을 결과와 선택 목록에 표시하며 원시 사용자 ID 입력 UI를 제거한다.
- [ ] Green: 선택 상태는 `userId`와 `displayName`을 가진 항목 목록으로 관리하되 생성·수정 Command에는 `creatorAttends`와 중복 제거된 `attendeeIds`만 전달하고, 예약 수정 진입 시 Task 3의 `creatorAttends`와 `attendees`로 상태를 복원한다.
- [ ] Green: 일정 등록과 같은 `등록자도 참석` 체크박스를 생성·수정에 제공하고 `creatorAttends`만 요청하며, 서버가 인증 Actor를 연결 일정 참석자로 합성한다. 예약자 ID는 `attendeeIds`에 포함하거나 참석자 검색 결과로 노출하지 않는다.
- [ ] Green: 검색어 공백 정규화와 길이 계약을 지키고, 중복·수용 인원 초과를 제출 전에 안내하되 서버의 활성·접근 권한·중복·수용 인원 검증을 성공으로 가정하거나 우회하지 않는다.
- [ ] Green: `401`은 공통 세션 만료 경계, `403`은 검색 권한 안내, 빈 결과와 네트워크 실패는 서로 다른 접근 가능한 상태와 재시도 수단으로 표현하고 마지막 선택 목록을 보존한다.
- [ ] Refactor: 생성과 수정이 같은 참석자 검색·선택 컴포넌트와 상태 변환을 재사용하도록 범위 내 중복만 정리하고, 일정 등록 기능의 내부 컴포넌트에 직접 의존하지 않는다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최초 실행을 포함해 최대 3회까지 같은 Task의 검증을 반복하며, 이후에도 실패하면 API Mock·단언·접근성 검증을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/meeting-room`으로 이름 검색, 결과 상태, 선택·제거·중복·수용 인원, 수정 초기값과 Command 변환을 검증한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/meeting-room/create.cy.ts,cypress/e2e/meeting-room/update.cy.ts'`로 PC·Mobile 생성·수정에서 이름 검색과 키보드 선택 흐름을 검증한다.
- [ ] Cypress Fixture가 실제 참석자 후보 및 예약 상세 응답 계약을 사용하고, 생성·수정 요청에는 `creatorAttends`와 `attendeeIds`만 있으며 표시 이름·사용자 개인정보·인증 사용자 ID가 포함되지 않는지 확인한다.
- [ ] Task 3의 `attendees`·`attendeeIds` 호환 계약과 후보 검색 권한·오류 계약이 Frontend 상태 및 Command 변환과 충돌하지 않고 기존 예약 생성·수정 흐름에 회귀가 없는지 확인한다.
- [ ] `cd frontend && npm run typecheck && npm run lint && npm run format:check`로 타입, 정적 분석과 Formatting을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-020, FR-022, NFR-006과 회의실 Product Spec의 참석자 검색 및 추가 요구사항을 충족해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 TDD `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 생성·수정 화면에서 참석자 원시 ID가 보이지 않고 검색 결과·선택 목록·제거 행동에는 이름이 표시되어야 한다.
- 요청에는 `creatorAttends`와 선택된 `attendeeIds`만 전달되고 서버 검증과 개인정보 최소화 계약을 유지해야 한다.
- Task 3의 예약 상세와 기존 일정 참석자 후보 API를 사용하며 새로운 공개 API를 추가하지 않아야 한다.
- PC·Mobile·키보드·Loading·Empty·Error·Permission 상태가 검증되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 원시 참석자 ID 입력 또는 ID 기반 표시가 남음
- 이름과 사용자 ID가 잘못 매핑되거나 생성·수정 요청에 표시 이름·불필요한 개인정보가 포함됨
- 중복·수용 인원·비활성·접근 불가 참석자 검증 우회
- 검색 실패를 빈 결과나 성공으로 표시하거나 기존 선택을 손실함
- PC·Mobile·키보드·접근성, 단위 테스트, Cypress, 타입, lint 또는 Formatting 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- Product Spec·Design Doc·API 계약과 다른 동작 구현
- 3회 검증 후에도 결함이 남거나 `quality_score`가 기준 미달

#### 제외 범위

- 일정 등록 화면 자체의 UI·검색 정책 변경
- 참석자 이메일·전화번호·조직 정보 표시
- 참석자 초대·응답·알림 기능
- 다중 선택 전용 외부 UI 라이브러리 도입

#### 작업 결과

- 2026-08-24 Red: 등록자 참석 체크박스와 `creatorAttends` 계약이 없어 실패하는 Backend Service/Controller/OpenAPI 및 Frontend Component/Gateway 테스트를 확인했다.
- 2026-08-24 Green: 생성·수정 요청의 `creatorAttends`를 인증 Actor 기반 일정 참석자로 합성하고, 상세 조회에서 등록자와 일반 참석자를 분리해 복원하도록 구현했다. 회의실 관련 Backend 테스트와 Frontend 단위 테스트가 통과했다.
- 2026-08-24 Refactor: 등록자 포함 여부를 공통 참석자 정규화 경로에서 처리하고 기존 요청의 `attendeeIds` 의미는 호환 유지했다. Backend `spotlessCheck`, Frontend typecheck/lint/format check 및 프로덕션 빌드가 통과했다.
- Cypress 생성 변경 시나리오는 통과했다. 전체 생성·수정 스펙에서는 기존 고정 오버레이의 가시성 2건과 수정 첫 페이지 로드 1건이 각각 overflow 및 60초 load timeout으로 실패했다.

#### 남은 문제

- Cypress의 기존 고정 오버레이 가시성 및 첫 페이지 load timeout을 별도 후속으로 안정화해야 한다. 이번 등록자 참석 동작은 Component/Gateway 단위 테스트와 생성 E2E에서 검증했다.

---

### Task 5. 예약 참석자 선택·수정·취소 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`
- `Task 3`
- `Task 4`

#### 작업 목적

인증 사용자가 참석자를 이름으로 검색해 회의실 예약을 생성·수정하고, 예약 소유자가 확인 후 취소하여 회의실 현황과 Calendar에서 제거되는 전체 사용자 흐름을 하나의 회귀 계약으로 고정한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend/src/features/auth`
- `frontend/src/features/schedule-create`
- `frontend/src/features/schedule-calendar`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red: 인증 사용자로 이름 검색 결과에서 참석자를 선택해 예약을 생성하고, 수정 화면에서 기존 참석자 이름을 확인·변경한 뒤, 예약 취소와 회의실·Calendar 기본 조회 제외까지 연결하는 통합 HTTP 및 Cypress 실패 시나리오를 작성한다.
- [ ] Red: 요청에 표시 이름·인증 사용자 ID·역할이 포함되지 않고, 비소유 취소와 비활성·접근 불가 참석자 선택은 서버 경계에서 안전하게 거부되어 어떤 예약·일정 부분 상태도 남지 않는 시나리오를 작성한다.
- [ ] Green: 선행 Task의 공개 계약만 사용하여 이름 검색·선택, `attendeeIds` 저장, 연결 일정 참석자 동기화, 소유자 취소와 양쪽 기본 조회 제외가 연속 동작하도록 통합 경계 결함을 범위 내에서 최소 수정한다.
- [ ] Green: 생성·수정·취소 성공 후 영향받는 회의실 현황과 Calendar Query만 갱신하고, 각 실패 시 마지막 유효 화면 데이터와 사용자 입력·선택을 보존하며 잘못된 성공 안내를 표시하지 않는다.
- [ ] Refactor: 통합 Fixture를 실제 API 응답 형태와 일치시키고 단위·Component 테스트와 중복되는 세부 단언은 제거하되 이름 기반 선택부터 취소 결과까지의 사용자 관찰 계약은 유지한다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최초 실행을 포함해 최대 3회까지 같은 Task의 검증을 반복하며, 이후에도 실패하면 인증·권한·개인정보·원자성·접근성 단언을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*RoomReservationHttpFlowIntegrationTest' --tests '*RoomReservation*Transaction*' --tests '*RoomReservationSchedule*'`로 실제 Principal, 참석자 동기화, 생성·수정·취소 원자성과 조회 제외를 검증한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/meeting-room/integration.cy.ts'`로 PC와 Mobile에서 이름 검색 기반 생성·수정·취소 전체 흐름을 검증한다.
- [ ] Task 1~4의 취소 상태·오류 코드, 참석자 상세·검색, Frontend Command와 Query 갱신 계약이 서로 충돌하지 않고 기존 회의실 조회·예약·수정 흐름에 회귀가 없는지 확인한다.
- [ ] 통합 요청·응답·Cypress Fixture와 실패 출력에 Session 식별자, CSRF 원문, 이메일·전화번호·조직 정보와 불필요한 개인정보가 포함되지 않는지 확인한다.
- [ ] 변경한 Backend Java에 `cd backend && ./gradlew spotlessCheck`, Frontend 코드에 `cd frontend && npm run typecheck && npm run lint && npm run format:check`를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-020, FR-021, FR-022, FR-023, NFR-006과 일정 및 알림 설계 결정 1~3을 충족해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 TDD `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 이름으로 선택한 참석자와 저장된 `attendeeIds`, 연결 일정 참석자가 일치하고 취소 후 예약·일정이 함께 기본 조회에서 제외되어야 한다.
- 미인증·비소유·비활성·접근 불가·중복·수용 인원·동시성·Rollback 경계를 우회하지 않아야 한다.
- 공개 API·DB Schema·Migration 추가 변경 없이 Task 1~4에서 확정한 계약을 통합해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 이름과 사용자 ID 또는 예약과 연결 일정 참석자 불일치
- 예약·일정 부분 생성·수정·취소, 물리 삭제, IDOR, 인증·CSRF 우회 또는 개인정보 노출
- 성공 후 회의실·Calendar에 오래된 상태가 남거나 실패 시 입력·선택 데이터가 소실됨
- Backend 통합 테스트, Cypress, Spotless, 타입, lint 또는 Formatting 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- Product Spec·Design Doc·API 계약과 다른 통합 동작 구현
- 3회 검증 후에도 결함이 남거나 `quality_score`가 기준 미달

#### 제외 범위

- 알림 발송과 AI Assistant 연동
- 예약 복구, 관리자 강제 취소와 Calendar 직접 예약 취소
- 일반 일정 참석자 UI 변경
- DB Schema·Migration과 외부 UI 라이브러리 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- FR-020, FR-022, FR-023, NFR-006과 일정 및 알림 설계 결정 2~3을 충족해야 한다.
- 예약 소유자는 인증·CSRF·소유권 계약 안에서 예약과 연결 일정을 취소할 수 있고, 취소 결과가 회의실과 Calendar 기본 조회에 즉시 반영되어야 한다.
- 회의실 예약 생성·수정에서 등록자 참석 여부를 선택하고 참석자를 이름으로 검색·선택하며, 화면에는 이름, 서버 Command에는 `creatorAttends`와 검증용 `attendeeIds`만 사용해야 한다.
- 미인증·비소유·비활성·접근 불가 사용자와 중복·수용 인원·동시성·Rollback·오류 복구 경계를 우회하지 않아야 한다.
- 각 Task의 Mandatory Gate G1~G7이 모두 `PASS`이고 TDD `Red → Green → Refactor` 증거가 기록되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `backend/API.md`와 실제 참석자 상세 응답 계약이 일치하고 DB Schema·Migration 변경은 없어야 한다.
- Harness의 전체 Frontend·Backend lint, test와 build가 통과해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 구현 항목 또는 검증 항목이 실패함
- 예약·연결 일정 부분 취소, 물리 삭제, IDOR, 인증·CSRF 우회 또는 개인정보 노출이 발생함
- 참석자 이름과 ID가 불일치하거나 원시 ID 입력 UI가 남고 생성·수정 흐름이 일치하지 않음
- 필수 검증 명령, Harness 전체 lint·test·build 또는 Mandatory Gate가 실패함
- Task별 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 관련 Product Spec·Design Doc·API 문서와 실제 동작이 충돌함
- 검증 실패를 테스트·권한·보안·접근성 단언 약화로 우회함
- 3회 재시도 후에도 결함이 남거나 전체 `quality_score`가 `90` 미만임
- 남은 문제나 사람의 결정이 필요한 사항을 숨기고 완료 처리함
