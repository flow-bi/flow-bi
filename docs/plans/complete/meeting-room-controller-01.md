# 작업 계획: meeting-room-controller-01

> 범위 정정(2026-08-16): Harness 실행 후 담당 경계를 다시 확인해 예약 취소 구현은 이번
> 변경에서 제외했다. Task 4와 Task 5·6의 취소 관련 항목은 실행 이력으로만 남기며 현재
> 결과물에는 포함하지 않는다. 회의실 조회·예약 생성·수정 Controller 및 HTTP Gateway는
> 유지하고, 예약 취소는 Schedule 담당자와 일정 취소 경계 및 Schema를 합의한 후 별도
> 작업으로 진행한다.

## 1. 기본 정보

### 사용자 요청

현재 한 개도 없는 회의실 HTTP Controller를 출발점으로 회의실 조회, 예약 생성·수정·취소까지 FR-019~FR-023의 MVP 사용자 흐름을 구현한다. 실제 인증 Adapter 구현은 제외하고 테스트에서는 `userId=10`, `role=USER`인 Mock `AuthenticatedUser`를 사용한다.

### 작업 목적

기존 회의실 조회·예약 Application Service를 JSON HTTP API와 실제 Frontend HTTP Gateway로 연결하고, 아직 없는 예약 취소 Use Case를 예약·연결 일정의 Soft Cancel까지 구현한다. 사용자 ID는 요청에서 신뢰하지 않고 `AuthenticatedUser` 경계만 사용하며 실제 인증 Adapter가 없는 실행은 `401 Unauthorized`로 안전하게 실패시킨다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `backend/AGENTS.md`

---

## 2. 실행 Task

### Task 1. 회의실·예약 조회 HTTP API 구현

#### 선행 Task

- `없음`

#### 작업 목적

