# 작업 계획: meeting-room-01

## 1. 기본 정보

### 사용자 요청

회의실 MVP 기능 구현을 위한 실행 계획을 작성한다.

### 작업 목적

FR-019–FR-022의 핵심 업무 규칙에 따라 회의실 목록과 9:00–18:00 예약 현황 조회, 검색 우선순위, 회의실 예약과 연결 일정 생성·수정을 수행하는 Backend Application Service와 반응형 화면을 구현한다. 인증·인가 구현은 사람 결정에 따라 후속 Plan으로 미루며, 이번 Plan에서는 HTTP Controller를 등록하거나 운영 API를 노출하지 않는다. Frontend는 계약 Port와 테스트 전용 Adapter로 사용자 흐름을 검증하고 운영 Adapter는 기본 거부 상태로 유지한다. 현재 Initial Baseline으로 표현할 수 없는 회의실 사진 업로드·장비 관리, DB 수준 중복 예약 제약, 연결 일정 취소 상태는 승인된 Schema Review 전까지 제외한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`

### 실행 범위 제한

- 구현되지 않은 Dashboard는 이 Plan의 구현·검증 대상이 아니다.
- Frontend 자동 검증은 `src/App.tsx`, `src/features/meeting-room`, `cypress/e2e/meeting-room`으로 제한한다.
- Dashboard를 포함하는 전체 `npm run check` 또는 Dashboard 테스트·Lint는 실행하지 않으며, 기존 Dashboard 실패는 Mandatory Gate와 Task 판정에 반영하지 않는다.

---

## 2. 실행 Task

### Task 1. 회의실 목록·예약 현황 조회 Application Service 구현

#### 선행 Task

- 없음

#### 작업 목적

FR-019의 회의실 목록과 기간별 예약 현황을 기존 DB 기준선 안에서 조회하고, 수용 인원·날짜·시간대·상태 검색 조건이 결과 제거가 아닌 표시 우선순위 조정으로 동작하는 Application Service와 DTO 계약을 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 전체 목록, 빈 결과, 9:00~18:00 예약 현황, 시작 포함·종료 제외 시간 겹침, 검색 조건별 안정적인 우선순위와 잘못된 기간 입력을 검증하는 실패 테스트를 작성하고 의도한 실패를 기록한다.
- [ ] Green: 회의실 목록·상세·기간별 예약 현황 조회 DTO·Application Service·Repository를 최소 구현하고 Entity를 호출자에게 직접 노출하지 않는다.
- [ ] Green: 예약 예정·사용 중·사용 완료 화면 상태를 저장하지 않고 `Asia/Seoul` 현재 시각과 예약 시간으로 계산하며 `CANCELED` 예약은 예약 가능 시간 점유에서 제외한다.
- [ ] Green: 목록 응답은 회의실 이름·수용 인원·위치와 기본 이미지 사용 여부를 제공하고, 사진·장비 저장 모델은 만들지 않는다.
- [ ] Green: 기간과 검색 입력을 서버에서 검증하고 내부 예외·SQL·개인정보를 노출하지 않는 안정적인 오류 코드를 제공한다.
- [ ] Green: 조회 DTO와 오류 계약을 `backend/API.md`에 인증 연동 전 Application Contract로 기록하고 HTTP Endpoint는 미구현 상태임을 명시한다.
- [ ] Green: `@RestController`, Servlet Filter 또는 인증을 우회하는 임시 HTTP 진입점을 등록하지 않는다.
- [ ] Refactor: Application Service·Repository 책임과 시간·우선순위 계산 책임을 분리하고 관련 테스트를 다시 통과시킨다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증하고, 이후에는 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.*'`로 Task 1의 정상·빈 상태·입력 오류·시간 경계 시나리오를 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 Task 1의 Java 정적 포맷 검증을 통과한다.
- [ ] 검색 조건이 비일치 회의실을 제거하지 않고 후순위로 유지하며 동일 점수 결과의 순서가 안정적인지 검증한다.
- [ ] HTTP Controller가 등록되지 않았고 Spring MVC 경로에서 회의실 Endpoint가 노출되지 않는지 정적·Context 테스트로 검증한다.

#### 완료 조건

