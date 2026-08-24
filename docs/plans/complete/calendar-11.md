# 작업 계획: calendar-11

## 1. 기본 정보

### 사용자 요청

- 일정 수정 화면에서 참석자가 사용자 ID로 표시되어 선택·수정하기 불편한 문제를 해결하고, 사내 사용자 검색으로 참석자를 추가·제거할 수 있게 한다.
- 비공개인 개인 일정에는 참석자를 추가할 수 없게 한다.
- 일정 상세 모달에서 참가 인원과 참가자 목록을 확인할 수 있게 한다.

### 작업 목적

일정 생성·수정·상세 전반의 참석자 경험을 이름 기반으로 통일한다. 일반 `PERSONAL/PRIVATE` 일정은 등록자 전용 일정으로 제한하고, 서버가 이 규칙을 최종 검증한다. 팀·프로젝트 일정 수정에서는 기존 참석자를 이름으로 식별하고 검색·추가·제거할 수 있게 하며, 상세 모달은 참석 인원과 최소한의 참석자 식별 정보를 표시한다. 회의실 예약에서 관리하는 연결 일정의 참석자 연동은 기존 예약 정책을 유지한다.

### 작업 유형

- bugfix
- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`, `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`, `backend/API.md`

### 요구사항 및 인수 조건

- `CAL-11-R1`: 일반 `PERSONAL/PRIVATE` 일정의 생성·수정 화면에는 다른 사용자를 참석자 또는 명시적 사용자 공유 대상으로 추가하는 입력을 제공하지 않는다.
- `CAL-11-R2`: 일반 `PERSONAL/PRIVATE` 일정의 생성·수정 요청에 `participantIds` 또는 `userTargetIds`가 하나라도 포함되면 서버는 저장 전 `400 Bad Request`의 안정적인 Calendar 입력 오류로 거부하며 부분 변경을 남기지 않는다.
- `CAL-11-R3`: 일정 유형을 `TEAM` 또는 `PROJECT`에서 `PERSONAL`로 변경하면 화면은 선택된 참석자와 명시적 사용자 공유 대상을 제거하고 그 결과를 사용자가 인지할 수 있게 하며, 제출 요청에는 빈 배열을 전송한다.
- `CAL-11-R4`: 팀·프로젝트 일정 수정 화면은 기존 참석자를 사용자 이름으로 표시하고, 기존 참석자 검색 API를 사용해 이름 또는 사번으로 후보를 검색하여 중복 없이 추가하고 개별 제거할 수 있게 한다. 원시 사용자 ID 입력란은 표시하지 않는다.
- `CAL-11-R5`: 참석자 검색은 Loading·Empty·Error·Permission 상태를 구분하고, 선택 결과와 검색 결과는 `userId`, `displayName` 외 불필요한 개인정보를 표시하거나 저장하지 않는다.
- `CAL-11-R6`: 일정 상세 응답은 기존 `participantIds` 호환성을 유지하면서 화면 표시에 필요한 참석자 최소 객체 목록과 등록자 참석 여부를 반영한 `attendeeCount`를 함께 제공한다. 참석 인원은 등록자를 중복 계산하지 않는 서버 도메인 규칙과 일치해야 한다.
- `CAL-11-R7`: 일정 상세 모달은 다른 참석자가 없을 때의 빈 상태를 포함해 참석 인원과 참석자 이름을 표시하고, 등록자 참석 여부를 별도로 구분한다. 사용자 ID 원문은 표시하지 않는다.
- `CAL-11-R8`: 생성·수정·상세의 참석자 동작은 Desktop 1280×800과 Mobile 390×844에서 가로 overflow 없이 사용할 수 있고, 검색 결과·선택 목록·제거 버튼은 키보드와 Screen Reader로 식별하고 조작할 수 있어야 한다.
- `CAL-11-R9`: 회의실 예약에서 관리하는 연결 일정은 예약의 참석자 생성·수정·상세 계약을 유지하며, Calendar 상세 모달에서는 참석자를 확인할 수 있지만 Calendar 수정 화면에서는 계속 직접 수정할 수 없다.
- `CAL-11-R10`: 기존 일반 개인 일정에 저장된 참석자·사용자 공유 관계는 승인 없는 Migration으로 일괄 삭제하지 않는다. 해당 일정은 등록자만 조회할 수 있도록 기존 공개 정책의 데이터 호환 경계를 문서화하고, 사용자가 수정·저장할 때 새 계약에 맞는 빈 관계로 정리한다.

### 정책 변경과 적용 경계

- 현재 `docs/product-specs/calendar.md`, `docs/design-docs/schedule-and-notification.md`, `backend/API.md`는 개인 일정에도 참석자와 명시적 사용자 공유 대상을 허용한다. 사용자의 현재 요청을 이 제품 동작 변경에 대한 명시적 승인으로 보고 Task 1에서 문서 계약을 먼저 갱신한다.
- `docs/plans/active/calendar-01.md`의 모든 일정 유형에 참석자·명시적 사용자 공유를 허용하는 항목과 개인 일정을 참석자·공유 대상에게 공개하는 항목은 이 Plan의 `CAL-11-R1`~`CAL-11-R3`, `CAL-11-R10`으로 대체한다. `calendar-01`의 나머지 범위와 완료 증거는 변경하지 않으며, 이전 계약을 구현하는 Task와 이 Plan을 동시에 실행하지 않는다.
- 새 제한은 Calendar에서 사용자가 생성·수정하는 일반 `PERSONAL/PRIVATE` 일정에 적용한다. 회의실 예약에서 자동 생성·관리되는 연결 일정은 `schedule-and-notification.md`의 예약 참석자 동기화 정책을 유지한다.
- 이 Plan은 DB Schema를 변경하지 않고 기존 관계 테이블을 재사용한다. 기존 개인 일정 관계의 일괄 삭제·보정 Migration은 데이터 손실 가능성이 있으므로 수행하지 않는다.
- 상세 응답에는 기존 `participantIds`를 제거하지 않고 참석자 표시 객체를 추가하여 현재 Client와의 하위 호환성을 유지한다. 공개 API 필드 제거 또는 이름 변경이 필요해지면 구현을 중단하고 별도 사람 승인을 받는다.
- 참석자 이름 조회는 기존 사용자 원장과 Calendar Identity 경계를 사용한다. 이메일, 전화번호, 조직 상세, 사용자 상태 같은 추가 개인정보는 상세 응답에 포함하지 않는다.

---

## 2. 실행 Task

### Task 1. 개인 일정·참석자 표시 제품 및 API 계약 확정

#### 선행 Task

- `없음`

#### 작업 목적

일반 개인 일정의 등록자 전용 정책과 생성·수정·상세 화면의 참석자 계약을 Product Spec, Design Doc과 API 문서에 먼저 일치시켜 구현 판단의 기준을 확정한다.

#### 수정 가능 경로

- `docs/product-specs/calendar.md`
- `docs/design-docs/schedule-and-notification.md`
- `backend/API.md`

#### 수정 금지 경로

- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/adrs`
- `backend/src`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/plans`

#### 구현 항목

- [ ] `CAL-11-R1`~`CAL-11-R10`을 `docs/product-specs/calendar.md`의 상세 요구사항, 화면 구성, 데이터 흐름, 확정된 기능 결정과 Scope에 추적 가능하게 반영한다.
- [ ] 일반 `PERSONAL/PRIVATE` 일정은 등록자 전용이며 `participantIds`, `userTargetIds`, 팀·프로젝트 대상을 가질 수 없고, 등록자의 참석 여부는 다른 사용자 참석자 추가와 구분되는 필드임을 명시한다.
- [ ] 팀·프로젝트 일정의 참석자는 사내 사용자 검색으로 추가·제거하고 상세에서 이름과 인원을 확인한다는 UX 계약을 명시한다.
- [ ] `schedule-and-notification.md`의 공개 정책을 일반 개인 일정은 등록자에게만 공개하도록 갱신하되, 회의실 예약 연결 일정은 예약자·참석자 연동 정책을 유지하는 예외 경계를 명시한다.
- [ ] `backend/API.md`에 개인 일정의 금지 조합과 오류 계약, 상세 응답의 `attendeeCount` 및 최소 참석자 객체 목록, 참석 인원 계산 기준과 기존 `participantIds` 호환성 유지 정책을 예시와 함께 반영한다.
- [ ] 기존 일반 개인 일정 관계는 일괄 삭제하지 않고 등록자 외 조회에 사용하지 않으며, 수정 저장 시 빈 관계로 정리한다는 전환 정책을 기록한다.

#### 검증 항목

- [ ] 세 문서에서 일반 개인 일정, 회의실 예약 연결 일정, 팀·프로젝트 일정의 참석자 정책이 서로 모순되지 않는지 전체 관련 구간을 교차 검토한다.
- [ ] `rg -n "CAL-11-R|PERSONAL|participantIds|userTargetIds|참석자|참석 인원" docs/product-specs/calendar.md docs/design-docs/schedule-and-notification.md backend/API.md`로 요구사항 추적성과 용어 일관성을 확인한다.
- [ ] `git diff --check -- docs/product-specs/calendar.md docs/design-docs/schedule-and-notification.md backend/API.md`를 통과한다.

#### 완료 조건

- `CAL-11-R1`~`CAL-11-R10`의 제품·공개·API 계약이 구현 전에 확정되어야 한다.
- 일반 개인 일정과 회의실 예약 연결 일정의 정책 경계가 명확하고 기존 API 호환성 및 개인정보 최소화 원칙이 문서화되어야 한다.
- 모든 구현·검증 항목이 완료되고 수정 범위가 허용 경로를 벗어나지 않아야 한다.
- 문서 Task의 TDD는 `N/A`로 기록하고 교차 검토와 Patch 검증을 대체 증거로 남겨야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Product Spec, Design Doc과 API 문서가 서로 다른 개인 일정 공개·참석자 규칙을 설명함
- 회의실 예약 연결 일정의 참석자 계약을 일반 개인 일정과 함께 제거함
- 기존 `participantIds` 제거 등 승인되지 않은 호환성 파괴를 확정함
- 개인정보 최소화, 전환 정책 또는 요구사항 추적성이 누락됨
- 수정 가능 경로 밖 변경, 수정 금지 경로 변경 또는 `quality_score` 90 미만

#### 제외 범위

- 제품 코드, DB Schema 또는 Migration 변경
- 인증 방식, 사용자 원장 또는 회의실 예약 정책 변경
- 공유 사용자·팀·프로젝트 선택 UI의 전면 재설계

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 개인 일정 서버 불변식과 이름 기반 상세 응답 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

일반 개인 일정에 다른 사용자가 연결되지 않도록 서버에서 최종 차단하고, 권한이 확인된 상세 조회에서 참석자 이름을 개인정보 최소화 계약으로 제공한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/room/service/DatabaseRoomReservationScheduleLookup.java`
- `backend/src/main/java/com/flowbi/domain/room/repository/RoomReservationRepository.java`
- `backend/src/test/java/com/flowbi/domain/room/service/DatabaseRoomReservationScheduleLookupTest.java`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/main/java/com/flowbi/domain/room/service/DatabaseRoomReservationCreationService.java`
- `backend/src/main/java/com/flowbi/domain/room/service/DatabaseRoomReservationModificationService.java`
- `backend/src/main/java/com/flowbi/domain/user`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] Red: Calendar `POST`와 `PUT`에서 일반 `PERSONAL/PRIVATE` 요청의 `participantIds` 또는 `userTargetIds`가 비어 있지 않으면 명시적인 `400` 오류로 거부되고 생성 행·기존 참석자·공유 관계에 부분 변경이 없다는 Calendar Write Boundary·Service·Controller 실패 테스트를 먼저 작성한다.
- [ ] Red: 일반 개인 일정의 조회 권한은 등록자에게만 있고, 기존 데이터에 참석자·사용자 공유 관계가 남아 있어도 비등록자는 목록·상세에서 동일한 안전한 Not Found 결과를 받는 회귀 테스트를 작성한다.
- [ ] Red: 상세 응답이 `participantIds`와 같은 순서의 `participants: [{ userId, displayName }]` 및 도메인 계산값과 같은 `attendeeCount`를 반환하고, 등록자 참석 여부를 중복 계산하지 않는다는 Service·Controller·OpenAPI 계약 테스트를 작성한다.
- [ ] Red: 회의실 예약 연결 일정의 내부 참석자 생성·수정, 참석자 조회 권한과 상세 표시가 유지되며 Calendar의 직접 수정 차단이 회귀하지 않는 통합 테스트를 작성한다.
- [ ] Green: 일반 Calendar 생성·수정 경계에 개인 일정의 빈 `participantIds`·`userTargetIds` 불변식을 구현하고 생성·수정에 동일한 안정적 오류 계약을 적용한다.
- [ ] Green: 공개 정책에서 일반 개인 일정의 잔존 참석자·공유 관계를 권한 근거로 사용하지 않되, 회의실 예약 관리 일정은 기존 예약 참석자 공개 경계를 유지한다. 기간 조회에서는 예약 관리 일정 ID를 Port로 한 번에 조회하여 일정별 존재 확인 N+1을 만들지 않는다.
- [ ] Green: 권한 검증이 끝난 상세 조회에서 기존 `ScheduleIdentityService`의 일괄 사용자 이름 조회를 사용해 N+1 없이 최소 참석자 객체를 구성하고 Entity나 추가 개인정보를 노출하지 않는다.
- [ ] Green: 사용자 ID 중복, 등록자와 참석자 중복, 비활성 사용자, 이름 조회 결과 불일치의 기존 검증·오류 정책을 약화하지 않는다.
- [ ] Refactor: 생성·수정의 개인 일정 검증과 상세 DTO 변환 중복만 Calendar 도메인 경계 안에서 정리하며 공개 API의 기존 필드는 유지한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 단언·권한·트랜잭션 검증을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Schedule*Create*' --tests '*Schedule*Update*'`로 개인 일정 금지 조합, 정상 팀·프로젝트 일정과 Transaction Rollback을 검증한다.
- [ ] `cd backend && ./gradlew test --tests '*Schedule*Query*' --tests '*Schedule*Detail*' --tests '*Schedule*Security*'`로 등록자 전용 개인 일정, IDOR 방지, 참석자 최소 응답과 개인정보 비노출을 검증한다.
- [ ] `cd backend && ./gradlew test --tests '*RoomReservationSchedule*' --tests '*Schedule*UserIntegration*' --tests '*Schedule*Controller*'`로 회의실 예약 연동, 사용자 이름 일괄 조회와 HTTP 계약을 검증한다.
- [ ] 기존 일정 1,000건 기간 조회 성능 테스트 또는 동등한 Query 계수 검증으로 회의실 예약 관리 여부 판정이 일정별 Query를 추가하지 않고 NFR-003의 기존 p95 기준을 유지하는지 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`, `cd backend && ./gradlew test`, `cd backend && ./gradlew build`를 순서대로 통과한다.
- [ ] `git diff --check -- backend/src/main/java/com/flowbi/domain/schedule backend/src/test/java/com/flowbi/domain/schedule backend/src/main/java/com/flowbi/domain/room/service/DatabaseRoomReservationScheduleLookup.java backend/src/main/java/com/flowbi/domain/room/repository/RoomReservationRepository.java backend/src/test/java/com/flowbi/domain/room/service/DatabaseRoomReservationScheduleLookupTest.java backend/API.md`를 통과한다.

#### 완료 조건

- `CAL-11-R2`, `CAL-11-R6`, `CAL-11-R9`, `CAL-11-R10`과 Mandatory Gate G1~G7을 충족해야 한다.
- Red → Green → Refactor의 실패·성공 결과와 실행 명령을 작업 결과에 기록해야 한다.
- 일반 개인 일정의 서버 불변식, 등록자 전용 조회와 수정 Transaction 원자성이 검증되어야 한다.
- 상세 응답은 기존 ID 필드를 보존하면서 최소 이름 객체를 제공하고 회의실 예약 일정에 회귀가 없어야 한다.
- 수정 범위가 허용 경로를 벗어나지 않고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 조작된 요청으로 일반 개인 일정에 참석자 또는 사용자 공유 대상이 저장됨
- 기존 개인 일정의 잔존 관계로 비등록자가 일정 목록·상세를 조회할 수 있음
- 오류 후 일부 관계가 변경되거나 비인가·IDOR 결과가 일정 존재 여부를 노출함
- 상세 응답에서 이름이 ID와 잘못 매핑되거나 불필요한 개인정보를 반환함
- 회의실 예약 연결 일정의 참석자 생성·수정·조회 또는 관리 경계가 회귀함
- 테스트·Spotless·Build 실패, 수정 범위 위반 또는 `quality_score` 90 미만

#### 제외 범위

- DB Schema·Migration·기존 데이터 일괄 정리
- 참석자 검색 Endpoint의 검색 범위·정렬·최대 건수 변경
- 사용자 원장, 인증 Principal 또는 회의실 예약 API 변경
- `participantIds` 제거 또는 다른 공개 API의 호환성 파괴

#### 작업 결과

`none`

#### 남은 문제

- 기존 일반 개인 일정의 잔존 관계는 물리 삭제하지 않는다. 데이터 정리가 필요하면 대상·복구·감사 정책에 대한 별도 사람 승인과 Migration Plan이 필요하다.

---

### Task 3. 검색형 참석자 수정과 상세 참가자 표시 Frontend 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

생성·수정 화면의 참석자 입력을 일정 유형에 맞는 이름 기반 검색·선택 흐름으로 통일하고, 상세 모달에서 참석 인원과 참가자를 바로 확인할 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-create`
- `frontend/src/features/schedule-calendar`
- `frontend/src/shared/ui`

