# 작업 계획: meeting-room-02

## 1. 기본 정보

### 사용자 요청

회의실의 인증·인가 연동은 후속 작업으로 분리하고, 회의실 목록과 예약 현황 조회, 예약 생성 및 수정, 연결 일정 동기화와 반응형 화면을 먼저 구현한다.

2026-08-12 추가 요청에 따라 인증·인가 담당 작업이 완료되기 전에도 개발 서버의 `/meetingroom`에서 회의실 목록·검색·예약 생성·수정 흐름을 사람이 직접 확인할 수 있도록 개발 환경 전용 메모리 Gateway를 제공한다. 실제 API·DB 접근과 인증 우회는 허용하지 않으며 운영 빌드는 기존 차단 동작을 유지한다.

### 작업 목적

인증 방식과 보호 HTTP API를 임의로 확정하지 않으면서도 회의실 핵심 업무 규칙과 사용자 흐름을 독립적으로 구현하고 검증한다. 백엔드는 인증 주체를 직접 생성하거나 요청 사용자 ID를 신뢰하지 않는 Application Service 경계를 제공한다. 프런트엔드는 테스트 Gateway와 개발 환경 전용 메모리 Gateway로 기능을 검증하되, 운영 Gateway는 인증 연동 전까지 네트워크 요청과 상태 변경을 기본 거부한다.

### 작업 유형

- feature

### 기존 구현 검증 예외

- 2026-08-12 사용자 확인에 따라 Task 3의 예약·연결 일정 생성 Application Service는 이 Plan 실행 전에 이미 구현된 기존 구현으로 취급한다.
- Task 3은 과거에 수행되지 않은 Red 단계를 인위적으로 재현하지 않고 현재 요구사항, 회귀 테스트, 트랜잭션·동시성 검증을 수행한다.
- 2026-08-12 첫 Harness 실행에서 Task 7의 날짜별 조회 Contract 결함은 실패하는 Cypress 회귀 테스트로 재현된 뒤 수정되어 전체 18개 시나리오가 통과했으나, Worker가 이미 출력된 Red 종료 코드 `1`을 종료 코드 `0`으로 오판해 TDD 증거를 저장하지 못했다. 해당 실행 기록은 Notion 보고서 `3ba7b42e9f368197beaad4a2c5eaddda`에 남아 있다.
- 재실행 시 Task 7은 첫 실행에서 완료된 기존 구현과 실제 Red/Green 결과를 검증하는 Task로 취급하며, Red를 인위적으로 다시 만들지 않는다.
- Task 3과 재실행 Task 7의 TDD Mandatory Gate는 사유와 사람 승인, 현재 회귀 검증 근거가 기록된 `N/A`만 허용한다. 그 밖의 Task에는 이 예외를 적용하지 않는다.

### Task 8 TDD 실행 기록

- 2026-08-12 Primary 실행에서 개발 Gateway 선택, 메모리 생성·수정·날짜별 조회와 충돌 검증 테스트를 제품 코드보다 먼저 추가했다.
- Red: `cd frontend && npm run test:unit -- src/features/meeting-room/development-meeting-room-gateway.test.ts`가 `createDevelopmentMeetingRoomGateway is not a function`으로 3개 테스트 실패, 종료 코드 `1`을 기록했다.
- Green: 개발 전용 메모리 Gateway와 개발·테스트·운영 Resolver를 구현한 뒤 관련 단위 테스트 24개가 통과했고, 최종 Frontend 전체 단위 테스트 25개와 `npm run check`가 통과했다.
- Browser Regression: Test Gateway를 주입하지 않고 `/meetingroom`을 여는 `development-preview.cy.ts`를 추가해 인증 연동 대기 오류 없이 목록·검색 우선순위·예약 생성 흐름이 통과했으며, 회의실 Cypress 전체 17개가 통과했다.
- Task 8 재검증에서는 이미 완료된 Red를 인위적으로 다시 만들지 않고 위 실행 기록과 현재 Green 검증으로 TDD Mandatory Gate를 판정한다. 이는 TDD `N/A` 예외가 아니라 실제 Red → Green 실행 증거의 재사용이다.

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 회의실 목록과 예약 현황 Application Service 구현

#### 선행 Task

- `없음`

#### 작업 목적

FR-019에 따라 9:00~18:00 범위의 전체 회의실과 예약 현황을 조회하고, 수용 인원·날짜·시간대·예약 가능 여부 조건에 맞는 회의실을 필터링하는 Application Service를 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/room`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/build.gradle`
- `backend/src/main/resources`
- `frontend`
- `docs`

#### 구현 항목