인증된 사용자가 회의실 목록·상세와 자신이 수정할 예약 상세를 조회할 수 있는 HTTP 계약과 인증 사용자 경계를 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth/dto`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/main/java/com/flowbi/domain/room/service`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/repository`
- `backend/src/main/java/com/flowbi/domain/schedule/entity`
- `backend/src/main/resources`
- `backend/build.gradle`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red 단계에서 조회 Controller, 예약 편집 상세 조회, 인증 실패와 OpenAPI 계약 테스트를 먼저 작성하고 HTTP Adapter 부재로 실패함을 기록한다.
- [ ] 유효한 사용자 ID와 역할을 표현하는 최소 `AuthenticatedUser` 추상화를 추가하되 로그인, Session, Security Filter, 고정 사용자와 임시 사용자 Header는 추가하지 않는다.
- [ ] 테스트에서는 `AuthenticatedUser(userId=10, role=USER)`를 주입하고 실제 사용자 공급이 없는 실행에서는 Service 호출 전 `401`과 `AUTHENTICATION_REQUIRED`를 반환한다.
- [ ] `GET /api/rooms`의 `date`, `startTime`, `endTime`, `minimumCapacity`, `availabilityStatus`를 기존 조회 Service 조건으로 변환하고 `GET /api/rooms/:roomId`로 상세를 반환한다.
- [ ] 예약 수정 화면에 필요한 최소 계약으로 `GET /api/room-reservations/:reservationId`를 추가하고, 인증 사용자가 소유한 예약만 `roomId`, 제목, 시간, 참석자, 설명과 수정 가능 여부를 조회하게 한다.
- [ ] 미존재와 비소유 예약은 동일한 `404`와 `ROOM_RESERVATION_NOT_FOUND`로 처리하고 Entity, 인증 정보와 참석자 외 개인정보를 노출하지 않는다.
- [ ] 잘못된 조회 조건은 `400`, 인증 부재는 `401`, 회의실 부재는 `404`로 매핑하고 OpenAPI JSON에 실제 parameter·schema·오류 계약을 노출한다.
- [ ] `backend/API.md`에 구현한 조회 Endpoint와 인증·IDOR 계약을 동기화한다.
- [ ] Green 이후 변환과 오류 응답 중복만 리팩터링하고 Task 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] Backend verifier로 Mock 인증 사용자와 조회 parameter 변환, `200/400/401/404`를 검증한다.
- [ ] Backend verifier로 비소유·미존재 예약이 동일한 응답이고 인증 부재 시 Service가 호출되지 않음을 검증한다.
- [ ] Backend verifier로 Harness OpenAPI 조회 계약과 인증·내부 Entity 비노출을 검증한다.
- [ ] Backend verifier의 Java format 검사로 변경 Java 파일을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-019 조회 흐름과 SECURITY.md의 기본 거부·IDOR 기준을 충족해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 요청 Body, Query 또는 임시 Header의 사용자 ID를 인증 사용자로 신뢰함
- 인증 부재 요청이 Service를 호출하거나 보호 정보를 반환함
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 실제 인증 Adapter, 로그인, Spring Security와 Spring Session Redis
- 전체 예약 이력·관리자용 예약 조회와 회의실 사진·장비 관리

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 회의실 예약 생성 HTTP API 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

인증 사용자와 예약 입력을 기존 생성 Use Case에 전달해 예약과 연결 일정을 생성하는 HTTP 계약을 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/repository`
- `backend/src/main/java/com/flowbi/domain/room/service`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/resources`
- `backend/build.gradle`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red 단계에서 생성 Controller와 OpenAPI 계약 테스트를 먼저 작성하고 생성 HTTP Adapter 부재로 실패함을 기록한다.
- [ ] `POST /api/room-reservations`의 `roomId`, `title`, `startAt`, `endAt`, `attendeeIds`, `description`을 기존 생성 Command로 변환한다.
- [ ] 사용자 ID와 역할을 Body에서 받지 않고 `AuthenticatedUser.userId`만 예약 Actor로 변환한다.
- [ ] 성공 시 `201 Created`와 `reservationId`, `scheduleId`를 반환한다.
- [ ] 검증·권한·미존재·수용 인원·시간 충돌을 안정적인 오류 코드와 `400/403/404/409`로 매핑하고 인증 부재는 Service 호출 없이 `401`로 처리한다.
- [ ] OpenAPI JSON과 `backend/API.md`에 request·response, `400/401/403/404/409`와 인증 필드 비노출을 동기화한다.
- [ ] Green 이후 HTTP 변환과 오류 처리 중복만 리팩터링하고 Task 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] Backend verifier로 Mock `userId=10`, Command 변환, `201`과 오류 상태를 검증한다.
- [ ] Backend verifier로 선행 Task와 mapping 충돌이 없고 요청·응답에 인증 사용자 ID가 노출되지 않음을 검증한다.
- [ ] Backend verifier로 Harness OpenAPI 생성 계약을 검증한다.
- [ ] Backend verifier의 Java format 검사로 변경 Java 파일을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-020~FR-021의 예약·연결 일정 생성과 보안 조건을 충족해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 클라이언트 제공 사용자 ID를 신뢰하거나 인증 부재 요청이 생성에 성공함
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 실제 인증 Adapter와 Idempotency Key 도입
- 예약 수정·취소 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 회의실 예약 수정 HTTP API 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

인증 사용자와 예약 ID 및 수정 입력을 기존 수정 Use Case에 전달해 예약과 연결 일정을 함께 수정하는 HTTP 계약을 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/repository`
- `backend/src/main/java/com/flowbi/domain/room/service`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/resources`
- `backend/build.gradle`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red 단계에서 수정 Controller와 OpenAPI 계약 테스트를 먼저 작성하고 수정 HTTP Adapter 부재로 실패함을 기록한다.
- [ ] `PUT /api/room-reservations/:reservationId`의 Path ID와 Body 입력을 기존 수정 Command로 변환하며 Body에서 사용자·예약 ID를 받지 않는다.
- [ ] 성공 시 `200 OK`와 `reservationId`, `scheduleId`를 반환한다.
- [ ] 인증 부재는 `401`, 검증·참석자 권한·미존재·비소유·수정 불가·수용 인원·충돌은 `400/403/404/409`와 안정적인 오류 코드로 매핑한다.
- [ ] 비소유와 미존재 예약을 동일한 `404`로 처리해 존재 여부를 노출하지 않는다.
- [ ] OpenAPI JSON과 `backend/API.md`에 수정 계약과 IDOR 방지 동작을 동기화한다.
- [ ] Green 이후 생성·수정 변환 중복만 리팩터링하고 Task 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] Backend verifier로 Mock `userId=10`, Path·Command 변환, `200`과 오류 상태를 검증한다.
- [ ] Backend verifier로 선행 Task Endpoint와 충돌하지 않고 비소유·미존재 응답이 동일함을 검증한다.
- [ ] Backend verifier로 Harness OpenAPI 수정 계약을 검증한다.
- [ ] Backend verifier의 Java format 검사로 변경 Java 파일을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-022의 예약·연결 일정 수정과 소유권 조건을 충족해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 예약 소유권 또는 인증 검사가 우회됨
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 실제 인증 Adapter와 관리자 대행 수정
- 예약 취소 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 회의실 예약과 연결 일정 취소 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

예약자 본인이 회의실 예약을 취소하면 예약과 연결 일정을 물리 삭제하지 않고 함께 취소 상태로 보존하는 FR-023 Use Case와 HTTP API를 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/service`
- `backend/src/main/java/com/flowbi/domain/schedule/entity`
- `backend/src/main/java/com/flowbi/domain/schedule/service`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/DB_SCHEMA.md`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/repository`
- `backend/src/main/java/com/flowbi/domain/schedule/repository`
- `backend/src/main/resources`
- `backend/build.gradle`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red 단계에서 예약 취소 Service, 연결 일정 취소와 `DELETE` Controller 계약 테스트를 먼저 작성하고 취소 Use Case 부재로 실패함을 기록한다.
- [ ] `RoomReservation`에 기준선 컬럼 `cancelled_at`을 매핑하고 `RESERVED`에서 `CANCELED`로 전환하며 취소 시각을 저장하는 도메인 동작을 추가한다.
- [ ] 연결 일정에 Design Doc이 확정한 `ACTIVE/CANCELED`, 취소 시각과 취소 주체를 영속화하고 회의실 예약 연결 일정만 취소하는 Schedule Service 경계를 추가한다.
- [ ] `backend/DB_SCHEMA.md`의 `schedules`에 상태·취소 시각·취소 주체를 추가해 구현과 확정된 Design Doc을 동기화하되 기존 데이터 삭제나 파괴적 Migration은 수행하지 않는다.
- [ ] 취소 Service가 잠금 조회, 예약 소유권, 연결 일정 소유권을 검증한 뒤 한 트랜잭션에서 예약과 일정을 Soft Cancel하고 이미 취소된 동일 요청은 추가 변경 없이 성공시킨다.
- [ ] `DELETE /api/room-reservations/:reservationId`가 `AuthenticatedUser.userId`만 Actor로 사용하고 성공·반복 취소에 `204 No Content`를 반환하도록 구현한다.
- [ ] 인증 부재는 Service 호출 없이 `401`, 미존재와 비소유는 동일한 `404`, 연결 일정 불일치와 취소 불가 상태는 `409`와 안정적인 오류 코드로 처리한다.
- [ ] OpenAPI JSON과 `backend/API.md`에 취소의 `204/401/404/409`, Soft Cancel과 멱등 계약을 동기화한다.
- [ ] Green 이후 취소 상태 전이와 오류 처리 중복만 리팩터링하고 Task 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] Backend verifier로 예약 상태·`cancelledAt`과 연결 일정 상태·취소 시각·취소 주체가 함께 저장됨을 검증한다.
- [ ] Backend verifier로 Mock `userId=10`, `204`, 반복 취소 멱등성, `401/404/409`와 물리 삭제 미발생을 검증한다.
- [ ] Backend verifier로 선행 Task 생성·수정과 취소가 충돌하지 않고 취소 예약이 현황과 중복 검사에서 제외되는 회귀를 검증한다.
- [ ] Backend verifier로 Harness OpenAPI 취소 계약과 Java format을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-023과 Design Doc 결정 3의 예약·일정 Soft Cancel 및 SECURITY.md 소유권 기준을 충족해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 예약 또는 연결 일정을 물리 삭제하거나 둘 중 하나만 취소됨
- 비소유 예약의 존재 여부가 노출되거나 인증 검사가 우회됨
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 알림 모듈이 없는 상태에서의 발송 예정 알림 취소와 취소 안내 생성
- 관리자 대행 취소, 취소 복구와 파괴적 DB Migration

