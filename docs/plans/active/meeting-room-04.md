# 작업 계획: meeting-room-04

## 1. 기본 정보

### 사용자 요청

남아 있는 회의실 예약의 캘린더 일정 반영을 완성하고 회의실 예약 삭제 기능을 구현한다.

### 작업 목적

회의실 예약을 생성하면 연결 일정이 같은 트랜잭션에서 생성되고 Calendar의 월간·주간·일간 조회와 상세에 즉시 반영되게 한다. 회의실 예약 삭제는 물리 삭제가 아니라 예약과 연결 일정을 함께 취소 상태로 보존하는 안전한 흐름으로 구현하며, 취소된 예약과 일정은 기본 조회에서 제외한다.

### 작업 유형

- feature
- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`, `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`, `frontend/DESIGN.md`
- Architecture: `ARCHITECTURE.md`, `backend/BACKEND.md`, `frontend/FRONTEND.md`
- 기타 참고 문서: `AGENTS.md`, `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `backend/API.md`, `backend/DB_SCHEMA.md`

### 실행 전제와 범위

- 현재 Backend는 회의실 예약 생성 시 연결 일정을 생성한다. 이번 Plan은 예약 생성부터 Calendar 조회까지의 실제 통합 계약과 Frontend Cache 갱신을 보완한다.
- `삭제`는 Product Spec과 Design Doc에 따라 물리 삭제가 아니라 `RESERVED`에서 `CANCELED`로 전환하는 Soft Cancel을 의미한다.
- 예약 취소 권한은 MVP에서 예약 소유자에게만 제공한다. 별도의 관리자 대행 취소 권한은 승인된 세부 RBAC 계약이 없으므로 이번 범위에 포함하지 않는다.
- 취소 시 예약과 연결 일정은 하나의 트랜잭션에서 함께 상태를 변경한다. 알림 취소·발송은 Notification 도메인 구현 전이므로 후속 작업으로 남긴다.
- DB 변경은 기존 데이터를 보존하는 추가 Migration으로만 수행하고 PostgreSQL에서 검증한다.

---

## 2. 실행 Task

### Task 1. 회의실 예약과 Calendar 일정 Backend 연동 완성

#### 선행 Task

- `없음`

#### 작업 목적

회의실 예약 생성 결과가 연결 일정으로 저장되고 예약자와 참석자의 Calendar 기간·상세 조회에 동일한 제목·시간·회의실·설명으로 노출되는 통합 계약을 완성한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] 예약 생성 후 Calendar 기간 조회와 상세 조회까지 연결하는 통합 테스트를 먼저 작성해 예약자·참석자 공개, 비참석자 비공개, 제목·시간·회의실 위치·설명·참석자와 연결 식별 관계를 확인한다.
- [ ] 현재 구현이 통합 테스트를 통과하지 못하면 실패 원인을 Red로 기록하고, 예약과 일정 생성이 하나의 트랜잭션에서 수행되도록 최소 구현을 보완한다.
- [ ] 회의실 예약으로 생성된 일정은 `ACTIVE`, `PERSONAL`, `PRIVATE`와 기존 Calendar 공개 정책을 사용하고 예약자·참석자 외 사용자에게 노출하지 않는다.
- [ ] 일정 위치는 회의실 이름, 일정 시간은 `Asia/Seoul` 기준 예약 시간, 상세와 참석자는 예약 Command의 값을 손실 없이 반영한다.
- [ ] 일정 생성 실패 시 예약이 저장되지 않고 예약 저장 실패 시 일정도 남지 않도록 양방향 Rollback을 검증하고 범위 내 결함을 수정한다.
- [ ] Calendar에서 연결 일정의 수정·취소를 시도하면 기존 `ROOM_RESERVATION_MANAGED_SCHEDULE` 경계를 유지하고 회의실 예약 관리 흐름을 안내한다.
- [ ] Green 이후 예약·일정 변환과 트랜잭션 조정의 중복만 정리하고 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*RoomReservationTransactionTest' --tests '*RoomReservationSchedule*' --tests '*ScheduleQueryServiceTest' --tests '*ScheduleDetailServiceTest'`로 생성·조회·상세·공개 범위·Rollback을 검증한다.
- [ ] `cd backend && ./gradlew test --tests '*DatabaseRoomReservationScheduleLookupTest' --tests '*ScheduleSecurityIntegrationTest'`로 연결 일정 식별과 Calendar 직접 변경 차단을 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 변경한 Java Formatting을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-020, FR-021과 Mandatory Gate G1~G7이 충족되어야 한다.
- 결함이 재현되면 TDD Red → Green → Refactor 결과를, 기존 구현이 정상이라면 추가한 통합 회귀 테스트와 실행 결과를 작업 결과에 기록해야 한다.
- 예약·일정 부분 저장, 공개 범위 우회와 Calendar 직접 변경이 없어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Formatting 실패
- 예약 또는 일정만 저장되는 부분 성공 발생
- 예약자·참석자 외 사용자에게 일정이 노출되거나 필드가 불일치함
- Calendar가 회의실 예약 연결 일정을 직접 수정·취소함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 일반 일정 생성·수정·취소 정책 변경
- 회의실 예약 알림과 AI Assistant 연동
- 공개 API와 DB Schema 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 회의실 예약 생성 후 Calendar 즉시 갱신

