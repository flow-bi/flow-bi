# 작업 계획: meeting-room-07

## 1. 기본 정보

### 사용자 요청

캘린더에 표시된 회의실 예약 일정을 취소 확인 모달을 통해 취소할 수 있어야 하며, 취소 결과가 회의실 예약 현황에도 반영되어야 한다.

### 작업 목적

회의실 예약 소유자가 캘린더 일정 상세에서 안전하게 예약 취소를 실행하고, 기존 회의실 예약 취소 트랜잭션을 통해 예약과 연결 일정이 함께 취소되어 캘린더와 회의실 화면에서 모두 제외되도록 한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`, `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`, `backend/API.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 캘린더용 회의실 예약 취소 참조 계약 구현

#### 선행 Task

- 없음

#### 작업 목적

캘린더 일정 상세가 회의실 예약 소유자에게만 기존 예약 취소 API를 호출할 수 있는 최소 참조와 취소 가능 여부를 제공하고, 해당 API가 예약과 연결 일정을 함께 취소하는 계약을 회귀 테스트로 보장한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/room`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 회의실 예약 소유자가 연결 일정 상세을 조회하면 취소 가능한 예약 식별자와 취소 가능 여부를 받고, 비소유자에게는 예약 식별자가 노출되지 않으며 취소 불가로 응답하고, 일반 일정 응답은 기존 의미를 유지하는 실패 테스트를 작성한다.
- [ ] Red: 캘린더 상세에서 얻은 예약 참조로 기존 `DELETE /api/room-reservations/:reservationId`를 호출하면 예약과 연결 일정이 하나의 트랜잭션에서 취소되고 회의실 예약 현황과 Calendar 기본 조회에서 모두 제외되는 실패 테스트를 작성한다.
- [ ] Green: Schedule 도메인의 조회 Port와 Room 도메인 Adapter를 확장해 활성 예약의 소유권을 서버에서 판정하고, 일정 상세 응답에 소유자 전용 예약 식별자와 취소 가능 여부를 최소 정보로 제공한다.
- [ ] Green: 기존 회의실 예약 취소 API의 인증·IDOR 방지·멱등성·트랜잭션 계약을 재사용하며 캘린더 전용 우회 취소 경로나 클라이언트 제공 사용자 ID를 추가하지 않는다.
- [ ] `backend/API.md`에 일정 상세의 회의실 예약 취소 참조 필드, 비소유자 비노출 규칙, 기존 예약 취소 Endpoint 사용 방법과 오류 계약을 실제 구현과 일치하도록 기록한다.
- [ ] Refactor: 일정과 회의실 도메인의 의존 방향을 Port/Adapter 경계로 유지하고 조회 및 권한 판정 책임을 명확히 정리한 뒤 관련 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] TDD 실행 기록에 의도한 권한·연동 테스트의 Red 실패, 최소 구현 후 Green 통과, Refactor 후 재통과 결과를 남긴다.
- [ ] `cd backend && ./gradlew test --tests '*ScheduleDetailServiceTest' --tests '*ScheduleControllerTest' --tests '*RoomReservationHttpFlowIntegrationTest' --tests '*RoomReservationCancellationSecurityIntegrationTest'`가 통과한다.
- [ ] `cd backend && ./gradlew spotlessCheck`가 통과한다.
- [ ] 예약 소유자, 비소유자, 미인증 사용자, 이미 취소된 예약, 동시 취소 충돌에서 기존 상태 코드와 안전한 오류 응답이 유지되고 예약 상세·참석자·개인정보가 추가 노출되지 않음을 확인한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정·재검증하고, 이후에도 실패하면 우회하지 않고 Task 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- FR-021과 FR-023 및 회의실 예약 관리 흐름, 객체 수준 인가, 예약·일정 동시 취소 계약에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 예약 비소유자에게 예약 식별자 또는 취소 권한이 노출됨
- 예약만 취소되거나 연결 일정만 취소되어 데이터 정합성이 깨짐
- 캘린더 전용 권한 우회 Endpoint 또는 클라이언트 사용자 ID 신뢰가 추가됨
- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만임

#### 제외 범위

- DB 스키마 및 Migration 변경
- 회의실 예약 수정 기능 또는 일반 일정 취소 정책 변경
- 관리자 대리 취소 권한 도입
- 알림 생성·발송 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 캘린더 예약 취소 모달 및 화면 간 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

회의실 예약 소유자가 캘린더 일정 상세에서 취소 확인 모달을 거쳐 예약을 취소하고, 성공 결과가 캘린더와 회의실 예약 현황 양쪽에 반영되는 접근 가능한 사용자 흐름을 완성한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/meeting-room`
- `frontend/src/shared/ui`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 소유한 회의실 예약 일정에는 예약 취소 동작이 표시되고 비소유자에게는 표시되지 않으며, 일반 일정의 수정·취소 동작은 유지되는 컴포넌트 실패 테스트를 작성한다.
- [ ] Red: 예약 취소 버튼이 일정명과 예약·연결 일정 동시 취소 결과를 설명하는 확인 모달을 열고, 닫기·Escape·계속 보기 동작과 포커스 복귀가 접근성 계약을 지키는 실패 테스트를 작성한다.
- [ ] Red: 확인 시 소유자 전용 예약 식별자로 `DELETE /api/room-reservations/:reservationId`를 한 번만 호출하고, 처리 중 중복 제출을 막으며, 성공 시 일정 목록·상세와 회의실 Query를 갱신하고, 실패 시 기존 일정을 유지하면서 인증·권한·충돌·네트워크 오류를 구분하는 실패 테스트를 작성한다.
- [ ] Green: 일정 상세 API 타입과 취소 요청 함수를 Task 1의 계약에 맞추고, 회의실 예약 일정에는 기존 `ConfirmationDialog`를 재사용한 예약 취소 흐름을 연결한다.
- [ ] Green: 성공 후 선택 일정을 캘린더에서 제거하고 일정 상세 및 회의실 예약 Query를 무효화하며, 캘린더와 회의실 예약이 함께 취소되었다는 사용자 피드백을 제공한다.
- [ ] `frontend/cypress/e2e/calendar/**`에 캘린더 일정 상세에서 취소 모달을 열고 예약 취소 Endpoint를 호출한 뒤 일정이 사라지며 회의실 화면에서도 해당 예약이 제외되는 상태 기반 Cypress 시나리오를 작성한다.
- [ ] Refactor: 일반 일정 취소와 회의실 예약 취소의 공통 모달·상태 처리를 중복 없이 정리하되 두 API 계약과 사용자 문구의 의미를 명확히 분리하고 관련 테스트를 다시 통과시킨다.