- FR-019의 Application Service 범위가 충족되고 Red → Green → Refactor 실행 증거가 있어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 조회 Application Contract와 `backend/API.md`가 일치하고 HTTP Endpoint가 등록되지 않아야 한다.
- 모든 구현 항목과 검증 항목이 통과하고 `quality_score`가 90 이상이어야 한다.
- 수정 범위가 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.

#### 실패 조건

- HTTP Endpoint 노출, 인증 우회용 임시 사용자, 무제한 기간 조회, 취소 예약의 시간 점유, 시작·종료 경계 오류 또는 검색 결과 필터링이 발생함
- 테스트·Spotless 실패, 계약 문서 불일치, 경로 범위 위반 또는 Red → Green → Refactor 증거 누락
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- 회의실 사진 업로드, 장비 종류와 회의실별 장비 저장·관리
- DB Migration, DB 수준 중복 예약 제약, 관리자 회의실 관리 API
- Spring Security·JWT·RBAC와 회의실 HTTP Controller

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 회의실 목록·예약 현황 화면 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

사용자가 데스크톱과 모바일에서 회의실 목록, 기본 이미지, 예약 시간표와 검색 조건에 따른 우선순위를 확인할 수 있는 접근 가능한 화면을 구현한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 회의실 목록, 9:00~18:00 시간표, 기본 이미지, 예약 제목·시간대·팀·계산 상태, 검색 우선순위, 로딩·빈 상태·오류·권한 상태의 실패 테스트를 먼저 작성한다.
- [ ] Green: Task 1의 Application Contract에 맞는 타입·Gateway Port와 회의실 화면을 `features/meeting-room` 책임으로 구현한다.
- [ ] Green: 수용 인원·날짜·시간대·상태 조건을 입력해 주입된 Gateway의 우선순위 결과를 표시하고, 비일치 항목도 후순위에서 접근 가능하게 유지한다.
- [ ] Green: 작은 화면에서는 시간표의 텍스트 대체 목록과 주요 조작을 제공하고 상태를 색상만으로 전달하지 않는다.
- [ ] Green: 조회 실패 시 기존 유효 데이터를 숨기지 않고 오류와 재시도 수단을 제공한다.
- [ ] Green: Production Gateway는 네트워크 요청을 보내지 않고 `AUTH_INTEGRATION_PENDING` 권한 상태로 안전하게 실패하도록 구현한다.
- [ ] Green: `frontend/cypress/e2e/meeting-room` 아래에 계약과 일치하는 테스트 전용 Gateway를 주입해 목록·검색의 데스크톱 및 모바일 Cypress 시나리오를 작성한다.
- [ ] Refactor: API 변환, 시간표 표시와 화면 조립 책임을 분리하고 관련 테스트를 다시 통과시킨다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증하고 실패를 숨기지 않는다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`으로 Task 2의 사용자 관찰 가능 동작을 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/list.cy.ts'`로 데스크톱·모바일 핵심 조회 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck && npm run lint -- src/App.tsx src/features/meeting-room cypress/e2e/meeting-room`으로 Task 2의 타입과 회의실 범위 정적 분석을 검증한다.
- [ ] 키보드만으로 검색 조건과 시간표 대체 목록에 접근할 수 있고, 선행 Task Application Contract와 현재 화면 타입 사이에 충돌이 없는지 검증한다.
- [ ] Production Build에서 회의실 Gateway가 HTTP 요청을 보내지 않고 인증 연동 대기 상태를 표시하는지 검증한다.

#### 완료 조건

- FR-019와 NFR-006의 Task 범위 및 로딩·빈 상태·오류·권한·접근성 인수 조건이 충족되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- Red → Green → Refactor와 Cypress 실행 증거가 있고 `quality_score`가 90 이상이어야 한다.
- 모든 구현·검증 항목이 통과하고 수정 가능·금지 경로를 준수해야 한다.

#### 실패 조건

- Application Contract와 다른 테스트 Adapter, Production HTTP 요청, 검색 결과 제거, 모바일 핵심 흐름 누락, 색상만 사용하는 상태 표현 또는 권한 오류를 빈 데이터로 위장함
- 회의실 범위 단위 테스트·Cypress·Type Check·Lint 실패, TDD 증거 누락 또는 경로 범위 위반
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- 회의실 사진 업로드 및 관리자 장비 관리 UI
- 확정되지 않은 Router·날짜 라이브러리·아이콘 패키지 도입
- 실제 Backend HTTP 연동과 인증·인가 처리
- 구현되지 않은 Dashboard 코드·테스트의 수정 또는 검증

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 회의실 예약·연결 일정 생성 Application Service 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

FR-020~FR-021에 따라 신뢰된 Actor Context를 전달받은 Application Service가 회의실 예약과 캘린더 일정을 하나의 트랜잭션에서 함께 생성하고 동일 회의실의 겹치는 예약은 하나만 성공하도록 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 정상 예약, Actor Context 누락, 접근 불가·비활성 참석자, 수용 인원 초과, 잘못된 시간, 동일·부분·포함 시간 충돌, 동시 요청, 일정 생성 실패 Rollback을 검증하는 실패 테스트를 작성한다.
- [ ] Green: 예약 생성 Command에는 사용자 ID를 포함하지 않고 별도의 `ReservationActor` Context와 회의실, 제목, `Asia/Seoul` 기준 시작·종료, 참석자, 상세 설명을 Application Service에 전달한다.
- [ ] Green: 예약 `RESERVED` 상태와 연결 일정 `ACTIVE` 상태, 회의실 이름 기반 위치, 참석자와 상세 설명을 하나의 트랜잭션에서 생성한다.
- [ ] Green: 시작 포함·종료 제외 구간으로 충돌을 판정하고 동시 요청 중 하나만 성공하도록 기존 기술 범위 안의 영속성 제어를 적용한다.
- [ ] Green: 입력 오류, Actor Context 누락, 숨겨야 하는 리소스, 수용 인원·시간 충돌을 안정적인 Application Error Code로 구분한다.
- [ ] Green: 생성 Command·Result·오류 코드와 동시성 의미를 `backend/API.md`에 인증 연동 전 Application Contract로 기록하고 HTTP 상태 매핑은 후속 범위로 남긴다.
- [ ] Green: `@RestController`나 인증 주체를 대신하는 고정 사용자·임시 Header를 추가하지 않는다.
- [ ] Refactor: Room Reservation이 Schedule Repository를 직접 침범하지 않도록 일정 생성 협력 경계를 분리하고 테스트를 다시 통과시킨다.
- [ ] PostgreSQL 호환 동시성 보장이 기존 승인 기술로 불가능하면 새 의존성이나 스키마를 임의 도입하지 않고 Task를 `BLOCKED`로 기록한다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.*' --tests 'com.flowbi.domain.schedule.*'`로 Task 3의 생성·Rollback·권한·입력·충돌 시나리오를 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`를 통과한다.
- [ ] 두 개 이상의 동시 예약 요청에서 정확히 하나만 성공하고 다른 요청은 `409 ROOM_RESERVATION_CONFLICT`인지 검증한다.
- [ ] 선행 Task 조회 계약과 생성 후 조회 결과가 충돌하지 않는지 현재 Task의 API 통합 테스트에서 확인한다.

#### 완료 조건

- FR-020~FR-021의 Application Service 범위와 동시성·트랜잭션 인수 조건이 충족되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 예약과 일정의 원자성, Actor Context 분리와 안정적인 오류 계약이 검증되어야 한다.
- Red → Green → Refactor 증거와 모든 검증 통과가 있고 `quality_score`가 90 이상이어야 한다.
- 수정 가능·금지 경로를 준수해야 한다.

#### 실패 조건

- 생성 Command 사용자 ID 포함, 고정 사용자·임시 Header 사용, HTTP Endpoint 노출, 중복 예약 동시 성공, 부분 저장, 개인정보·내부 예외 노출 또는 문서 계약 불일치
- 테스트·Spotless 실패, TDD 증거 누락, 경로 범위 위반 또는 새 의존성·DB 스키마의 무승인 변경
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- 예약 알림 생성·발송과 AI 예약 지원
- Idempotency Key, 새 Migration 도구, DB 스키마·제약 변경
- Spring Security·JWT·RBAC, HTTP Controller와 HTTP 상태 매핑

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 회의실 예약 생성 화면 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

선택한 회의실의 우측 예약 패널에서 날짜·시간대·참석자·상세 설명을 입력하고 예약 및 일정 생성 결과를 안전하게 확인할 수 있는 화면 흐름을 구현한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 패널 열기·닫기, 필수 입력, 종료 시간 경계, 참석자 추가·중복 제거, 수용 인원, 제출 중 중복 방지, 성공·입력 오류·충돌·권한 오류의 실패 테스트를 작성한다.
- [ ] Green: Task 3 Application Contract를 사용하는 예약 Form과 Gateway Mutation을 구현하고 성공 후 영향받는 목록·예약 현황만 갱신한다.
- [ ] Green: 데스크톱 우측 패널과 모바일 Overlay 또는 전체 화면 흐름을 제공하며 제목·닫기 수단·초기 포커스·포커스 복귀·저장하지 않은 입력 확인을 구현한다.
- [ ] Green: 서버 충돌을 성공으로 위장하지 않고 사용자가 시간대를 다시 선택할 수 있는 오류 메시지와 재조회 수단을 제공한다.
- [ ] Green: Production Gateway에서는 제출을 비활성화하고 인증 연동 대기 사유를 사용자에게 명확히 표시한다.
- [ ] Green: `frontend/cypress/e2e/meeting-room` 아래에 테스트 전용 Gateway를 주입해 예약 생성의 정상·충돌·모바일 Cypress 시나리오를 작성한다.
- [ ] Refactor: Form Schema, Gateway Mutation과 패널 표현 책임을 분리하고 관련 테스트를 다시 통과시킨다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`으로 Task 4의 Form·Mutation·접근성 상태를 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/create.cy.ts'`로 정상·충돌·모바일 예약 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck && npm run lint -- src/App.tsx src/features/meeting-room cypress/e2e/meeting-room`를 통과한다.
- [ ] 선행 Task 생성 계약과 현재 Task Command 타입이 충돌하지 않고, 키보드 포커스 이동·복귀와 중복 제출 방지가 동작하는지 확인한다.
- [ ] Production Build에서 실제 예약 HTTP 요청이 발생하지 않고 제출 불가 사유가 표시되는지 검증한다.