#### 선행 Task

- `Task 1`

#### 작업 목적

사용자가 회의실 예약을 생성한 뒤 이미 조회된 Calendar 화면으로 이동하거나 돌아왔을 때 오래된 Cache가 아니라 새 연결 일정을 확인할 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress.config.ts`
- `frontend/cypress/support`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] Red 단계에서 Calendar Query가 Cache된 상태로 회의실 예약을 생성하면 Calendar에 새 일정이 즉시 반영되지 않는 흐름을 Component Test와 Cypress로 먼저 재현한다.
- [ ] 예약 생성 성공 후 현재 회의실 현황 Query와 Calendar 일정 목록 Query Prefix만 무효화하고 관련 없는 사용자·기능 Query는 변경하지 않는다.
- [ ] 예약 생성 응답의 `scheduleId`를 임의 일정 데이터로 낙관적 삽입하지 않고 서버 Calendar 조회 결과를 기준으로 화면을 갱신한다.
- [ ] 생성 실패 시 기존 Calendar Cache를 제거하거나 성공으로 표시하지 않고 예약 입력과 재시도 수단을 유지한다.
- [ ] Calendar에서 연결 일정 상세를 열면 제목·시간·회의실 위치·설명과 회의실 예약 관리 안내가 표시되는 사용자 흐름을 검증한다.
- [ ] Green 이후 Query Key와 Mutation 성공 처리의 중복만 회의실 기능 경계 안에서 정리하고 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/meeting-room`으로 Calendar Cache 무효화 범위, 성공·실패와 기존 회의실 생성 흐름 회귀를 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/create.cy.ts,cypress/e2e/meeting-room/integration.cy.ts'`로 예약 생성 후 Calendar 일정·상세 표시를 검증한다.
- [ ] 선행 Task 1의 예약·일정 응답 계약과 Frontend Gateway·Calendar Query Key가 충돌하지 않고 기존 기능 회귀가 없는지 확인한다.
- [ ] `cd frontend && npm run typecheck && npm run lint`로 타입과 정적 규칙을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-021의 사용자 흐름과 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor 결과와 실행 명령을 작업 결과에 기록해야 한다.
- 성공 전 임의 일정 표시, 실패 시 Cache 유실과 관련 없는 Query 무효화가 없어야 한다.
- PC·모바일과 키보드에서 예약 생성 후 Calendar 일정 확인이 가능해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트, Type Check, Lint 또는 Cypress 실패
- 예약 성공 후 Calendar에 일정이 나타나지 않거나 서버 확인 전 임의 일정이 표시됨
- 실패한 예약을 성공으로 처리하거나 기존 유효 Cache를 삭제함
- 선행 Task 계약과 충돌하거나 관련 없는 Query를 무효화함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Calendar 화면 구조와 일반 일정 UI 리팩터링
- Router·전역 상태·신규 Query Key 라이브러리 도입
- 회의실 예약 수정 후 Calendar 갱신의 별도 UX 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 회의실 예약과 연결 일정 Soft Cancel Backend 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