#### 수정 금지 경로

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`
- `frontend/cypress.config.ts`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] Red: 일반 개인 일정 생성·수정에서 참석자 검색·선택 목록·공유 사용자 입력이 표시되지 않고 요청의 `participantIds`, `userTargetIds`가 빈 배열인지 Component Test로 먼저 재현한다.
- [ ] Red: 팀·프로젝트 일정 수정에서 상세 응답의 기존 참석자 이름이 선택 목록에 표시되고, 이름·사번 검색의 Loading·Empty·Error·Permission 상태, 중복 방지, 추가·개별 제거와 저장 Request를 검증하는 실패 테스트를 작성한다.
- [ ] Red: 팀·프로젝트에서 개인으로 유형을 변경하면 기존 참석자·사용자 공유 대상이 제거되고 안내가 표시되며, 다시 유형을 바꿔도 제거된 개인정보를 자동 복원하지 않는 테스트를 작성한다.
- [ ] Red: 상세 모달이 다른 참석자 수, 이름 목록, 등록자 참석 여부와 참석자 없음 상태를 표시하고 원시 사용자 ID를 노출하지 않는 테스트를 작성한다.
- [ ] Green: 생성과 수정이 같은 검색 API 및 선택 모델을 사용하도록 이름 기반 참석자 선택 UI를 공통화하거나 기능 경계 안에서 동일 계약으로 구현한다.
- [ ] Green: 선택된 참석자는 이름이 있는 Chip 또는 목록으로 표시하고 각 항목에 접근 가능한 제거 버튼을 제공하며, 검색 결과 선택 후 중복 추가를 막고 `participantIds`는 선택 모델에서만 파생한다.
- [ ] Green: 일반 개인 일정에서는 참석자 UI와 공유 사용자 입력을 제공하지 않고 등록자 참석 여부만 별도로 유지한다. 유형 전환 시 제거되는 값과 이유를 사용자가 이해할 수 있는 안내로 제공한다.
- [ ] Green: 상세 응답의 `participants`로 참가자 이름을 표시하고 서버의 `attendeeCount`를 총원으로 사용하되, `creatorAttends`는 등록자 참석 여부로 별도 표시하며 다른 참석자가 없을 때 명확한 빈 상태를 제공한다.
- [ ] Green: 검색 Query Cache는 모달 종료 시 정리하고 API 오류를 빈 결과나 성공으로 위장하지 않으며, 화면·Log·접근 가능한 이름에 원시 사용자 ID를 표시하지 않는다.
- [ ] Green: Desktop 1280×800과 Mobile 390×844에서 검색 결과와 선택 목록이 모달 경계를 벗어나지 않도록 기존 Design Token과 반응형 구조를 사용한다.
- [ ] Refactor: 참석자 검색·선택·인원 계산의 중복만 재사용 가능한 기능 컴포넌트 또는 순수 함수로 정리하고 일정 Form·Mutation 책임은 기존 기능에 유지한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 Mock 계약이나 접근성 단언을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-create src/features/schedule-calendar`로 생성·수정·상세, 유형 전환, 검색 상태, 인원 계산과 API Request를 검증한다.
- [ ] React Testing Library에서 키보드만으로 검색 결과 선택, 선택 참석자 제거, 수정 저장, 모달 닫기와 포커스 복귀가 가능하고 Screen Reader 이름이 구분되는지 확인한다.
- [ ] `cd frontend && npm run typecheck`, `cd frontend && npm run lint`, `cd frontend && npm run format:check`, `cd frontend && npm run build`를 통과한다.
- [ ] `git diff --check -- frontend/src/features/schedule-create frontend/src/features/schedule-calendar frontend/src/shared/ui`를 통과한다.