#### 완료 조건

- FR-020~FR-021과 NFR-006의 화면 인수 조건이 충족되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- Red → Green → Refactor 및 Cypress 증거가 있고 `quality_score`가 90 이상이어야 한다.
- 모든 구현·검증 항목 통과와 수정 가능·금지 경로 준수가 필요하다.

#### 실패 조건

- Application Contract와 다른 테스트 Adapter, Production HTTP 요청, 중복 제출, 충돌 성공 처리, 모바일 예약 불가, 접근 가능한 Label·오류·포커스 누락
- 회의실 범위 단위 테스트·Cypress·Type Check·Lint 실패, TDD 증거 누락 또는 경로 범위 위반
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- 알림 설정·발송과 AI 대화 예약
- 낙관적 생성, 외부 참석자와 회의실 사진 편집
- 실제 Backend HTTP 연동과 인증·인가 처리
- 구현되지 않은 Dashboard 코드·테스트의 수정 또는 검증

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. 회의실 예약·연결 일정 수정 Application Service 구현

#### 선행 Task

- `Task 4`

#### 작업 목적

FR-022에 따라 신뢰된 Actor Context를 전달받은 Application Service가 예약 소유자를 확인하고 회의실 예약과 연결 일정의 관련 정보를 같은 트랜잭션에서 갱신하도록 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 예약자 수정, Actor Context 누락, 비소유자, 존재하지 않거나 숨겨야 하는 예약, 취소 예약, 수용 인원·시간 충돌, 참석자 변경, 일정 갱신 실패 Rollback의 실패 테스트를 작성한다.
- [ ] Green: 수정 Command에는 사용자 ID를 포함하지 않고 별도의 `ReservationActor` Context와 예약 ID·회의실·제목·날짜·시간·참석자·상세 설명을 Application Service에 전달한다.
- [ ] Green: 연결 일정의 제목·시간·회의실 이름 기반 위치·참석자·상세 설명을 동일 트랜잭션에서 갱신하고 예약 관련 정보의 수정 책임을 Room Reservation에 유지한다.
- [ ] Green: 이번 범위에서는 `reservedBy`와 Actor Context가 일치하는 예약자만 허용하고 관리자 권한은 후속 RBAC 연동 범위로 남긴다.
- [ ] Green: 수정 대상 예약을 제외한 시간 충돌과 동시 수정 충돌을 검증하고 안전한 오류 상태·코드를 반환한다.
- [ ] Green: 수정 Command·Result·소유권·오류 계약을 `backend/API.md`에 인증 연동 전 Application Contract로 기록하고 HTTP 상태 매핑은 후속 범위로 남긴다.
- [ ] Green: `@RestController`나 인증 주체를 대신하는 고정 사용자·임시 Header를 추가하지 않는다.
- [ ] Refactor: 생성과 수정에서 공유하는 검증을 명확한 도메인 책임으로 정리하고 관련 테스트를 다시 통과시킨다.
- [ ] 관리자 권한 모델은 구현하지 않고 일반 예약자 수정만 검증하며 후속 RBAC 연동 필요사항을 남은 문제로 기록한다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.*' --tests 'com.flowbi.domain.schedule.*'`로 Task 5의 수정·소유권·Actor 누락·충돌·Rollback을 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`를 통과한다.
- [ ] 예약과 연결 일정 중 하나라도 실패하면 두 데이터 모두 수정 전 상태로 유지되는지 검증한다.
- [ ] 선행 Task 생성·조회 계약과 수정 후 응답·조회 상태가 충돌하지 않는지 현재 Task 통합 테스트에서 확인한다.