예약 소유자가 회의실 예약을 삭제하면 예약과 연결 일정이 같은 트랜잭션에서 취소 상태로 보존되고 기본 회의실·Calendar 조회에서 제외되게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/resources/db/migration`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/API.md`
- `backend/DB_SCHEMA.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red 단계에서 소유자 취소, 비소유·미존재 예약의 동일한 안전한 Not Found, 미인증 401, 반복 취소, 동시 취소와 연결 일정 취소 실패 Rollback을 재현하는 Service·Controller·Persistence 테스트를 먼저 작성한다.
- [ ] 기존 데이터를 보존하는 Migration으로 회의실 예약 취소 시각을 추가하고 `RESERVED`·`CANCELED` 상태와 취소 시각 조합을 CHECK로 보장하며 `backend/DB_SCHEMA.md`를 동기화한다.
- [ ] 예약을 잠금 조회한 뒤 현재 인증 Actor와 연결 일정 등록자를 기준으로 소유권을 검증하고 요청 Body·Query·임시 Header의 사용자 ID를 신뢰하지 않는다.
- [ ] 예약을 `CANCELED`와 취소 시각으로 전환하고 Schedule 도메인의 명시적인 회의실 예약 전용 경계를 통해 연결 일정을 `CANCELED`·취소 주체·취소 시각으로 같은 트랜잭션에서 전환한다.
- [ ] 같은 소유자의 반복 취소는 추가 상태 변경 없이 성공하고, 비소유·미존재 대상은 존재 여부를 구분하지 않는 `404`로 처리하며 동시 취소에서도 최종 상태가 하나로 수렴하게 한다.
- [ ] `DELETE /api/room-reservations/:reservationId`를 `204 No Content`로 구현하고 401·404·409와 안정적인 오류 코드를 OpenAPI 및 `backend/API.md`에 동기화한다.
- [ ] 취소 감사에는 Actor, 시각, 예약·일정 식별자와 결과만 포함하고 제목·설명·참석자·Session 정보를 기록하지 않는다.
- [ ] 취소된 예약은 회의실 예약 현황과 충돌 검사에서, 취소된 연결 일정은 Calendar 기간·상세 기본 조회에서 제외한다.
- [ ] Green 이후 상태 전이·권한·Schedule 협력의 중복만 정리하고 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*RoomReservationCancel*' --tests '*RoomReservationHttpFlowIntegrationTest' --tests '*RoomOpenApiContractTest'`로 204·401·권한·IDOR·멱등·오류 계약을 검증한다.
- [ ] `cd backend && ./gradlew test --tests '*RoomReservation*Transaction*' --tests '*RoomReservation*Concurrency*' --tests '*ScheduleQueryServiceTest' --tests '*ScheduleDetailServiceTest'`로 예약·일정 원자성, Rollback, 동시 취소와 조회 제외를 검증한다.
- [ ] 선행 Task 1~2의 예약 생성·Calendar 노출 계약과 취소 상태 전이·조회 제외가 충돌하지 않고 기존 생성 흐름에 회귀가 없는지 확인한다.
- [ ] 승인된 PostgreSQL 검증 환경에서 기존 예약이 있는 Schema에 Migration을 적용해 데이터 보존, 상태·취소 시각 CHECK, FK·Index와 기본 조회 제외를 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 변경한 Java Formatting을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-023, `schedule-and-notification.md` 결정 3의 예약·일정 취소 범위와 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor 결과, Migration 검증과 실행 명령을 작업 결과에 기록해야 한다.
- 예약·일정 부분 취소, 물리 삭제, IDOR와 인증 우회가 없어야 한다.
- API·DB 문서, Migration과 실제 구현이 일치해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트, Formatting 또는 PostgreSQL Migration 검증 실패
- 예약만 또는 일정만 취소되는 부분 성공 발생
- 비소유 사용자 취소, IDOR, 인증 위조 또는 민감정보 노출
- 물리 삭제, 기존 데이터 손실 또는 반복·동시 취소의 비멱등 결과
- API·DB 문서와 실제 계약 불일치
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 취소 예약 복구와 관리자 대행 취소
- 알림 생성·취소·발송과 외부 메시지 채널
- 인증·RBAC 정책 변경