#### 작업 결과

`none`

#### 남은 문제

- 알림 도메인 구현 시 예약 취소 이벤트를 이용한 발송 예정 알림 취소와 취소 안내를 후속 구현해야 한다.

---

### Task 5. Frontend HTTP Gateway와 예약 취소 사용자 흐름 구현

#### 선행 Task

- `Task 1`
- `Task 2`
- `Task 3`
- `Task 4`

#### 작업 목적

Frontend의 운영용 MeetingRoom Gateway를 실제 HTTP API에 연결하고 예약 생성·수정·취소 사용자 흐름을 제공한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red 단계에서 HTTP request 변환, 오류 매핑, 취소 확인·성공·실패 UI와 Cypress 사용자 흐름 테스트를 먼저 작성한다.
- [ ] 운영 Gateway가 회의실 조회, 예약 편집 상세, 생성, 수정, 취소 API를 same-origin `fetch`와 세션 Cookie용 `credentials: include`로 호출하되 사용자 ID Header나 Body를 만들지 않게 한다.
- [ ] Backend 오류 코드를 기존 Gateway 오류로 안정적으로 매핑하고 `401`은 인증 연동 필요 상태로 처리하며 오류 응답의 내부 상세를 화면에 노출하지 않는다.
- [ ] Gateway 계약과 Development Gateway에 `cancelReservation` 및 취소 가능 상태를 추가해 개발·테스트와 운영 계약의 차이를 제거한다.
- [ ] 수정 가능한 예약에 취소 Action과 대상·결과 확인 단계를 제공하고 성공 시 패널을 닫고 예약 현황 Query를 무효화한다.
- [ ] 취소 중 중복 제출을 막고 비소유·미존재·인증 실패에는 안전한 안내를 표시하며 키보드 초점과 Dialog 접근성을 유지한다.
- [ ] 실제 인증 Adapter가 없는 현재 통합 실행에서는 운영 Gateway 요청이 `401`로 실패한다는 기본 거부 동작을 유지하고 테스트에만 Mock 사용자·HTTP 응답을 사용한다.
- [ ] Green 이후 HTTP 처리와 상태 변경 UI 중복만 리팩터링하고 Task 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] Frontend verifier로 Gateway URL, method, JSON, Cookie credential, 오류 코드 매핑과 사용자 ID 비전송을 검증한다.
- [ ] Frontend verifier로 생성·수정·취소 성공 후 현황 재조회와 실패·중복 제출 회귀를 검증한다.
- [ ] Cypress로 예약 선택, 취소 확인, 성공 반영과 취소 철회 사용자 흐름을 검증한다.
- [ ] Frontend verifier의 format·lint·typecheck 대상 검사로 변경 파일을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-019~FR-023의 Frontend Gateway와 취소 확인 사용자 흐름을 충족해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 사용자 ID를 클라이언트가 전송하거나 인증 실패 상태에서 성공으로 표시함
- 확인 없이 취소하거나 취소 중 중복 요청을 허용함
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 실제 로그인·Session Adapter와 관리자 대행 취소 UI
- 알림 취소 UI와 취소 복구 UI