#### 완료 조건

- FR-022의 Application Service 범위와 소유권·트랜잭션·동시성 인수 조건이 충족되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- Red → Green → Refactor 증거와 모든 검증 통과가 있고 `quality_score`가 90 이상이어야 한다.
- 수정 가능·금지 경로를 준수하고 관리자 미확정 범위를 완료로 보고하지 않아야 한다.

#### 실패 조건

- 비소유자 수정, 수정 Command 사용자 ID 포함, 고정 사용자·임시 Header 사용, HTTP Endpoint 노출, 예약·일정 불일치, 취소 예약 수정, 충돌 누락 또는 내부 정보 노출
- 테스트·Spotless 실패, 계약 불일치, TDD 증거 누락, 경로 범위 위반 또는 무승인 권한 모델 구현
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- 미확정 관리자 역할·권한 모델의 신규 정의
- 예약 취소, 알림 변경, DB 스키마 변경
- Spring Security·JWT·RBAC, HTTP Controller와 HTTP 상태 매핑

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 6. 회의실 예약 수정 화면 구현

#### 선행 Task

- `Task 5`

#### 작업 목적

수정 권한이 있는 사용자가 기존 예약 정보를 불러와 변경하고, 연결 일정까지 반영된 결과를 목록과 예약 현황에서 확인할 수 있는 반응형 화면 흐름을 구현한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 기존 값 표시, 수정 가능 권한, 권한 거부, 변경 검증, 충돌, 저장 중 중복 요청 방지, 성공 후 현황 갱신의 실패 테스트를 작성한다.
- [ ] Green: Task 5 Application Contract에 맞는 수정 Form과 Gateway Mutation을 구현하고 소유권이 없으면 수정 행동을 숨기는 UX와 거부 상태를 함께 처리한다.
- [ ] Green: 수정 성공이 확정된 뒤 목록·예약 현황 캐시만 갱신하고 충돌 시 사용자 입력을 보존한 채 재선택 안내를 제공한다.
- [ ] Green: 데스크톱 패널과 모바일 흐름에서 Label·오류 연결·포커스 관리·저장하지 않은 변경 확인을 제공한다.
- [ ] Green: Production Gateway에서는 수정을 비활성화하고 인증 연동 대기 사유를 사용자에게 명확히 표시한다.
- [ ] Green: `frontend/cypress/e2e/meeting-room` 아래에 테스트 전용 Gateway를 주입해 수정 정상·소유권 거부·충돌·모바일 Cypress 시나리오를 작성한다.
- [ ] Refactor: 생성 Form과 안전하게 공유 가능한 입력 Schema·Field만 추출하고 권한 및 Mutation 책임을 분리한다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`으로 Task 6의 수정·권한·오류·캐시 갱신을 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/update.cy.ts'`로 정상·권한 거부·충돌·모바일 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck && npm run lint -- src/App.tsx src/features/meeting-room cypress/e2e/meeting-room`를 통과한다.
- [ ] 선행 Task 수정 계약과 현재 Task 타입·오류 분기가 충돌하지 않고 키보드·포커스 동작이 유지되는지 검증한다.
- [ ] Production Build에서 실제 수정 HTTP 요청이 발생하지 않고 수정 불가 사유가 표시되는지 검증한다.

#### 완료 조건

- FR-022와 NFR-006의 화면 인수 조건이 충족되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- Red → Green → Refactor 및 Cypress 증거가 있고 `quality_score`가 90 이상이어야 한다.
- 모든 구현·검증 항목 통과와 수정 가능·금지 경로 준수가 필요하다.

#### 실패 조건

- 테스트 Adapter의 소유권 상태만으로 운영 보안을 완료했다고 보고, Production HTTP 요청, 충돌 성공 처리, 입력 유실, 모바일 수정 불가 또는 접근성 상태 누락
- 회의실 범위 단위 테스트·Cypress·Type Check·Lint 실패, TDD 증거 누락 또는 경로 범위 위반
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- 예약 취소 UI와 미확정 관리자 전용 수정 UI
- 일반 캘린더 화면에서 회의실 예약 관련 정보 수정
- 실제 Backend HTTP 연동과 인증·인가 처리
- 구현되지 않은 Dashboard 코드·테스트의 수정 또는 검증

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 7. 회의실 계약 기반 핵심 흐름 통합 검증 및 결함 수정

#### 선행 Task

- `Task 6`

#### 작업 목적

회의실 목록·예약 현황·검색·예약 생성·수정의 Application Contract와 테스트 전용 Frontend Gateway를 연결하고, 통합 과정에서 발견된 범위 내 결함을 수정해 인증 연동 전 핵심 업무 규칙과 UI를 검증 가능한 상태로 만든다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`
- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 목록 진입 → 검색 우선순위 확인 → 회의실 선택 → 예약 생성 → 현황 반영 → 예약 수정 → 재조회로 이어지는 통합 Cypress 시나리오를 먼저 작성하고 의도한 실패를 기록한다.
- [ ] Green: Backend Application Contract와 프런트엔드 Gateway 타입·변환을 정렬하고 통합 시나리오를 막는 범위 내 결함만 수정한다.
- [ ] Green: 인증 연동 대기, 조회 실패, 생성·수정 충돌과 재조회 후 복구 흐름을 통합 시나리오에 포함한다.
- [ ] Green: 데스크톱과 모바일에서 동일 핵심 흐름을 수행하고 시간표의 텍스트 대체 접근 경로를 유지한다.
- [ ] Green: Production Build에서는 HTTP 요청 없이 모든 회의실 상태 변경이 기본 거부되고 테스트 전용 Gateway가 포함되지 않도록 한다.
- [ ] Refactor: 통합 과정에서 생긴 중복 어댑터와 테스트 Fixture를 기능 경계 안에서 정리하고 전체 관련 테스트를 다시 통과시킨다.
- [ ] 선행 Task에서 제외한 사진·장비·취소·알림·스키마·권한 정책을 통합 결함으로 가장해 추가하지 않는다.
- [ ] 구현 실패 시 같은 원인에 대해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew spotlessCheck && ./gradlew test && ./gradlew build`를 통과한다.
- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room && npm run typecheck && npm run lint -- src/App.tsx src/features/meeting-room cypress/e2e/meeting-room && npm run build`를 통과한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/**/*.cy.ts'`로 테스트 전용 Gateway를 사용하는 회의실 Cypress 시나리오만 통과한다.
- [ ] 모든 선행 Task의 Application Contract와 최종 흐름 사이 충돌·회귀가 없고 Red → Green → Refactor 실행 기록이 남았는지 검증한다.
- [ ] 로그·오류 응답·브라우저 출력에 토큰, Authorization Header, 참석자 개인정보와 내부 예외가 노출되지 않는지 확인한다.
- [ ] Spring MVC Context에 회의실 HTTP Endpoint가 등록되지 않고 Production Bundle에 테스트 Adapter·Fixture가 포함되지 않는지 검증한다.