- [ ] Red: 전체 목록, 조회 조건 우선순위, 9:00~18:00 경계, 예약 제목·시간대·표시 상태, 잘못된 조건과 존재하지 않는 회의실의 실패 테스트를 먼저 작성하고 의도한 실패를 기록한다.
- [ ] Green: 회의실과 예약 조회 DTO, Repository Query와 Application Service를 최소 구현한다.
- [ ] Green: 조회 조건은 전체·예약 가능·예약중 의미에 따라 필터링하고 일치 결과의 Repository 순서를 유지한다.
- [ ] Green: 저장 상태 `RESERVED`, `CANCELED`와 현재 시각을 사용해 예약 예정·사용 중·사용 완료 표시 상태를 계산하고 취소 예약은 일반 현황에서 제외한다.
- [ ] Refactor: Entity 직접 노출을 제거하고 조회·검증·표시 상태 계산 책임을 기능 경계 안에서 정리한다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.service.RoomAvailabilityServiceTest'`로 Task 1의 조회 규칙과 실패 상태를 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 Task 1 변경 Java 형식을 검증한다.
- [ ] 목록 조회가 인증 주체를 고정하거나 임시 Header·Cookie를 해석하지 않고 HTTP Endpoint를 추가하지 않았는지 확인한다.
- [ ] 로그와 예외에 SQL, 내부 클래스명 또는 불필요한 사용자 정보가 노출되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-019의 전체 목록, 검색 필터, 시간 범위와 표시 상태 인수 조건을 충족해야 한다.
- Red → Green → Refactor 증거와 Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 검색 조건과 다른 회의실이 포함되거나 예약 표시 상태를 저장 값으로 임의 확정함
- 보호되지 않은 HTTP Endpoint, 고정 사용자 또는 임시 인증 우회가 추가됨
- 필수 구현 항목 누락, 테스트·Spotless 실패, 경로 범위 위반 또는 검증할 수 없는 상태로 종료됨
- Product Spec, SECURITY.md 또는 Backend 계층 규칙과 다른 동작을 구현함
- `quality_score`가 `90` 미만임

#### 제외 범위

- Spring Security, Spring Session, Redis와 인증 Principal 연동
- HTTP Controller, 공개 API와 실제 프런트엔드 HTTP Adapter
- 회의실 사진 업로드, 장비 관리, 관리자 기능과 DB 스키마 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 회의실 목록과 예약 현황 화면 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

사용자가 공통 애플리케이션 레이아웃 안에서 회의실 목록, 기본 이미지, 예약 시간표와 검색 필터를 데스크톱과 모바일에서 확인할 수 있는 화면을 구현한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/features/auth`
- `docs`

#### 구현 항목

- [ ] Red: 공통 레이아웃 안의 회의실 화면, 목록, 기본 이미지, 9:00~18:00 시간표, 검색 필터, 로딩·빈 상태·오류·인증 연동 대기 상태의 실패 컴포넌트 테스트와 Cypress 테스트를 먼저 작성한다.
- [ ] Green: Task 1의 Application Contract와 일치하는 Gateway Port 및 회의실 화면을 구현하고 공통 헤더·사이드바·본문 레이아웃 안에 조립한다.
- [ ] Green: 수용 인원·날짜·시간대·예약 가능 여부 조건을 Gateway에 전달하고 일치하는 회의실만 표시한다.
- [ ] Green: 작은 화면에는 시간표의 텍스트 대체 목록을 제공하고 상태를 텍스트와 함께 표시한다.
- [ ] Green: 조회 실패 후 기존 유효 데이터와 재시도 수단을 유지하며 인증 연동 대기 상태를 빈 목록이나 일반 오류로 위장하지 않는다.
- [ ] Green: 테스트 전용 Gateway만 Cypress에서 주입하고 운영 Gateway는 네트워크 요청 없이 인증 연동 대기로 안전하게 실패시킨다.
- [ ] Refactor: Gateway, 화면 조립, 시간표와 상태 표시 책임을 기능 디렉터리 안에서 분리한다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/App.test.tsx src/features/meeting-room`으로 Task 2 화면 상태와 레이아웃 조립을 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/list.cy.ts'`로 데스크톱·모바일 목록과 검색 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 Gateway 계약과 컴포넌트 타입을 검증한다.
- [ ] 선행 Task Application Contract와 Gateway 타입 사이의 충돌이 없고 테스트 전용 Gateway가 운영 Bundle 경로에서 참조되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-019와 NFR-006의 목록·검색·상태·반응형·접근성 인수 조건을 충족해야 한다.
- Red → Green → Refactor 증거와 Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 공통 레이아웃을 우회하거나 검색 조건과 다른 결과를 표시하고 모바일 대체 경로를 제공하지 않음
- 운영 Gateway가 인증 없이 HTTP 요청을 보내거나 테스트 Adapter가 Production Bundle에 포함됨
- 필수 구현 항목 누락, 단위·Cypress·Type Check 실패, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, Design Doc 또는 선행 Task 계약과 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 실제 Backend HTTP 연동과 인증·인가 상태 관리
- Router 신규 도입, 전역 레이아웃 재설계와 신규 디자인 시스템
- 사진 업로드, 장비 편집과 관리자 회의실 관리 UI

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 기존 회의실 예약과 연결 일정 생성 Application Service 검증

#### 선행 Task

- `Task 2`

#### 작업 목적

이 Plan 실행 전에 구현된 예약·연결 일정 생성 Application Service가 FR-020~FR-021의 시간·수용 인원·참석자·트랜잭션·동시성 규칙을 충족하는지 검증하고, 범위 내 실제 결함만 수정한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain/room`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/schedule/controller`
- `backend/build.gradle`
- `backend/src/main/resources`
- `frontend`
- `docs`

#### 구현 항목

