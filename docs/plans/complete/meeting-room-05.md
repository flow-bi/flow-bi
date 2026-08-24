# 작업 계획: meeting-room-05

## 1. 기본 정보

### 사용자 요청

회의실 화면을 임시 메모리 데이터가 아닌 실제 데이터베이스와 연동하고, 초기 회의실 3개 정보를 마이그레이션에 추가한다.

### 작업 목적

로컬 개발 환경에서도 회의실 화면이 실제 `/api/rooms` 계약과 PostgreSQL 데이터를 사용하도록 전환하고, 빈 데이터베이스에 회의실 목록이 즉시 제공되도록 초기 회의실 3건을 안전하게 적재한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `frontend/FRONTEND.md`, `backend/BACKEND.md`, `backend/DB_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 초기 회의실 데이터 마이그레이션

#### 선행 Task

- `없음`

#### 작업 목적

빈 PostgreSQL 데이터베이스에 회의실 화면에서 사용할 초기 회의실 3건을 버전 관리되는 Flyway 마이그레이션으로 적재하고, 기존 스키마와 데이터 정합성을 보존한다.

#### 수정 가능 경로

- `backend/src/main/resources/db/migration`
- `backend/src/test/java/com/flowbi/domain/room/service`

#### 수정 금지 경로

- `backend/src/main/java`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] Red: 실제 PostgreSQL에 전체 Flyway 마이그레이션을 적용했을 때 `rooms` 테이블에 정확히 3건이 존재하고, ID 오름차순으로 `1 / 한강 회의실 / 8 / 3층`, `2 / 남산 회의실 / 4 / 2층`, `3 / 북한산 회의실 / 12 / 4층`이 조회되어야 한다는 실패 테스트를 먼저 작성하고 의도한 실패를 기록한다.
- [ ] Green: 현재 최신 버전보다 뒤에 실행되는 별도 Flyway 마이그레이션을 추가하여 위 3건을 명시적인 `room_id`, `room_name`, `capacity`, `location` 값으로 적재하고 테스트를 통과시킨다.
- [ ] Refactor: 기존 회의실 테이블 생성 마이그레이션과 이미 적용된 마이그레이션은 수정하지 않은 채, 신규 마이그레이션과 테스트의 이름·fixture·검증 SQL을 명확하게 정리한다.
- [ ] 두 번째 `Flyway.migrate()` 호출에서는 실행되는 마이그레이션이 0건이고 초기 회의실 데이터가 중복되지 않음을 PostgreSQL 테스트로 검증한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Room*MigrationPostgresTest'`로 신규 PostgreSQL 마이그레이션 테스트와 기존 회의실 마이그레이션 테스트를 실행한다.
- [ ] 신규 테스트에서 전체 마이그레이션 적용 후 회의실 3건의 ID, 이름, 수용 인원, 위치와 재실행 시 비중복을 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 신규 Java 테스트 형식을 검증한다.
- [ ] 테스트 또는 포맷 검증이 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 이후에도 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 빈 PostgreSQL 데이터베이스에 초기 회의실 3건이 정확한 값으로 적재되어야 한다.
- 기존 Flyway 마이그레이션과 기존 데이터 정의를 변경하거나 삭제하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- PostgreSQL 마이그레이션 테스트 또는 Spotless 검증 실패
- 초기 회의실이 3건이 아니거나 정의된 필드 값이 다름
- 기존 마이그레이션 수정, 데이터 덮어쓰기 또는 중복 적재 발생
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만

#### 제외 범위

- `rooms` 테이블 구조, 제약조건 또는 공개 API 계약 변경
- 운영 데이터 보정, 기존 회의실 데이터 삭제 또는 덮어쓰기
- 회의실 사진과 장비 초기 데이터 추가

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 개발 환경 회의실 실제 API 연동

#### 선행 Task

- `Task 1`

#### 작업 목적

일반 개발 실행에서 인메모리 개발 게이트웨이 대신 same-origin 세션 기반 운영 게이트웨이를 선택하여 회의실 목록과 예약 동작이 실제 백엔드 및 데이터베이스를 사용하게 한다.

#### 수정 가능 경로