#### 완료 조건

- FR-019~FR-022의 Application Service·UI 범위와 NFR-006 중 이 Plan에 포함된 인수 조건이 통합 흐름에서 충족되어야 한다.
- Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- Backend 전체 검증과 회의실 범위 Frontend·Cypress 검증이 통과하고 Application Contract와 Gateway 타입이 일치해야 한다.
- 모든 구현·검증 항목이 완료되고 전체 `quality_score`가 90 이상이어야 한다.
- 수정 가능·금지 경로를 준수하고 제외 범위를 완료로 보고하지 않아야 한다.

#### 실패 조건

- 핵심 통합 흐름 실패, 회의실 HTTP Endpoint 노출, 고정 사용자·임시 Header 사용, 예약·일정 불일치, 동시 예약 중복 성공, Application Contract 불일치 또는 민감정보 노출
- Backend 또는 회의실 범위 Frontend·Cypress 검증 실패, TDD 증거 누락, 수정 경로 위반 또는 제외 범위 침범
- 적용 가능한 Mandatory Gate 실패 또는 `quality_score`가 90 미만

#### 제외 범위

- FR-023 예약 취소와 연결 일정·알림 취소 처리
- 회의실 사진 업로드, 장비 관리, 관리자 회의실 관리, DB Migration·제약, AI 예약, 알림 발송
- Spring Security·JWT·RBAC, Backend HTTP Controller와 실제 Frontend HTTP Adapter
- 구현되지 않은 Dashboard 코드·테스트의 수정 또는 검증