- [ ] Existing Verification: 기존 구현의 정상 생성, 9:00~18:00 경계, 잘못된 시간, 중복 참석자 정규화, 수용 인원 초과, 접근 불가 참석자와 예약 충돌을 회귀 테스트로 검증한다.
- [ ] Existing Verification: 예약과 연결 일정의 단일 트랜잭션, 일정 생성 실패 Rollback, 동일 회의실 동시 요청의 단일 성공을 통합 테스트로 검증한다.
- [ ] Existing Verification: `ReservationActor`와 사용자 ID가 없는 생성 Command를 사용하며 고정 사용자, 임시 인증 Header 또는 인증 우회 코드가 없음을 확인한다.
- [ ] Defect Fix: 검증에서 실제 요구사항 결함이 발견된 경우에만 실패 테스트를 먼저 유지하고 최소 제품 코드 변경으로 수정한다.
- [ ] Refactor: 실제 결함 수정에 필요한 경우에만 회의실·일정·사용자 Service 경계를 정리하며 동작 변경 없는 임의 리팩터링은 수행하지 않는다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.service.RoomReservationServiceTest' --tests 'com.flowbi.domain.room.service.RoomReservationTransactionTest' --tests 'com.flowbi.domain.room.service.RoomReservationConcurrencyTest'`로 Task 3 규칙과 정합성을 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 Task 3 변경 Java 형식을 검증한다.
- [ ] 선행 Task 조회 모델과 생성 결과가 충돌하지 않고 성공 후 같은 조회 계약으로 예약을 확인할 수 있는지 검증한다.
- [ ] 예약과 일정의 부분 성공, 고정 사용자, 요청 사용자 ID, 보호되지 않은 HTTP Endpoint와 민감정보 로그가 없는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-020~FR-021의 생성·연결 일정·충돌·트랜잭션 인수 조건을 충족해야 한다.
- Task 3의 TDD Mandatory Gate는 기존 구현 사유, 2026-08-12 사람 승인과 현재 회귀 검증 근거를 포함한 `N/A`여야 하며, Permission·보안, 범위, 요구사항, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate는 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 예약·연결 일정 부분 성공, 겹치는 예약 중복 성공, 수용 인원·참석자 검증 누락 또는 사용자 ID를 요청에서 신뢰함
- 보호되지 않은 HTTP Endpoint나 임시 인증 우회가 추가됨
- 필수 구현 항목 누락, 테스트·Spotless 실패, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, SECURITY.md, Design Doc 또는 선행 Task 계약과 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- Spring Security, 세션 Principal 변환과 RBAC 관리자 권한
- HTTP Controller, 상태 코드·오류 응답 매핑과 실제 API 공개
- DB Migration, PostgreSQL 고유 제약과 Idempotency Key

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 회의실 예약 생성 화면 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

선택한 회의실의 예약 패널에서 날짜·시간대·참석자·상세 설명을 입력하고 예약 및 연결 일정 생성 결과를 확인할 수 있는 반응형 사용자 흐름을 구현한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/features/auth`
- `docs`

#### 구현 항목

- [ ] Red: 패널 열기·닫기, 초기 포커스·복귀, 저장하지 않은 입력 확인, 필수값, 시간 경계, 참석자 중복·수용 인원, 제출 중 중복 방지, 성공·충돌·입력 오류의 실패 컴포넌트 테스트와 Cypress 테스트를 먼저 작성한다.
- [ ] Green: Task 3 Command와 일치하는 Form Schema와 Gateway Mutation을 구현한다.
- [ ] Green: 데스크톱 우측 패널과 모바일 전체 폭 Overlay 흐름에서 Label·오류 연결·닫기 수단·포커스 관리를 제공한다.
- [ ] Green: 생성 성공 확정 후에만 성공 상태로 전환하고 영향받는 회의실 조회만 갱신한다.
- [ ] Green: 충돌 시 입력을 보존하고 시간대 재선택 및 예약 현황 재조회 수단을 제공한다.
- [ ] Green: 운영 Gateway에서는 제출을 비활성화하고 인증 연동 대기 사유를 표시하며 테스트 전용 Gateway에서만 생성 흐름을 실행한다.
- [ ] Refactor: 생성 Form, Schema, 오류 매핑과 패널 표현 책임을 기능 경계 안에서 정리한다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`으로 Task 4의 Form·Mutation·접근성 상태를 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/create.cy.ts'`로 데스크톱·모바일 생성과 충돌 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 생성 Command와 Gateway 타입을 검증한다.
- [ ] 선행 Task 생성 Command와 프런트엔드 Payload가 충돌하지 않고 사용자 ID·인증 Header가 Payload에 추가되지 않았는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-020~FR-021과 NFR-006의 생성·오류·반응형·접근성 인수 조건을 충족해야 한다.
- Red → Green → Refactor 증거와 Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 중복 제출, 충돌 성공 처리, 입력 유실, 모바일 흐름 또는 접근 가능한 Label·오류·포커스가 누락됨
- 운영 Gateway가 인증 없이 상태 변경 요청을 전송하거나 테스트 Adapter가 Production Bundle에 포함됨
- 필수 구현 항목 누락, 단위·Cypress·Type Check 실패, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, Design Doc 또는 선행 Task 계약과 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 실제 Backend HTTP 요청과 인증·인가 상태 처리
- 외부 참석자, 알림 설정, AI 예약과 낙관적 생성
- 회의실 사진·장비 편집과 관리자 전용 UI

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. 회의실 예약과 연결 일정 수정 Application Service 구현

#### 선행 Task

- `Task 4`

#### 작업 목적

FR-022에 따라 수정 가능한 예약의 시간·회의실·제목·참석자·상세 설명을 변경하고 연결 일정을 같은 트랜잭션에서 동기화하는 Application Service를 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain/room`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/schedule/controller`
- `backend/build.gradle`
- `backend/src/main/resources`
- `frontend`
- `docs`

#### 구현 항목