#### 작업 결과

`none`

#### 남은 문제

- 실제 인증 Adapter 구현 전 운영 Gateway의 성공 응답을 실서버 사용자 세션으로 검증할 수 없다.

---

### Task 6. 회의실 예약 HTTP 흐름 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`
- `Task 3`
- `Task 4`
- `Task 5`

#### 작업 목적

조회, 생성, 수정, 취소와 Frontend Gateway가 하나의 인증·오류·OpenAPI 계약으로 연결되고 기존 기능에 회귀가 없는지 통합 검증한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/main/java/com/flowbi/domain/room/service`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/API.md`
- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/repository`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/global`
- `backend/src/main/resources`
- `backend/build.gradle`
- `backend/DB_SCHEMA.md`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Mock 인증 사용자의 조회 결과를 생성·수정·취소에 연결하는 HTTP 통합 계약 테스트를 작성한다.
- [ ] Red로 남은 통합 계약에 맞춰 회의실 예약 요약과 OpenAPI에 `canEdit`을 추가하고, 인증 사용자의 소유권과 예약 상태가 모두 수정 가능할 때만 `true`가 되도록 조회 HTTP 경계를 구현한다.
- [ ] 다른 사용자의 예약은 `canEdit=false`로만 반환하고 소유자 ID·인증 사용자 ID를 목록 응답에 노출하지 않으며, `backend/API.md`에 이 계약을 동기화한다.
- [ ] 모든 회의실 Endpoint의 인증 부재 `401`, Service 미호출과 비소유·미존재 `404` 비구분을 통합 보안 회귀 테스트로 고정한다.
- [ ] 예약 취소 후 동일 시간대 재예약이 가능하고 연결 일정은 일반 활성 일정으로 노출되지 않는 통합 회귀 테스트를 작성한다.
- [ ] Harness OpenAPI JSON에 조회·생성·수정·취소 계약이 함께 존재하고 Frontend Gateway의 method·path·schema와 일치하는 검증을 작성한다.
- [ ] 알림 취소 미구현을 성공으로 가장하지 않고 남은 문제로 유지한다.