#### 작업 결과

`none`

#### 남은 문제

- FR-023은 연결 일정의 `CANCELED` 상태·취소 주체를 저장할 승인된 Schema Review와 Migration Plan 이후 후속 Active Plan으로 구현해야 한다.
- 회의실 사진·장비 모델과 DB 수준 중복 예약 제약은 `backend/DB_SCHEMA.md`의 검토 대기 항목이며 사람의 Schema Review·ADR 승인이 필요하다.
- Spring Security·JWT·RBAC, Backend HTTP Controller, Frontend 운영 HTTP Adapter와 `401`·`403`·IDOR 검증은 후속 인증 연동 Active Plan에서 구현해야 한다.
- 관리자 수정 권한은 RBAC Design Doc에서 허용 범위를 확정한 뒤 후속 구현한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되고 Backend Application Contract와 Frontend Gateway 타입이 일치해야 한다.
- 각 Task의 수정 범위가 해당 Task의 수정 가능 경로를 벗어나지 않아야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 관련 Product Spec과 Design Doc의 이 Plan 포함 범위, SECURITY.md, ARCHITECTURE.md와 실제 구현이 일치하고 HTTP Endpoint가 노출되지 않아야 한다.
- 모든 적용 가능한 Mandatory Gate를 통과하고 전체 `quality_score`가 90 이상이어야 한다.
- Red → Green → Refactor 실행 기록, Backend 검증, Frontend 검증과 Cypress 증거가 Task 결과에 남아야 한다.
- 제외 범위와 남은 문제를 완료한 것으로 보고하지 않아야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패하거나 실행하지 못한 검증이 사람 승인 없이 생략됨
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec, Design Doc, SECURITY.md 또는 ARCHITECTURE.md와 충돌함
- 회의실 HTTP Endpoint 노출, 고정 사용자·임시 Header 사용, 운영 Adapter의 인증 없는 네트워크 요청, 예약·일정 불일치, 동시 예약 중복 성공 또는 민감정보 노출이 발생함
- 승인 없이 DB 스키마·Migration·의존성·권한 모델을 변경함
- 남은 문제가 사용자 확인 없이 방치되거나 제외 범위를 완료로 보고함
- 전체 `quality_score`가 90 미만이거나 Critical·Blocker Finding이 해결되지 않음