- [ ] Red: 정상 수정, 변경된 시간·회의실 충돌, 취소 예약 수정 거부, 잘못된 입력, 비소유자와 존재하지 않는 예약의 동일 비노출 오류, 동시 수정과 연결 일정 수정 실패 Rollback 테스트를 먼저 작성한다.
- [ ] Green: 사용자 ID가 없는 수정 Command와 별도 `ReservationActor`를 사용하는 수정 Application Service를 구현한다.
- [ ] Green: 예약과 연결 일정의 소유권이 일치하는 경우에만 수정하고 비소유자와 존재하지 않는 대상은 내부 정보가 구분 노출되지 않도록 거부한다.
- [ ] Green: 예약·회의실 잠금과 충돌 재검사를 적용하고 예약과 일정 변경을 하나의 트랜잭션으로 처리한다.
- [ ] Green: 참석자 접근 가능 여부, 수용 인원, 영업 시간과 수정 가능한 예약 상태를 재검증한다.
- [ ] Refactor: 생성과 공유 가능한 검증만 추출하고 소유권·수정·일정 협력 책임을 명확히 유지한다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.service.RoomReservationUpdateServiceTest' --tests 'com.flowbi.domain.room.service.RoomReservationUpdateTransactionTest' --tests 'com.flowbi.domain.room.service.RoomReservationUpdateRollbackTest' --tests 'com.flowbi.domain.room.service.RoomReservationUpdateConcurrencyTest'`로 Task 5 수정·소유권·정합성을 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 Task 5 변경 Java 형식을 검증한다.
- [ ] 선행 Task 생성 결과를 같은 Application Contract로 수정할 수 있고 예약·일정 데이터가 충돌하거나 부분 갱신되지 않는지 확인한다.
- [ ] 비소유자 오류에서 예약 존재 여부, 작성자 ID, 참석자 정보와 내부 예외가 노출되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-022의 수정·소유권·충돌·연결 일정·트랜잭션 인수 조건을 충족해야 한다.
- Red → Green → Refactor 증거와 Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 비소유자 수정, 요청 사용자 ID 신뢰, 취소 예약 수정, 예약·연결 일정 부분 갱신 또는 겹치는 예약 중복 성공이 발생함
- 보호되지 않은 HTTP Endpoint, 고정 사용자 또는 임시 인증 우회가 추가됨
- 필수 구현 항목 누락, 테스트·Spotless 실패, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, SECURITY.md, Design Doc 또는 선행 Task 계약과 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 세션 Principal과 `ReservationActor` 변환, 관리자 수정 권한과 RBAC
- HTTP Controller, HTTP 상태·오류 매핑과 실제 API 공개
- 예약 취소, 알림 변경과 DB 스키마 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 6. 회의실 예약 수정 화면 구현

#### 선행 Task

- `Task 5`

#### 작업 목적

수정 가능한 예약의 기존 값을 불러와 변경하고, 성공 후 목록과 예약 현황에서 연결 일정까지 반영된 결과를 확인할 수 있는 반응형 화면 흐름을 구현한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/features/auth`
- `docs`

#### 구현 항목

- [ ] Red: 기존 값 표시, 수정 행동 표시 조건, 권한 거부, 입력 검증, 충돌, 저장 중 중복 요청 방지, 성공 후 현황 갱신과 모바일 포커스 흐름의 실패 컴포넌트 테스트와 Cypress 테스트를 먼저 작성한다.
- [ ] Green: Task 5 수정 Contract와 일치하는 조회·수정 Gateway Mutation과 Form을 구현한다.
- [ ] Green: 수정 가능 정보가 없으면 수정 행동을 노출하지 않고 Gateway 거부 상태도 안전한 사용자 메시지로 처리한다.
- [ ] Green: 수정 성공 확정 후 영향받는 회의실 조회만 갱신하고 충돌 시 입력을 보존한 채 재선택·재조회 수단을 제공한다.
- [ ] Green: 데스크톱 패널과 모바일 Overlay에서 Label·오류 연결·초기 포커스·포커스 복귀·저장하지 않은 변경 확인을 제공한다.
- [ ] Green: 운영 Gateway에서는 수정 요청을 비활성화하고 인증 연동 대기 사유를 표시한다.
- [ ] Refactor: 생성 Form과 안전하게 공유할 Schema·Field만 추출하고 수정 권한 표시와 Mutation 책임을 분리한다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`으로 Task 6의 수정·오류·캐시 갱신·접근성 상태를 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/update.cy.ts'`로 정상·거부·충돌·모바일 수정 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 수정 Contract와 컴포넌트 타입을 검증한다.
- [ ] 선행 Task 수정 Contract와 Gateway가 충돌하지 않고 프런트엔드 표시 제한을 실제 서버 인가 완료로 간주하지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-022와 NFR-006의 수정·오류·반응형·접근성 인수 조건을 충족해야 한다.
- Red → Green → Refactor 증거와 Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 충돌을 성공 처리하거나 사용자 입력을 잃고 모바일 수정·포커스·오류 상태를 제공하지 않음
- 프런트엔드 표시 제한을 서버 인가로 보고하거나 운영 Gateway가 인증 없이 수정 요청을 보냄
- 필수 구현 항목 누락, 단위·Cypress·Type Check 실패, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, Design Doc 또는 선행 Task 계약과 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 실제 Backend HTTP 연동과 인증·인가 처리
- 관리자 수정 권한, 예약 취소와 일반 캘린더 수정 흐름
- 사진·장비·알림과 AI 기능

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 7. 회의실 핵심 흐름 통합 검증 및 결함 수정

#### 선행 Task

- `Task 6`

#### 작업 목적

