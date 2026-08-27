# 작업 계획: meeting-room-refactor-01

## 1. 기본 정보

### 사용자 요청

회의실 관련 코드의 책임과 구조를 정리하되, 현재 실행에서 실제로 작업한 Backend 범위만 이 Plan에 유지한다.

### 작업 목적

회의실 예약의 기존 사용자 동작, 공개 API, DB 구조와 일정 연동 계약을 변경하지 않으면서 Backend 예약 서비스에 집중된 검증·참석자 해석·연결 일정 소유권 확인 책임을 테스트 가능한 단위로 분리한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `backend/BACKEND.md`

### 범위 조정 기록

- 최초 계획의 Frontend 회의실 화면 책임 분리 Task는 이번 실행에서 시작하지 않았으므로 이 Plan에서 제거한다.
- 전체 Backend 검증에서 발견된 일반 일정 수정·취소 동시성 결함은 회의실 리팩터링 변경 범위와 분리하여 `docs/plans/active/schedule-update-cancel-concurrency-01.md`에서 추적한다.
- 이번 리팩터링에 한해 과거 Red를 인위적으로 재현하지 않고 기존 Green 기준선과 현재 회귀 검증을 증거로 사용하도록 사용자가 명시적으로 승인했다.

---

## 2. 실행 Task

### Task 1. Backend 회의실 예약 서비스 책임 분리

#### 선행 Task

- `없음`

#### 작업 목적

회의실 예약 생성·수정·취소의 트랜잭션 조정 책임은 유지하면서 요청 검증, 참석자 정규화·접근 확인과 연결 일정 소유권 확인 책임을 명시적인 협력 객체로 분리한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/room/service`
- `backend/src/test/java/com/flowbi/domain/room/service`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/room/controller`
- `backend/src/main/java/com/flowbi/domain/room/dto`
- `backend/src/main/java/com/flowbi/domain/room/entity`
- `backend/src/main/java/com/flowbi/domain/room/repository`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/resources`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs`

#### 구현 항목

- [x] 사용자 승인에 따라 인위적인 Red 재현을 생략하고 기존 Green 기준선을 확인한다.
- [x] 예약자, 시간 범위, 제목·설명 길이와 생성·수정 식별자 검증을 `RoomReservationRequestValidator`로 분리하고 기존 오류 코드를 유지한다.
- [x] 참석자 ID 중복 제거, 등록자 참석 여부, 최소 참석 인원과 접근 검증을 `ReservationAttendeeResolver`로 분리한다.
- [x] 연결 일정 조회와 예약 소유자 확인을 `ReservationScheduleOwnershipVerifier`로 분리하고 존재 여부 은닉과 취소 충돌 오류 계약을 유지한다.
- [x] `RoomReservationService`는 생성·수정·취소의 트랜잭션 순서와 예약·일정 원자적 변경을 조정하도록 정리한다.
- [x] 테스트 Fixture가 분리된 필수 의존성을 명시적으로 제공하도록 수정한다.
- [x] 공개 Service 메서드, 트랜잭션 경계, Controller·DTO·Entity·Repository 계약을 변경하지 않는다.

#### 검증 항목

- [x] 분리한 요청 검증·참석자·연결 일정 소유권 협력 객체의 단위 테스트가 통과했다.
- [x] `RoomReservationServiceTest`, `RoomReservationUpdateServiceTest`, `RoomReservationCancelServiceTest`가 통과했다.
- [x] `RoomReservationTransactionTest`, `RoomReservationUpdateTransactionTest`, `RoomReservationCancelTransactionTest`가 통과했다.
- [x] 변경 파일 Formatting, `spotlessCheck`, `git diff --check`와 변경 경로 검증이 통과했다.
- [ ] 전체 Backend 자동 검증은 `ScheduleCancelConcurrencyTest` 실패로 통과하지 못했다. 원인과 수정 범위는 별도 일정 동시성 Plan으로 분리했다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 회의실 범위 검증과 전체 Backend 자동 검증이 통과해야 한다.
- FR-020~FR-023의 생성·일정 연결·수정·취소 동작과 오류 코드가 변경되지 않아야 한다.
- 예약과 연결 일정의 트랜잭션 경계, 잠금 순서, 소유권 은닉과 감사 로그 내용이 유지되어야 한다.
- 승인된 Red 생략 사유, 기존 Green 기준선과 현재 회귀 검증 결과가 기록되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 회의실 범위 테스트, Formatting 또는 정적 검증 실패
- 기존 오류 코드, 공개 Service 메서드 또는 트랜잭션 순서 변경
- 인증 사용자 대신 요청 사용자 식별자를 신뢰하거나 예약 존재 여부가 노출됨
- 예약과 연결 일정의 부분 생성·수정·취소 가능성 발생
- 테스트 삭제, 단언 약화 또는 검증 결과 조작
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 전체 자동 검증 실패가 해결되거나 승인된 별도 결과로 종결되지 않음
- `quality_score`가 기준 미달

#### 제외 범위

- Frontend 회의실 화면 책임 분리
- 공개 API, DTO, Entity, Repository Query와 DB Schema 변경
- 회의실 예약의 새로운 기능 또는 오류 코드 추가
- Schedule 도메인 내부 구조와 동시성 수정
- 전체 Backend 패키지 재구성

#### 작업 결과

- `RoomReservationRequestValidator`, `ReservationAttendeeResolver`, `ReservationScheduleOwnershipVerifier`를 추가했다.
- `RoomReservationService`의 기존 동작과 트랜잭션 조정 책임을 유지하면서 위 세 책임을 협력 객체로 이동했다.
- 관련 Service 단위 테스트와 PostgreSQL 트랜잭션 테스트, Formatting 및 변경 범위 검증은 통과했다.
- 이번 리팩터링의 Red 단계는 사용자 승인에 따라 인위적으로 만들지 않았다.
- 전체 Backend 검증에서 회의실 변경 범위 밖의 일정 수정·취소 동시성 결함이 발견되어 Mandatory Gate는 아직 통과하지 않았다.

#### 남은 문제

- `ScheduleCancelConcurrencyTest`에서 최종 일정 상태가 기대값 `CANCELED`가 아니라 `ACTIVE`로 남는다.
- Hibernate의 PostgreSQL follow-on locking으로 최초 조회 상태와 실제 잠금 시점이 분리되는 것이 확인됐다.
- 해결 작업은 `schedule-update-cancel-concurrency-01`의 독립 Task로 이관했다.

---

## 3. 전체 완료 조건

- Backend 회의실 예약 서비스 책임 분리 구현과 범위 검증이 완료되어야 한다.
- 별도 일정 동시성 Task 처리 후 전체 Backend 자동 검증이 통과해야 한다.
- 공개 API, DB Schema, Migration, 사용자 동작과 의존성이 변경되지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 필수 구현 또는 범위 검증이 실패함
- 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 회의실 API·DB·인증·권한·일정 연동 계약이 변경됨
- 전체 Backend 자동 검증 실패를 숨기거나 통과한 것으로 기록함
- 남은 문제가 별도 추적 없이 방치됨