#### 완료 조건

- `CAL-11-R1`, `CAL-11-R3`~`CAL-11-R8`과 Mandatory Gate G1~G7을 충족해야 한다.
- Red → Green → Refactor의 실패·성공 결과와 실행 명령을 작업 결과에 기록해야 한다.
- 일반 개인 일정에서는 다른 사용자 연결이 불가능하고, 팀·프로젝트 일정 수정에서는 ID 직접 입력 없이 참석자를 검색·추가·제거할 수 있어야 한다.
- 상세 모달에서 참가 인원과 이름을 확인할 수 있고 Loading·Empty·Error·Permission, 접근성과 반응형 상태가 검증되어야 한다.
- 수정 범위가 허용 경로를 벗어나지 않고 `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 개인 일정에서 참석자 또는 공유 사용자를 선택하거나 비어 있지 않은 ID 배열을 전송할 수 있음
- 기존 참석자가 이름이 아닌 ID로 표시되거나 검색·추가·제거 후 잘못된 Request를 전송함
- 상세 모달의 참석 인원 중복·누락, 이름 누락 또는 원시 ID 노출
- Loading·Empty·Error·Permission 상태를 구분하지 않거나 API 오류를 성공으로 처리함
- 키보드·포커스·모바일 사용성 회귀, 정적 검증 실패, 범위 위반 또는 `quality_score` 85 미만

#### 제외 범위

- 팀·프로젝트 대상 ID 입력의 별도 검색형 UI 전환
- 참석자 검색 API, 인증 Session 또는 전역 Query 정책 변경
- 캘린더 전체 레이아웃·색상 체계·Modal 디자인 재작업
- 신규 UI·검색·Debounce 의존성 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 참석자 정책 통합 회귀 및 브라우저 검증

#### 선행 Task

- `Task 3`

#### 작업 목적

문서, Backend와 Frontend 변경을 실제 사용자 흐름으로 통합 검증하여 개인 일정 개인정보 경계와 팀·프로젝트 일정 참석자 편집·상세 표시의 회귀를 차단한다.

#### 수정 가능 경로

- `frontend/cypress/e2e/calendar`
- `frontend/src/features/schedule-create`
- `frontend/src/features/schedule-calendar`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/src/main/java/com/flowbi/domain/room/service/DatabaseRoomReservationScheduleLookup.java`
- `backend/src/main/java/com/flowbi/domain/room/repository/RoomReservationRepository.java`
- `backend/src/test/java/com/flowbi/domain/room/service/DatabaseRoomReservationScheduleLookupTest.java`
- `backend/API.md`
- `docs/product-specs/calendar.md`
- `docs/design-docs/schedule-and-notification.md`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `frontend/package.json`
- `frontend/package-lock.json`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/adrs`
- `docs/plans`

#### 구현 항목

- [ ] Red: 개인 일정 생성·수정의 참석자 부재, 조작된 개인 일정 요청의 서버 거부, 팀·프로젝트 일정의 검색형 참석자 수정과 상세 참가자 표시를 잇는 Cypress 실패 시나리오를 먼저 작성한다.
- [ ] Green: Desktop 1280×800과 Mobile 390×844에서 이름·사번 검색, 후보 선택, 중복 방지, 기존 참석자 제거, 저장 후 상세 이름·인원 갱신을 실제 API 계약으로 확인한다.
- [ ] Green: 상세 조회 또는 참석자 검색의 `401`, `403`, `404`, `500` 상태가 기존 Session·Permission·Error 흐름을 유지하고 개인정보나 일정 존재 여부를 노출하지 않는지 확인한다.
- [ ] Green: 회의실 예약 관리 일정의 상세 참가자 표시와 직접 수정 불가 상태를 브라우저 또는 적용 가능한 통합 테스트로 확인한다.
- [ ] 통합 검증에서 발견된 이 Plan 범위의 결함만 최소 수정하고 관련 회귀 테스트를 유지한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 전체 관련 검증을 반복하고, 이후에도 실패하면 검증을 우회하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd frontend && npx cypress run --spec 'cypress/e2e/calendar/**/*.cy.ts'`로 캘린더 핵심 흐름과 신규 참석자 시나리오를 통과한다.
- [ ] `cd frontend && npm run check`를 통과한다.
- [ ] `cd backend && ./gradlew spotlessCheck`, `cd backend && ./gradlew test`, `cd backend && ./gradlew build`를 통과한다.
- [ ] 저장소 루트에서 변경 파일이 각 Task의 수정 가능 경로 안에 있고 Migration, DB Schema, 의존성, 인증 코드 및 허용된 예약 조회 Adapter 밖의 회의실 관리 코드에 변경이 없는지 `git diff --name-only`로 확인한다.
- [ ] 저장소 루트에서 `git diff --check`를 통과하고 Product Spec, Design Doc, API 예시와 실제 Type·DTO·화면 문구가 일치하는지 교차 검토한다.