#### 검증 항목

- [ ] Backend verifier로 선행 Task 간 mapping, DTO, 트랜잭션과 오류 처리 충돌이 없는 통합 테스트를 실행한다.
- [ ] Frontend verifier와 Cypress로 HTTP Gateway 및 조회·생성·수정·취소 사용자 흐름 회귀 테스트를 실행한다.
- [ ] Backend verifier로 통합 OpenAPI 계약과 민감정보 비노출을 검증한다.
- [ ] 변경 테스트 파일의 Backend Java format과 Frontend format·lint·typecheck를 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-019~FR-023의 예약 HTTP 흐름과 예약·일정 Soft Cancel 계약을 충족해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- Endpoint, Frontend Gateway 또는 OpenAPI 계약이 충돌함
- 인증·소유권 검사가 우회되거나 예약·일정 취소 결과가 불일치함
- 관련 Product Spec, Design Doc 또는 SECURITY.md와 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 예약 요약 편집 가능 여부 외 제품 코드 변경과 DB 문서 변경
- 실제 인증 Adapter와 알림 취소 구현

#### 작업 결과

`none`

#### 남은 문제

- 실제 사용자 Session 기반 E2E와 알림 취소는 각각 인증·알림 후속 구현에서 검증한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 회의실 조회, 예약 생성·수정·취소, 연결 일정 Soft Cancel, Frontend HTTP Gateway와 OpenAPI 계약이 일치해야 한다.
- 제품 코드에는 고정 사용자, 임시 인증 Header나 인증 우회가 없어야 하고 인증 Adapter 부재 요청은 `401`로 실패해야 한다.
- 모든 Task 완료 후 Harness 실행기가 Backend `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`와 Frontend `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, Cypress E2E를 실행해 통과해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경 또는 수정 금지 경로 변경이 발생함
- 관련 Product Spec, Design Doc, SECURITY.md 또는 API·DB 계약과 충돌함
- 사용자 ID를 클라이언트 입력에서 신뢰하거나 인증·소유권 검사가 우회됨
- 예약과 연결 일정 중 하나만 취소되거나 물리 삭제됨
- 실제 인증 Adapter 또는 존재하지 않는 알림 기능을 완료한 것으로 보고함
- 남은 문제가 사용자 확인 없이 방치됨