회의실 목록 진입부터 검색 필터, 예약 생성, 현황 반영, 예약 수정과 재조회까지의 Application Contract와 테스트 전용 Gateway 흐름을 통합하고 범위 내 결함을 수정한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain/room`
- `frontend/src/features/meeting-room`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/schedule/controller`
- `backend/build.gradle`
- `backend/src/main/resources`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/features/auth`
- `docs`

#### 구현 항목

- [ ] Existing Verification: 첫 Harness 실행에서 추가된 날짜 변경 재조회 Cypress 회귀 테스트와 목록 진입 → 검색 필터 → 회의실 선택 → 예약 생성 → 현황 반영 → 예약 수정 → 재조회 흐름을 검증한다.
- [ ] Existing Verification: Backend Application Contract와 프런트엔드 Gateway 타입·오류 코드, 조회 날짜를 반영하는 테스트 Gateway Fixture가 정렬됐는지 검증하고 발견된 결함만 수정한다.
- [ ] Green: 데스크톱과 모바일에서 동일 핵심 흐름을 수행하고 모바일 시간표의 텍스트 대체 경로를 유지한다.
- [ ] Green: 운영 Gateway는 HTTP 요청과 상태 변경을 기본 거부하고 테스트 Gateway·Fixture가 Production 진입점에서 참조되지 않도록 한다.
- [ ] Green: Spring MVC Context에 회의실 HTTP Endpoint가 등록되지 않음을 회귀 테스트로 유지한다.
- [ ] Refactor: 통합 과정에서 생긴 중복 변환·Fixture를 기능 경계 안에서 정리하고 공개 Contract의 의미를 유지한다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.*'`로 회의실 Application Service와 HTTP 비노출 상태를 검증한다.
- [ ] `cd frontend && npm run test:unit -- src/App.test.tsx src/features/meeting-room`으로 회의실 화면과 공통 레이아웃 통합을 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/**/*.cy.ts'`로 전체 회의실 브라우저 흐름을 검증한다.
- [ ] 선행 Task들의 생성·수정·조회 Contract 사이 충돌과 회귀가 없고 Production 코드에 테스트 Adapter·고정 사용자·임시 Header가 포함되지 않는지 확인한다.
- [ ] 로그·오류·브라우저 출력에 토큰, Authorization Header, 전체 참석자 개인정보와 내부 예외가 노출되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-019~FR-022와 NFR-006의 이 Plan 포함 범위가 통합 흐름에서 충족되어야 한다.
- 첫 실행의 실제 Red/Green 결과와 재실행 사유, 사람 승인, 현재 회귀 검증 근거를 기록한 TDD `N/A`, Permission·보안, 범위, 요구사항, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 핵심 통합 흐름, 회의실 범위 테스트 또는 모바일 흐름이 실패함
- 회의실 HTTP Endpoint, 인증 없는 운영 요청, 고정 사용자·임시 Header, 예약·일정 불일치 또는 동시 예약 중복 성공이 발생함
- 필수 구현 항목 누락, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, Design Doc, SECURITY.md 또는 선행 Task 계약과 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- Spring Security 활성화, Spring Session Redis, 로그인과 세션 Principal 연동
- 회의실 Controller, 실제 HTTP Adapter, `401`·`403`·IDOR·CSRF 검증과 관리자 RBAC
- FR-023 예약 취소, 연결 일정·알림 취소와 승인되지 않은 DB Migration
- 회의실 사진 업로드, 장비 관리, 관리자 기능, 알림 발송과 AI 예약

#### 작업 결과

`none`

#### 남은 문제

- 보호 API 공개와 실제 Frontend 연동은 서버 세션 인증 주체를 `ReservationActor`로 변환하고 객체 수준 인가를 적용하는 후속 Active Plan이 필요하다.
- FR-023 예약 취소는 예약·연결 일정의 취소 상태, 취소 주체와 시점을 저장할 Schema Review 및 Migration 승인 후 별도 구현해야 한다.
- 회의실 사진·장비 모델과 PostgreSQL DB 수준 중복 예약 제약은 승인된 ADR 및 Migration Plan 이후 구현해야 한다.

---

### Task 8. 개발 서버 수동 검증용 회의실 Gateway 구현

#### 선행 Task

- `Task 7`

#### 작업 목적

인증·인가와 보호 HTTP API가 준비되기 전에도 개발자가 `127.0.0.1:5173/meetingroom`에서 회의실 목록·검색·예약 생성·수정과 날짜별 현황 반영을 직접 확인할 수 있도록 개발 환경 전용 메모리 Gateway를 제공한다. 실제 서버 요청이나 영속 데이터 변경 없이 Frontend Gateway Contract를 검증하며 운영 모드에서는 기존 `AUTH_INTEGRATION_PENDING` 차단을 유지한다.

#### 수정 가능 경로

- `frontend/src/App.tsx`
- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `docs`

#### 구현 항목