#### 완료 조건

- `CAL-11-R1`~`CAL-11-R10`과 Mandatory Gate G1~G7을 모두 충족해야 한다.
- 전체 TDD 및 통합 검증 결과, 화면 크기, 실행 명령과 실패·재시도 이력을 작업 결과에 기록해야 한다.
- 개인 일정의 등록자 전용 경계가 UI와 서버에서 모두 강제되고, 팀·프로젝트 일정의 검색형 참석자 수정과 상세 참가자 확인이 실제 계약으로 동작해야 한다.
- 회의실 예약 연결 일정, 기존 캘린더 생성·조회·수정·취소, Session·권한 흐름에 회귀가 없어야 한다.
- 수정 범위가 허용 경로를 벗어나지 않고 전체 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 개인 일정 개인정보 경계를 UI 우회 또는 직접 API 요청으로 깨뜨릴 수 있음
- 참석자 수정 저장 후 상세 이름·인원 또는 Cache 갱신이 일치하지 않음
- 비인가·오류 응답이 개인정보나 일정 존재 여부를 노출함
- 회의실 예약 연결 일정 또는 기존 캘린더 핵심 흐름이 회귀함
- 필수 E2E·Frontend·Backend 검증 실패 또는 3회 수정 후 동일 실패가 남음
- 문서·API·코드 불일치, 수정 범위 위반 또는 `quality_score` 90 미만