- `frontend/src/App.tsx`
- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `frontend/src/features/auth`
- `frontend/src/features/schedule-calendar`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: 일반 개발 모드에서는 `productionMeetingRoomGateway`가 선택되어 `/api/rooms`를 호출하고, Cypress 테스트 하네스에서 명시적으로 주입한 게이트웨이만 예외적으로 선택된다는 실패 단위 테스트를 먼저 작성하고 의도한 실패를 기록한다.
- [ ] Red: 게이트웨이를 주입하지 않은 브라우저 실행에서 `/api/rooms` 요청이 발생하고 서버 응답의 회의실 3건이 화면에 표시된다는 실패 Cypress 테스트를 `frontend/cypress/e2e/meeting-room/**`에 먼저 작성한다.
- [ ] Green: `AuthenticatedApp`과 게이트웨이 선택 로직에서 일반 개발용 인메모리 게이트웨이 우선순위를 제거하고, 일반 개발·빌드 환경은 운영 게이트웨이, Cypress 명시 주입은 테스트 게이트웨이를 사용하도록 최소 변경한다.
- [ ] Green: 기존 `/api/rooms` 조회·예약 생성·수정·취소의 same-origin `credentials: 'include'` 계약은 유지하고 단위 테스트와 Cypress 테스트를 통과시킨다.
- [ ] Refactor: 더 이상 앱 런타임에서 사용하지 않는 개발 게이트웨이 생성 상태와 분기만 정리하되, 명시적 Cypress 테스트 fixture 및 테스트 게이트웨이 지원은 유지한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/meeting-room/development-meeting-room-gateway.test.ts src/features/meeting-room/production-meeting-room-gateway.test.ts`로 게이트웨이 선택과 API 계약을 검증한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/meeting-room/development-preview.cy.ts'`로 주입 없는 개발 화면이 `/api/rooms`를 호출하고 서버의 회의실 3건을 표시하는지 검증한다.
- [ ] 선행 Task가 제공하는 초기 데이터의 필드 모양과 충돌하지 않도록 Cypress 응답 fixture를 실제 `RoomAvailabilityResponse` 계약에 맞추고, 인메모리 샘플로 회귀하지 않음을 검증한다.
- [ ] `cd frontend && npm run typecheck`와 `cd frontend && npm run lint`로 타입과 정적 분석을 검증한다.
- [ ] 테스트, 타입 또는 lint 검증이 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 이후에도 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 일반 개발 환경의 회의실 화면이 인메모리 목록이 아닌 `/api/rooms` 응답을 사용해야 한다.
- Cypress의 명시적 게이트웨이 주입 기능은 기존 화면 시나리오 격리를 위해 유지되어야 한다.
- 인증 사용자 식별자를 프런트엔드 요청 본문이나 쿼리에 추가하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 단위 테스트, Cypress, Type Check 또는 Lint 실패
- 일반 개발 모드에서 인메모리 개발 게이트웨이가 선택됨
- 테스트 하네스가 아닌 실행에서 주입 게이트웨이가 선택됨
- API 요청에서 세션 자격 증명이 누락되거나 사용자 ID·역할을 클라이언트가 전달함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만

#### 제외 범위

- 회의실 예약 API 계약과 서버 비즈니스 규칙 변경
- 인증·인가 방식, 세션 정책 또는 Vite 프록시 구조 변경
- 개발 게이트웨이를 사용하는 기존 격리 단위 테스트와 명시적 Cypress fixture의 전면 제거

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 회의실 DB 조회 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`

#### 작업 목적

신규 마이그레이션으로 적재된 회의실 3건이 실제 PostgreSQL Repository와 회의실 조회 Application Service 경계를 거쳐 API 응답 모델과 동일한 순서와 값으로 조회됨을 통합 테스트로 고정한다.

#### 수정 가능 경로

- `backend/src/test/java/com/flowbi/domain/room/service`

#### 수정 금지 경로

- `backend/src/main/java`
- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: Testcontainers PostgreSQL에 전체 마이그레이션을 적용하고 실제 `RoomRepository`와 `RoomAvailabilityService`를 통해 조회했을 때 회의실 3건의 ID, 이름, 수용 인원, 위치가 ID 오름차순으로 반환되어야 한다는 실패 통합 테스트를 작성하고 의도한 실패를 기록한다.
- [ ] Green: 실제 JPA 매핑과 조회 경로를 사용하는 통합 테스트 fixture를 최소 구성하여 선행 Task의 마이그레이션 결과가 `RoomAvailabilityResponse`로 정확히 변환됨을 검증한다.
- [ ] Refactor: 테스트가 별도 인메모리 회의실 fixture나 H2에 의존하지 않고 PostgreSQL 마이그레이션 데이터만 사용하도록 구성과 assertion을 정리한다.
- [ ] 빈 예약 상태에서 각 회의실의 예약 목록이 비어 있고 기본 이미지 사용 상태가 유지되는지도 함께 고정한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Room*IntegrationTest'`로 신규 DB 조회 통합 테스트와 관련 회의실 통합 테스트를 실행한다.
- [ ] 선행 Task 결과를 별도 복제 fixture로 대체하지 않고 실제 Flyway·PostgreSQL·Repository·Service 통합 경계를 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 통합 테스트 형식을 검증한다.
- [ ] 통합 테스트 또는 포맷 검증이 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 이후에도 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 실제 PostgreSQL 마이그레이션 데이터 3건이 Repository와 Service를 거쳐 정의된 순서와 값으로 반환되어야 한다.
- H2 또는 프런트엔드 인메모리 fixture가 PostgreSQL 통합 검증을 대체하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- PostgreSQL 통합 테스트 또는 Spotless 검증 실패
- 조회 결과가 초기 회의실 3건의 순서·필드 값과 다름
- 실제 Repository·Service 경계를 mock 또는 인메모리 fixture로 대체함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec의 회의실 조회 동작과 다른 결과 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만

#### 제외 범위

- 예약 생성·수정·취소 흐름의 재검증
- 운영 환경 배포와 운영 데이터 변경
- 성능·부하 테스트와 회의실 관리 기능 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어 일반 개발 화면에서 실제 API와 PostgreSQL 초기 회의실 3건을 사용해야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 회의실 초기 데이터가 3건이 아니거나 정의된 값과 다름
- 일반 개발 화면이 실제 `/api/rooms` 대신 인메모리 데이터를 계속 사용함
- 관련 Product Spec 또는 Architecture와 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