- [ ] Red: 개발 모드에서는 목록·검색·예약 생성·수정이 가능한 메모리 Gateway가 선택되고, 운영 모드에서는 주입이나 개발 Gateway가 선택되지 않는 실패 테스트를 먼저 작성해 의도한 실패를 기록한다.
- [ ] Green: 기존 `MeetingRoomGateway` 계약과 오류 코드를 그대로 구현하는 개발 환경 전용 메모리 Gateway를 기능 경계 안에 추가한다.
- [ ] Green: 개발 서버에서 초기 회의실·날짜별 예약 Fixture를 제공하고 검색 필터, 예약 생성 후 현황 반영, 예약 수정 후 재조회가 새로고침 전까지 메모리에서 유지되도록 한다.
- [ ] Green: 개발 Gateway 선택은 Vite 개발 모드에서만 허용하며 Production Gateway는 네트워크 요청과 상태 변경을 계속 `AUTH_INTEGRATION_PENDING`으로 거부한다.
- [ ] Green: 개발 Gateway는 실제 사용자 ID, Authorization Header, Cookie, Token, 실제 API·DB 접근 또는 인증 완료로 오인할 수 있는 권한 판정을 포함하지 않는다.
- [ ] Refactor: Cypress Gateway와 개발 Gateway가 동일 공개 Contract를 사용하도록 유지하되, 테스트 디렉터리의 Adapter를 Production 진입점에서 import하지 않는다.
- [ ] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/App.test.tsx src/features/meeting-room`으로 개발·운영 Gateway 선택, 목록·검색·생성·수정과 날짜별 메모리 상태를 검증한다.
- [ ] `cd frontend && npm run check`로 타입, Lint와 Format을 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/**/*.cy.ts'`로 기존 회의실 브라우저 흐름의 회귀가 없는지 검증한다.
- [ ] 개발 서버의 `/meetingroom`을 직접 열어 초기 목록과 검색 결과가 `AUTH_INTEGRATION_PENDING` 없이 표시되는지 확인한다.
- [ ] Production 모드에서 개발 Gateway·Fixture가 선택되지 않고 Production Gateway의 기본 거부가 유지되는지 확인한다.
- [ ] 소스와 브라우저 출력에 실제 사용자 ID, Authorization Header, Cookie, Token과 불필요한 참석자 개인정보가 포함되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 개발 서버에서 FR-019~FR-022의 화면 흐름을 사람이 직접 검증할 수 있어야 한다.
- Red → Green → Refactor 증거와 Permission·보안, 범위, 요구사항, TDD, 자동 검증, 계약 동기화, Critical Finding Mandatory Gate가 모두 통과해야 한다.
- 운영 모드의 인증 연동 대기 차단과 Backend HTTP 비노출 상태가 변경되지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 개발 서버에서 목록·검색·예약 생성·수정 또는 날짜별 재조회가 동작하지 않음
- 운영 모드에서 개발 Gateway가 선택되거나 실제 서버 요청·상태 변경이 인증 없이 발생함
- 실제 사용자 ID, 고정 인증 주체, 임시 Authorization Header·Cookie·Token 또는 실제 API·DB 접근이 추가됨
- 테스트 Adapter를 Production 진입점에서 import하거나 실제 API 계약과 다른 공개 Gateway 계약을 추가함
- 필수 구현 항목 누락, 테스트·Check·Cypress 실패, 경로 범위 위반 또는 검증 불가 상태로 종료됨
- Product Spec, Frontend 구조 규칙 또는 SECURITY.md와 충돌함
- `quality_score`가 `90` 미만임

#### 제외 범위

- Spring Security 활성화, Spring Session Redis, 로그인과 세션 Principal 연동
- 회의실 Controller, 실제 HTTP Adapter와 DB 접근
- `401`·`403`·IDOR·CSRF 검증과 관리자 RBAC
- FR-023 예약 취소, 사진·장비 관리, 알림과 AI 예약

#### 작업 결과

`none`

#### 남은 문제

- 개발 Gateway는 수동 UI 검증만 위한 비영속 메모리 Adapter이며 실제 통합 완료를 의미하지 않는다.
- 인증·인가 담당 작업이 완료되면 보호 HTTP API에 연결하는 Gateway로 교체하고 개발 Gateway 선택 정책을 재검토해야 한다.

---

### Task 9. 회의실 검색 필터와 예약 완료 후 닫기 결함 수정

> 검색 상태 명칭과 의미는 후속 Task 10이 대체한다. 예약 완료 후 닫기와 조건 일치 필터 원칙은 유지한다.

#### 선행 Task

- `Task 8`

#### 작업 목적

사용자가 날짜·시간대와 `사용 중` 상태를 검색하면 해당 시간대에 실제 사용 중인 회의실만 표시하고, 예약 생성 성공 후 `닫기`를 누르면 추가 폐기 확인 없이 패널을 닫아 갱신된 예약 시간표를 바로 확인할 수 있도록 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/room`
- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`
- `docs/product-specs/meeting-room.md`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/resources`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `docs` 중 Product Spec과 이 Active Plan 이외 경로

#### 구현 항목

- [x] Red: 10:00~11:00 `사용 중` 검색 시 해당 예약이 있는 한강 회의실만 반환·표시하고, 예약 성공 후 `닫기`가 패널을 즉시 닫으며 생성 예약 시간표가 표시되는 실패 테스트를 먼저 작성한다.
- [x] Green: 수용 인원과 예약 상태 조건은 불일치 회의실을 후순위에 남기지 않고 결과에서 제외하며, 예약 상태는 선택 날짜·시간대와 겹치는 예약을 기준으로 판정한다.
- [x] Green: 예약 상태를 선택하지 않은 명시 시간대 검색은 해당 시간대에 예약이 겹치지 않는 회의실만 표시하고, 기본 09:00~18:00 전체 조회는 전체 회의실을 유지한다.
- [x] Green: 개발 Gateway 샘플의 10:00~11:00 예약은 `사용 중` 검색 검증이 가능하도록 표시 상태를 일관되게 제공한다.
- [x] Green: 예약 생성·수정 성공 뒤 `닫기`는 dirty 입력 폐기 확인 없이 패널을 닫고, 성공 Mutation으로 갱신된 현재 조회의 예약 블록과 수정 동작을 표시한다.
- [x] Refactor: 검색 판정과 예약 표시 상태 계산을 Gateway·Application Service 경계에서 읽을 수 있는 함수로 정리하고 공개 Command 계약은 변경하지 않는다.
- [x] 같은 구현 실패는 최초 실행을 포함해 최대 3회까지만 수정·재검증하고 이후 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [x] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.service.RoomAvailabilityServiceTest'`로 검색 조건 필터와 상태·시간대 경계를 검증한다.
- [x] `cd frontend && npm run test:unit -- src/features/meeting-room`으로 개발 Gateway 검색과 성공 후 닫기·현황 갱신을 검증한다.
- [x] `cd frontend && npm run check`로 타입, Lint, Format, 단위 테스트와 Production Build를 검증한다.
- [x] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/**/*.cy.ts'`로 10:00~11:00 사용 중 검색과 예약 완료 후 닫기·시간표 반영을 검증한다.
- [x] 운영 Gateway의 인증 연동 대기 차단, HTTP 비노출과 실제 API·DB 미접근 상태가 유지되는지 확인한다.

