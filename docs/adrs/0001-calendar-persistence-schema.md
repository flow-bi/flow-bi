# ADR-0001: Calendar 영속 Schema

- 상태: `ACCEPTED`
- 작성일: 2026-08-06
- 결정 주체: 사람 승인 필요
- 관련 Plan: `docs/plans/active/calendar-01.md`
- 관련 문서: `SECURITY.md`, `backend/DB_SCHEMA.md`, `docs/product-specs/calendar.md`, `docs/design-docs/schedule-and-notification.md`

## Context

Calendar Task 1은 일정 상태, 종일 여부, 색상 Label, 다중 참석자·팀·프로젝트, 취소 주체·시각과 조회 Index를 영속화해야 한다. 현재 `backend/DB_SCHEMA.md`는 Initial Baseline이며 실제 Migration 전에 Schema Review와 사람 승인을 요구한다.

확정 문서에는 다음 긴장이 있다.

- Product Spec은 공유 대상을 사용자·팀·프로젝트 단위로 지정할 수 있다고 정의한다.
- `SECURITY.md`와 Quality Model은 개인 일정은 작성자·참석자, 팀 일정은 연결 팀 소속·참석자, 프로젝트 일정은 연결 프로젝트 참여자·참석자에게 공개하도록 정의한다.
- 참석자는 실제 참여자이고 공유 대상은 공개 범위를 위한 대상이므로 같은 관계로 취급하면 의미와 권한 판정이 섞인다.

이 차이를 구현자가 임의 해석하지 않도록 MVP의 테이블 책임과 사용자 공유 대상의 권한 의미를 승인해야 한다.

## 결정해야 할 사항

1. 일정 상태·종일·색상·취소 감사 정보의 저장 위치와 허용값
2. 참석자와 팀·프로젝트 대상을 표현할 Mapping
3. `USER` 공유 대상과 참석자의 관계 및 조회 권한
4. DB Constraint와 Calendar 기간 조회 Index
5. 기존 Initial Baseline 데이터를 보존하는 비파괴 전환 방식

## 선택지

### 선택지 A. 참석자와 공유 대상을 분리한다 — 채택

- `schedule_participants`를 별도 테이블로 추가한다.
- `schedule_targets`는 `USER`, `TEAM`, `PROJECT` 공유 대상을 유지한다.
- 참석 인원은 `schedule_participants`와 등록자 참석 여부만으로 계산한다.
- 일정 공개 권한은 유형별 기본 공개 대상, 참석자와 명시적 `USER` 공유 대상을 합산한다.
- 명시적 `USER` 공유가 `SECURITY.md`의 현재 문구보다 공개 범위를 넓히므로, 이 선택지를 승인할 때 보안·품질 문서 동기화가 필요하다.

장점:

- 참석과 공유의 의미가 분리되고 Product Spec의 사용자 공유 대상을 보존한다.
- 향후 참석 상태와 초대 응답을 공유 권한과 독립적으로 확장할 수 있다.

비용과 위험:

- 보안 문서의 공개 규칙을 함께 갱신해야 한다.
- 공유 대상과 참석자가 같은 사용자일 때 권한 판정 중복을 제거해야 한다.

### 선택지 B. MVP에서는 사용자 공유 대상을 참석자로 통합한다

- 별도 `schedule_participants`를 추가한다.
- `schedule_targets`는 `TEAM`, `PROJECT`만 사용한다.
- 개인 사용자에게 공유하려면 참석자로 추가한다.

장점:

- 현재 `SECURITY.md`와 Quality Model의 공개 규칙을 그대로 유지한다.
- 권한 Query가 단순하다.

비용과 위험:

- Product Spec의 사용자 공유 대상과 참석자 구분을 축소하므로 요구사항 의미 변경 승인이 필요하다.
- 공유만 하고 참석하지 않는 사용자를 표현할 수 없다.

### 선택지 C. 기존 `schedule_targets.USER`를 참석자와 공유 대상 모두에 사용한다