#### 검증 항목

- [ ] TDD 실행 기록에 캘린더 예약 취소 시나리오의 Red 실패, 최소 구현 후 Green 통과, Refactor 후 재통과 결과를 남긴다.
- [ ] `cd frontend && npm run test:unit -- src/features/schedule-calendar/ScheduleCalendar.test.tsx src/features/schedule-calendar/scheduleCalendarApi.test.ts`가 통과한다.
- [ ] `cd frontend && npm run typecheck`와 `cd frontend && npm run lint` 및 `cd frontend && npm run format:check`가 통과한다.
- [ ] `cd frontend && npm run test:e2e -- --spec 'cypress/e2e/calendar/**'`로 데스크톱과 390px 모바일에서 취소 확인, 중복 요청 방지, 성공·오류 피드백, 키보드 조작, 포커스 복귀, 캘린더·회의실 화면 반영을 확인한다.
- [ ] Task 1의 API 필드·상태 코드와 프런트엔드 분기 사이에 계약 충돌이나 일반 일정 취소 회귀가 없음을 캘린더 단위 테스트와 Cypress 시나리오로 확인한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정·재검증하고, 이후에도 실패하면 우회하지 않고 Task 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 회의실 예약 소유자는 캘린더에서 모달 확인 후 예약을 취소할 수 있고, 성공 결과가 캘린더와 회의실 화면 모두에 반영되어야 한다.
- 비소유자·미인증·오류 상태에서 취소 권한이나 성공 상태가 잘못 표시되지 않고 일반 일정 취소 흐름에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 확인 모달 없이 회의실 예약 취소 요청이 실행됨
- 일반 일정 취소 API로 회의실 예약 연결 일정을 직접 취소함
- 취소 성공 후 캘린더 또는 회의실 화면 한쪽에 예약이 남음
- 비소유자에게 예약 취소 동작이 노출되거나 실패를 성공으로 표시함
- 필수 구현 항목이 누락됨
- 테스트, 정적 검증 또는 Cypress 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 `90` 미만임

#### 제외 범위

- 회의실 화면의 기존 취소 UI 재설계
- 회의실 예약 수정 및 일반 일정 수정 기능 변경
- 관리자 대리 취소 또는 취소 복구 기능
- 이메일·문자·푸시·서비스 내부 알림 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어 캘린더에서 실행한 회의실 예약 취소가 캘린더 일정과 회의실 예약 현황 모두에 반영되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- FR-021, FR-023, Calendar 변경 정책, 회의실 예약 취소 트랜잭션 및 `backend/API.md`가 실제 구현과 일치해야 한다.
- 미인증·비소유자·IDOR·중복 요청·동시 취소 상황이 안전하게 처리되고 개인정보가 추가 노출되지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 회의실 예약과 연결 일정의 상태가 불일치하거나 취소된 데이터가 기본 캘린더·회의실 현황에 노출됨
- 취소 권한 우회, 예약 식별자 노출, 민감정보 노출 또는 확인 없는 파괴적 동작이 발생함
- 남은 문제가 사용자 확인 없이 방치됨