#### 완료 조건

- 모든 구현·검증 항목이 완료되고 Red → Green → Refactor 증거가 기록되어야 한다.
- 10:00~11:00 `사용 중` 검색 결과에는 해당 예약이 있는 한강 회의실만 표시되어야 한다.
- 예약 성공 후 `닫기` 한 번으로 패널이 닫히고 새 예약이 현재 날짜 시간표에 표시되어야 한다.
- Product Spec, Backend Application Contract와 Frontend Gateway의 검색 의미가 일치해야 한다.
- 인증·인가, 공개 HTTP API와 DB 스키마를 변경하지 않아야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 검색 조건과 일치하지 않는 회의실이 결과에 남거나 일치 회의실이 누락됨
- 예약 성공 후 닫기에 입력 폐기 확인이 표시되거나 갱신된 예약이 보이지 않음
- 기본 전체 조회가 회의실을 임의로 제거하거나 날짜·시간대가 다른 예약을 상태 검색에 포함함
- 인증 우회, 실제 HTTP·DB 접근, 공개 API 또는 스키마 변경이 발생함
- 테스트·Check·Cypress·Spotless 실패 또는 경로 범위 위반이 발생함

#### 제외 범위

- 인증·인가, 세션 Principal과 `ReservationActor` 연동
- 회의실 HTTP Controller와 실제 Frontend HTTP Adapter
- 예약 취소, 사진·장비, 알림과 AI 예약

#### 작업 결과

- Red
  - Backend `RoomAvailabilityServiceTest`에 수용 인원·10:00~11:00 상태 검색 필터 기대값을 먼저 추가했고, 불일치 회의실이 남아 3개 테스트가 의도대로 실패했다.
  - Frontend 개발 Gateway와 Page 테스트에 동일 검색 및 예약 성공 후 한 번의 닫기 기대값을 먼저 추가했고, 불일치 회의실 노출·잘못된 샘플 상태·폐기 확인 노출로 3개 테스트가 의도대로 실패했다.
- Green
  - Backend 조회를 선택 조건과 겹치는 예약 기준의 필터로 변경하고 기본 09:00~18:00 조회 호환성을 유지했다.
  - 개발 Gateway의 표시 상태·시간 겹침 필터를 계약과 맞추고, 성공 상태의 패널은 즉시 닫으며 생성 성공 시 현재 조회 Key만 정확히 갱신하도록 변경했다.
- Refactor
  - Backend 필터 판정을 `matches`로 분리하고 개발·Cypress Gateway의 시간 겹침과 표시 상태를 명시해 공개 Command, HTTP API와 DB Schema는 변경하지 않았다.
- 검증
  - Backend `./gradlew spotlessCheck test build`: 통과.
  - Frontend `npm run check`: 단독 재실행 통과(Typecheck, Lint, Format, Unit 27/27, Production Build). Cypress와 병렬 실행한 최초 전체 Check에서는 자원 경합으로 Unit 2개가 5초 Timeout 되었고 검증을 완화하지 않은 채 단독 재실행으로 통과를 확인했다.
  - Frontend 회의실 Cypress 전체: 17/17 통과. 변경 뒤 남아 있던 모바일 표시 상태 기대값 1건을 수정하고 두 번째 실행에서 전체 통과했다.
  - 운영 Gateway의 `AUTH_INTEGRATION_PENDING`, HTTP Endpoint 비노출, 실제 API·DB 미접근과 인증·인가 후속 범위를 유지했다.

#### 남은 문제

- 실제 HTTP 연동 시 서버 검색 응답도 동일 필터 계약을 유지해야 한다.

---

### Task 10. 예약 상태 검색 옵션 단순화

#### 선행 Task

- `Task 9`

#### 작업 목적

회의실 검색의 예약 상태 옵션을 `전체`, `예약 가능`, `예약중`으로 단순화하고 시간표에 표시하는 예약 예정·사용 중·사용 완료 상태와 검색 의미를 분리한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/room`
- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`
- `docs/product-specs/meeting-room.md`

#### 수정 금지 경로

- 인증·인가 및 Controller 경로
- Backend Resource, DB Schema와 Migration
- Frontend 인증 기능, Package Manifest와 Vite 설정
- Product Spec과 이 Active Plan 이외 문서

#### 구현 항목