장점:

- 새 Mapping 테이블이 줄어든다.

비용과 위험:

- 참석자와 공유 대상의 의미를 구분할 수 없다.
- 참석 인원, 등록자 참석 여부와 권한 판정이 결합되므로 채택하지 않는 것을 권장한다.

## 승인된 Schema

선택지 A를 기준으로 다음 비파괴 변경을 권장한다.

### `schedules` 추가 컬럼

- `status`: `ACTIVE`, `CANCELED`; NOT NULL, 기본값 `ACTIVE`
- `cancelled_at`: 취소 시각; NULL 허용
- `cancelled_by`: 취소 사용자 FK; NULL 허용
- `is_all_day`: 종일 여부; NOT NULL
- `color_label`: `RED`, `ORANGE`, `YELLOW`, `GREEN`, `BLUE`, `PURPLE`; NOT NULL
- `creator_attends`: 등록자 참석 여부; NOT NULL

### 관계와 Constraint

- `schedule_participants(schedule_id, user_id)`를 추가하고 조합 중복을 금지한다.
- `schedules_details.schedule_id`는 Calendar MVP의 1:1 의도에 맞춰 UNIQUE로 제한한다.
- `schedule_targets`는 Target Type과 대응 FK가 정확히 하나만 설정되도록 검증한다.
- `PERSONAL`, `TEAM`, `PROJECT` 중 정확히 하나의 일정 유형만 허용한다.
- `end_at > start_at`을 Application과 DB 경계에서 함께 검증한다.
- `CANCELED`이면 취소 시각과 취소 주체가 존재하고, `ACTIVE`이면 두 값이 NULL이 되도록 상태 일관성을 검증한다.
- 물리 삭제 없이 상세·대상·참석자 관계를 보존한다.

### Index

- ACTIVE 일정의 기간 겹침 조회를 위한 상태·시작·종료 Index
- 작성자별 일정 조회 Index
- 참석자, 팀과 프로젝트 연결을 통한 공개 대상 조회 Index

최종 Index 순서와 Partial Index 사용 여부는 PostgreSQL Query Plan 검증 결과로 확정한다.

## Decision

선택지 A와 승인된 Schema를 채택한다. 명시적 `USER` 공유 대상은 참석 여부와 별개로 조회 권한을 부여하며, `SECURITY.md`, Quality Model과 `backend/API.md`를 이 결정에 맞춰 동기화한다.

## Consequences

- JPA Entity, DTO, Migration, `backend/API.md`와 `backend/DB_SCHEMA.md`를 같은 Task에서 동기화한다.
- 취소는 상태 전환이며 기존 일정과 관계를 삭제하지 않는다.
- 참석 인원은 중복 제거된 참석자와 등록자 참석 여부로 계산한다.
- 팀·프로젝트 다중 대상과 사용자 공유 대상의 권한 Query를 통합 Test로 검증한다.
- Initial Baseline ERD 원본 위치가 없으므로 `backend/DB_SCHEMA.md`를 현재 기준 기록으로 사용하거나 별도 ERD 기준 위치를 사람이 지정해야 한다.

## 검증 방법

- Migration 전후 기존 일정·상세·대상 데이터 보존
- 상태·색상 허용값과 취소 감사 조합 Constraint
- 상세 1:1과 참석자 중복 방지
- 유형별 대상 조합과 다중 팀·프로젝트 관계
- 개인·팀·프로젝트 및 명시적 사용자 공유의 공개·비공개 Matrix
- 기간 겹침 Query의 PostgreSQL 실행 계획과 Index 사용

## 사람 승인 기록

- 선택: `A`
- Schema 변경 승인: `APPROVED`
- 보안·Quality Model·API 계약 동기화 승인: `APPROVED`
- 승인자: 사용자 명시 승인
- 승인일: 2026-08-06
- 승인 의견: ADR-0001 Calendar 영속 Schema 승인
