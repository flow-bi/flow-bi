# 작업 계획: schedule-update-cancel-concurrency-01

## 1. 기본 정보

### 사용자 요청

회의실 리팩터링 전체 검증에서 발견된 일반 일정 수정·취소 동시성 결함을 별도 Task로 분리한다.

### 작업 목적

PostgreSQL에서 일반 일정 수정과 취소가 동시에 실행될 때 취소 결과가 오래된 `ACTIVE` 상태로 덮어써지는 문제를 해결하고, 최종 상태와 일정 Aggregate가 일관되게 직렬화되도록 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Design Doc: `docs/design-docs/schedule-and-notification.md` 결정 4
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `backend/BACKEND.md`, `docs/quality/quality-model.md`

### 확인된 실패 증거

- 실패 테스트: `ScheduleCancelConcurrencyTest.serializesConcurrentUpdateAndCancelWithoutPartialAggregateChanges`
- 기대 결과: 일정 최종 상태 `CANCELED`, `cancelled_by`에 취소 주체 저장
- 실제 결과: 일정 최종 상태 `ACTIVE`
- PostgreSQL/Hibernate 경고: `HHH000444` follow-on locking
- 원인 가설: `PESSIMISTIC_WRITE`와 collection `EntityGraph` 조합으로 최초 Aggregate 조회와 루트 행 잠금이 분리되고, 잠금 전에 읽은 상태가 갱신되지 않아 stale write가 발생한다.

---

## 2. 실행 Task

### Task 1. 일정 수정·취소 루트 행 잠금 직렬화

#### 선행 Task

- `없음`

#### 작업 목적

일정 수정과 취소가 연관 데이터 조회 전에 동일한 일정 루트 행을 잠그게 하고, 잠금 획득 후 최신 상태를 기준으로 수정 또는 취소하도록 영속성 조회 순서를 정리한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule/repository`
- `backend/src/main/java/com/flowbi/domain/schedule/service`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/src/main/java/com/flowbi/domain/room`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 현재 실패하는 PostgreSQL 수정·취소 동시성 테스트를 단독 실행해 `CANCELED` 기대값과 `ACTIVE` 실제값을 실행 증거로 남긴다.
- [ ] 연관관계를 포함하지 않는 일정 루트 행 전용 `PESSIMISTIC_WRITE` 조회를 정의한다.
- [ ] 수정과 취소가 동일한 루트 행 잠금을 먼저 획득한 후 필요한 연관 데이터를 같은 트랜잭션에서 조회하도록 순서를 정리한다.
- [ ] 잠금 대기 후 최신 `ScheduleStatus`를 확인해 취소가 완료된 일정은 수정하지 않도록 한다.
- [ ] 일정 Aggregate의 참석자·공유 대상·상세 변경과 취소 메타데이터가 부분 저장되지 않도록 기존 트랜잭션 경계를 유지한다.
- [ ] Green 이후 중복 조회와 이름을 최소 범위에서 정리하되 공개 API, 오류 계약과 DB Schema는 변경하지 않는다.

#### 검증 항목

- [ ] 대상 동시성 테스트를 반복 실행해 수정이 먼저 완료되거나 취소가 먼저 완료되는 경우 모두 최종 상태가 `CANCELED`인지 확인한다.
- [ ] `ScheduleCancelConcurrencyTest` 전체를 실행해 실패한 수정의 전체 Rollback 회귀도 확인한다.
- [ ] Schedule Service·Repository 관련 테스트를 실행해 생성·조회·수정·취소·권한·참석자 동작의 회귀가 없는지 확인한다.
- [ ] 전체 Backend 테스트와 Build를 실행해 회의실 리팩터링을 포함한 전체 자동 검증이 통과하는지 확인한다.
- [ ] `spotlessCheck`와 `git diff --check`를 실행한다.
- [ ] SQL 또는 Hibernate 로그를 확인해 collection 조회 전 루트 행 잠금이 적용되고 해당 경로에서 follow-on locking에 의존하지 않는지 확인한다.

#### 완료 조건

- Red → Green → Refactor 결과와 실행 증거가 기록되어야 한다.
- 동시 수정·취소 후 최종 일정 상태가 항상 `CANCELED`여야 한다.
- 수정이 취소 메타데이터를 `ACTIVE` 상태로 덮어쓰지 않아야 한다.
- 일정 상세·참석자·공유 대상은 허용된 한 트랜잭션 결과로만 저장되어야 한다.
- 공개 API, DB Schema, Migration, 인증·인가와 감사 이벤트 계약이 변경되지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 모든 필수 검증이 통과하고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 동시성 테스트가 간헐적으로라도 `ACTIVE` 또는 부분 Aggregate를 남김
- 테스트 삭제, 단언 약화, 반복 횟수 축소 또는 검증 우회
- 단순 사전 조회만으로 동시성 보장을 대체함
- 공개 API, DB Schema, Migration 또는 권한 계약 변경
- 새 `@Version` 컬럼 등 승인되지 않은 Schema 변경 도입
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 전체 Backend 자동 검증 또는 `quality_score` 기준 미달

#### 제외 범위

- 회의실 예약 서비스 리팩터링의 추가 변경
- 일정 API·화면·사용자 동작 추가
- DB Schema 및 Flyway Migration 변경
- optimistic locking 버전 컬럼 도입
- 전체 Schedule 패키지 재구성

#### 작업 결과

`none`

#### 남은 문제

- 구현 전에는 PostgreSQL follow-on locking으로 인해 취소 결과가 수정 트랜잭션의 오래된 상태로 덮어써질 수 있다.

---

## 3. 전체 완료 조건

- Task 1의 구현과 검증이 모두 완료되어야 한다.
- 회의실 리팩터링 실행을 차단한 전체 Backend 자동 검증 실패가 해소되어야 한다.
- 일정 상태 전이, 트랜잭션 및 동시성 계약이 관련 설계 문서와 일치해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 필수 동시성 또는 전체 Backend 검증이 실패함
- 취소 상태나 Aggregate 정합성 회귀가 발생함
- API·DB·인증·권한 계약이 변경됨
- 승인되지 않은 Schema 또는 의존성 변경이 발생함
- 남은 문제가 사용자 확인 없이 방치됨