- [x] Red: 검색 옵션이 `전체`, `예약 가능`, `예약중`만 제공되고 10:00~11:00 검색에서 예약 가능은 남산, 예약중은 한강만 표시되는 실패 테스트를 먼저 작성한다.
- [x] Green: 검색 전용 상태를 `AVAILABLE`, `RESERVED`로 분리하고 `전체`는 예약 유무로 제외하지 않도록 Backend Query와 Frontend Gateway 계약을 동기화한다.
- [x] Green: 개발·Cypress Gateway가 선택 날짜·시간대의 겹침 여부로 예약 가능·예약중을 판정하도록 한다.
- [x] Green: 시간표의 예약 예정·사용 중·사용 완료 표시 상태는 변경하지 않는다.
- [x] Refactor: 검색 상태 Label과 예약 표시 상태 Label의 책임을 분리한다.

#### 검증 항목

- [x] Backend `RoomAvailabilityServiceTest`로 전체·예약 가능·예약중과 수용 인원 조합을 검증한다.
- [x] Frontend 회의실 단위 테스트로 옵션과 Gateway 필터를 검증한다.
- [x] `npm run check`와 Backend `./gradlew spotlessCheck test build`를 통과한다.
- [x] 회의실 Cypress 전체에서 예약 가능·예약중 검색 회귀를 검증한다.

#### 완료 조건

- 검색 Select에는 `전체`, `예약 가능`, `예약중`만 표시된다.
- 10:00~11:00 기준 예약 가능은 남산 회의실, 예약중은 한강 회의실만 표시된다.
- 기본 `전체` 조회는 회의실을 예약 유무로 제외하지 않는다.
- 인증·인가, HTTP API와 DB Schema는 변경하지 않는다.
- Red → Green → Refactor 증거가 기록되고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 검색 옵션에 예약 예정·사용 중·사용 완료가 남아 있음
- 예약 가능·예약중이 선택 시간대의 겹침 여부와 다르게 판정됨
- 시간표 표시 상태가 검색 상태로 대체됨
- 필수 검증 실패, 인증 우회, API·DB 변경 또는 범위 위반이 발생함

#### 작업 결과

- Red
  - Backend 테스트는 검색 전용 `RoomAvailabilityStatus` 부재로 컴파일 실패했다.
  - Frontend 테스트는 기존 4개 옵션과 표시 상태 기반 필터 때문에 3개 테스트가 실패했다.
- Green
  - Backend와 Frontend Gateway Query에 `AVAILABLE`, `RESERVED` 검색 상태를 추가하고 겹치는 예약 유무로 필터링했다.
  - `전체`는 예약 유무로 제외하지 않으며 수용 인원 조건만 함께 적용한다.
  - 첫 Backend Green 실행은 테스트 지역 변수 이름 충돌로 컴파일 실패했고 이름을 수정한 두 번째 실행에서 대상 테스트가 통과했다.
- Refactor
  - `ROOM_AVAILABILITY_STATUS_LABELS`를 별도 파일로 분리해 시간표의 `RESERVATION_STATUS_LABELS`와 검색 라벨 책임을 분리했다.
- 검증
  - Backend `./gradlew spotlessCheck test build`: 통과.
  - Frontend `npm run check`: Typecheck, Lint, Format, Unit 27/27, Production Build 통과.
  - 회의실 Cypress: 최초 실행에서 기존 테스트가 Select 옵션의 `예약 예정` 문구를 실제 시간표 상태로 오인하던 1건을 발견해 `사용 중` 검증으로 수정했고, 재실행 17/17 통과.

#### 남은 문제

- 실제 HTTP Gateway 연동 시 검색 전용 예약 상태 계약을 동일하게 적용해야 한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되고 Backend Application Contract와 Frontend Gateway 타입이 일치해야 한다.
- 각 Task의 수정 범위가 해당 Task의 수정 가능 경로를 벗어나지 않아야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 관련 Product Spec, Design Doc, SECURITY.md와 실제 구현이 일치해야 한다.
- 신규 구현 Task의 Red → Green → Refactor 실행 증거가 Task 결과에 기록되어야 한다. Task 3과 재실행 Task 7은 승인된 기존 구현 검증 예외로서 TDD `N/A` 사유와 현재 회귀 검증 근거가 기록되어야 한다.
- 모든 Task 완료 후 Harness 실행기가 Backend `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`와 Frontend `npm run check`, 회의실 Cypress 전체 검증을 실행해 통과해야 한다.
- 회의실 HTTP Endpoint와 운영 HTTP Adapter가 노출되지 않고, 개발 Gateway는 Vite 개발 모드에서만 선택되며 인증·인가 후속 범위를 완료한 것으로 보고하지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패하거나 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경 또는 수정 금지 경로 변경이 발생함
- Product Spec, Design Doc, SECURITY.md 또는 Architecture와 충돌함
- 신규 구현 Task의 Red → Green → Refactor 증거가 누락되거나, Task 3 또는 재실행 Task 7의 승인된 기존 구현 예외 사유·현재 회귀 검증 근거가 누락되거나, 검증 실패를 우회함
- 인증 없는 회의실 HTTP Endpoint나 운영 상태 변경 요청, 고정 사용자, 임시 인증 Header 또는 요청 사용자 ID 신뢰가 발생함
- 예약과 연결 일정의 불일치, 동시 예약 중복 성공, 민감정보 노출, 테스트 Adapter의 Production 포함 또는 개발 Gateway의 운영 모드 선택이 발생함
- 승인 없이 인증·권한 모델, DB 스키마·Migration, 의존성 또는 핵심 기술을 변경함
- 제외 범위를 완료한 것으로 보고하거나 남은 문제가 사용자 확인 없이 방치됨
- 전체 `quality_score`가 `90` 미만이거나 Critical·Blocker Finding이 해결되지 않음