#### 제외 범위

- 운영 환경 배포·운영 데이터 수정
- 기존 개인 일정 관계의 Migration 또는 수동 데이터 삭제
- 실제 직원 개인정보를 사용하는 Test Fixture 추가
- 새로운 외부 서비스·유료 API·Frontend 의존성 도입
- Git commit, push, Issue 또는 PR 생성

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- Task 1~4의 모든 구현·검증 항목이 완료되어야 한다.
- `CAL-11-R1`~`CAL-11-R10`과 Mandatory Gate G1~G7을 모두 충족해야 한다.
- Product Spec, Design Doc, API 계약, Backend 불변식과 Frontend 사용자 동작이 동일한 개인 일정·참석자 정책을 설명해야 한다.
- 일반 개인 일정은 등록자 전용으로 보호되고, 팀·프로젝트 일정은 이름 기반 참석자 수정과 상세 참가자 확인을 제공해야 한다.
- 기존 API 호환성, 회의실 예약 참석자 연동, 캘린더 핵심 흐름, 인증·인가·IDOR·개인정보 최소화에 회귀가 없어야 한다.
- Red → Green → Refactor와 최종 Frontend·Backend·E2E 검증 결과가 실행 기록에 남아야 한다.
- 각 Task의 변경이 해당 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- 실행하지 못한 검증과 남은 위험은 이유와 영향 및 사람의 결정 필요 여부를 기록하고, 필수 검증 미실행 상태를 완료로 처리하지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 `CAL-11-R1`~`CAL-11-R10`이 실패함
- 개인 일정에 다른 사용자 참석자·공유 대상을 저장하거나 잔존 관계를 통해 비등록자가 조회할 수 있음
- 참석자 이름·인원·선택 상태가 ID와 잘못 연결되거나 불필요한 개인정보가 노출됨
- 회의실 예약 연결 일정 또는 기존 캘린더 생성·조회·수정·취소 계약이 회귀함
- 테스트 삭제·단언 약화·검증 우회 또는 TDD 증거 누락이 발생함
- 필수 Test·Type Check·Lint·Formatting·Build·E2E가 실패하거나 미실행 상태로 완료 처리됨
- Product Spec, Design Doc, API와 구현이 충돌함
- Task별 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 기존 개인 일정 관계의 승인되지 않은 데이터 삭제, DB Migration, 인증·권한 정책 또는 공개 API 호환성 파괴가 발생함
- 남은 문제나 사람 결정 필요사항이 누락되거나 전체 `quality_score`가 `90` 미만임