#### 작업 결과

`none`

#### 남은 문제

- Notification 도메인이 구현되면 보존된 예약·일정 취소 상태를 기준으로 발송 예정 알림 취소와 취소 안내를 별도 Plan에서 연결해야 한다.

---

### Task 4. 회의실 예약 삭제 Frontend 흐름 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

예약 소유자에게 회의실 예약 삭제 행동을 제공하고 확인 후 예약·연결 일정의 취소 결과를 회의실 현황과 Calendar에 반영한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/cypress/e2e/meeting-room`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress.config.ts`
- `frontend/cypress/support`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] Red 단계에서 소유 예약의 삭제 행동, 비소유 예약의 행동 부재, 확인 취소·확정, 제출 중 중복 방지, 성공·401·404·409·네트워크 오류를 재현하는 Component Test와 Cypress를 먼저 작성한다.
- [ ] Gateway에 `DELETE /api/room-reservations/:reservationId`를 추가하고 같은 Origin Session, 빈 204 응답과 안정적인 오류 코드를 처리하며 사용자 ID를 요청에 포함하지 않는다.
- [ ] 서버가 반환한 기존 소유 예약 관리 계약을 기준으로만 삭제 행동을 노출하고 파괴적 행동임을 명확히 표시하며, 확인 Dialog에서 예약 제목·회의실·시간을 확인한 뒤 실행하게 한다.
- [ ] 취소 성공 후 현재 회의실 현황 Query와 Calendar 일정 목록·선택된 상세 Query만 무효화하고 취소된 예약과 일정이 기본 화면에서 사라졌음을 안내한다.
- [ ] 401은 재인증 안내, 404는 권한이 없거나 이미 사용할 수 없는 예약 안내, 409는 최신 상태 재조회 안내, 네트워크 오류는 재시도 가능한 상태로 구분한다.
- [ ] 실패 시 기존 예약·Calendar Cache를 유지하고 삭제 성공으로 표시하지 않으며 확인 Dialog에서 재시도 또는 안전한 종료를 제공한다.
- [ ] Dialog 초기 포커스, Escape·닫기, 삭제 후 원래 행동으로 포커스 복귀와 데스크톱·모바일 동작을 구현한다.
- [ ] Green 이후 삭제 Mutation·오류 메시지·Dialog 상태 책임의 중복만 정리하고 대상 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/meeting-room`으로 권한별 노출, 확인, 중복 방지, Query 무효화와 오류 상태를 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/**/*.cy.ts'`로 PC·모바일 예약 삭제, 삭제 철회, 키보드·포커스, 회의실·Calendar 갱신을 검증한다.
- [ ] 선행 Task 3의 204·401·404·409 계약과 Frontend Gateway·삭제 상태가 충돌하지 않고 예약 생성·수정 흐름에 회귀가 없는지 확인한다.
- [ ] `cd frontend && npm run typecheck && npm run lint`로 Gateway 계약과 정적 규칙을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- FR-023의 사용자 흐름, Frontend 보안 경계와 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor 결과와 실행 명령을 작업 결과에 기록해야 한다.
- 비소유 예약에 삭제 행동이 노출되지 않고 서버 인가를 UI가 대체하지 않아야 한다.
- 확인, 오류 복구, Query 갱신, 키보드·포커스와 PC·모바일 동작이 검증되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트, Type Check, Lint 또는 Cypress 실패
- 비소유 예약 삭제 행동 노출, 사용자 ID 전송 또는 확인 없는 삭제
- 성공 전 Cache 제거, 오류를 성공으로 처리하거나 관련 없는 Query 무효화
- 접근성·반응형·포커스 회귀
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 취소 예약 복구와 전체 예약 이력 화면
- 관리자 대행 취소와 권한 정책 변경
- 알림 취소·발송과 AI Assistant 연동

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. 예약 생성·Calendar 반영·삭제 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`
- `Task 3`
- `Task 4`

#### 작업 목적

회의실 예약 생성부터 Calendar 일정 확인, 예약 삭제와 양쪽 기본 조회 제외까지 하나의 사용자 흐름으로 연결하고 계약 경계의 통합 결함을 수정한다.

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
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] Red 단계에서 인증 사용자로 회의실 예약 생성, Calendar 목록·상세 확인, 회의실 예약 삭제, 회의실·Calendar 기본 조회 제외까지 연결하는 통합 회귀 시나리오를 작성한다.
- [ ] 미인증 사용자, 비소유 사용자, 중복 예약과 취소 도중 실패를 통합 경계에서 검증해 Service 호출·화면 Cache·DB 상태가 안전하게 유지되는지 확인한다.
- [ ] Frontend Gateway DTO·오류 코드와 Backend Controller·OpenAPI 응답의 필드·상태 코드가 일치하도록 범위 내 통합 결함만 수정한다.
- [ ] 예약 생성·삭제 후 영향받는 회의실과 Calendar Query만 갱신되고 실패 시 마지막 유효 데이터와 재시도 수단이 보존되게 한다.
- [ ] 로그·오류·브라우저 출력에 Session 식별자, 요청자 위조 값, 참석자 개인정보와 내부 예외가 노출되지 않는지 확인한다.
- [ ] Green 이후 통합 Fixture와 중복 Setup만 정리하고 통합 시나리오를 다시 통과시킨다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.room.**' --tests '*Schedule*Security*' --tests '*Schedule*Query*'`로 선행 Task의 생성·Calendar 조회·삭제·권한·트랜잭션 통합 회귀를 검증한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features/meeting-room`으로 선행 Task의 Gateway·Mutation·Query 갱신·오류 상태 통합 회귀를 검증한다.
- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/meeting-room/**/*.cy.ts'`로 데스크톱 1280×800과 모바일 390×844의 전체 사용자 흐름을 검증한다.
- [ ] `cd backend && ./gradlew spotlessCheck`와 `cd frontend && npm run typecheck && npm run lint`로 통합 수정의 정적 규칙을 검증한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 선행 Task 1~4의 계약과 사용자 동작이 충돌 없이 통합되고 FR-020, FR-021, FR-023 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor 결과와 실행 명령을 작업 결과에 기록해야 한다.
- 인증·권한·IDOR·부분 저장·동시성·Cache·오류 복구 회귀가 없어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트, Formatting, Type Check, Lint 또는 Cypress 실패
- Frontend·HTTP·Backend·DB 계약 충돌 또는 예약·일정 상태 불일치
- 인증·권한·IDOR·부분 저장·동시성·Cache 회귀
- 통합 결함 수정을 이유로 Migration·공개 계약·요구사항 의미를 변경함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 회의실 사진·장비·예약 팀과 참석자 검색 개선
- 알림·AI Assistant와 취소 예약 복구
- 운영 배포, 운영 데이터 변경과 성능 부하 시험

#### 작업 결과

`none`

#### 남은 문제

- Notification 도메인 구현 후 예약 취소 알림 연동이 필요하다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 회의실 예약 생성 후 연결 일정이 Calendar 목록·상세에 즉시 나타나고 예약 삭제 후 예약·일정이 기본 조회에서 함께 제외되어야 한다.
- 예약·일정 생성과 취소의 권한, Transaction, Rollback, 멱등성과 동시성이 검증되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 API·DB 문서, Migration과 실제 구현이 일치해야 한다.
- 전체 Frontend `npm run check`, Unit Test, Cypress와 Build가 통과해야 한다.
- 전체 Backend `spotlessCheck`, Test와 Build가 통과해야 한다.
- PostgreSQL Migration·Mapping·Constraint 검증이 통과해야 한다.
- Mandatory Gate G1~G7이 모두 통과해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec, Design Doc, Architecture 또는 Security 기준과 충돌함
- 예약·일정 부분 생성 또는 부분 취소, 데이터 손실, IDOR, 인증 우회와 개인정보 노출이 발생함
- 테스트 삭제·단언 약화·검증 우회로 완료를 주장함
- Soft Cancel을 물리 삭제로 구현하거나 취소 예약·일정이 기본 조회에 남음
- 남은 문제가 사용자 확인 없이 방치됨
