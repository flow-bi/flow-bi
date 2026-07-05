# db-schema.md

> 이 문서는 ERD설계서를 백엔드 도메인 구조(`auth` / `user` / `schedule` / `meetingroom`)에 맞춰 재구성한 스키마 문서다. 현재는 설계 단계의 스냅샷이며, 실제 마이그레이션이 적용된 이후에는 DB에서 자동 생성되는 스키마 문서로 교체하는 것을 목표로 한다(수동 갱신 시 실제 스키마와의 불일치 위험 있음).
>
> MVP1에서 실제로 사용하는 테이블과, 스키마만 존재하고 MVP1에서 구현하지 않는 테이블(RBAC)을 구분해서 표기했다.

---

## 도메인 ↔ 테이블 매핑

| 백엔드 도메인 | 테이블 |
|---|---|
| `auth` | `user_credentials`, `user_tokens` |
| `user` | `users`, `teams`, `teams_closure`, `positions` |
| `schedule` | `schedules`, `schedules_details`, `schedule_targets`, `projects`, `projects_members` |
| `meetingroom` | `rooms`, `rooms_reservations` |
| *(MVP1 미구현, 스키마만 유지)* | `roles`, `permissions`, `role_permissions`, `user_roles` |

---

## 1. `auth` 도메인

### `user_credentials` — 사용자 인증 정보
비밀번호 해시를 `users`(인사 정보)와 물리적으로 분리해 보안성을 높이고, 향후 인증 수단 확장을 유연하게 수용하기 위한 테이블.

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| credential_id | 인증 고유 ID | BIGINT | PK | |
| user_id | 사용자 ID | BIGINT | FK, Not Null, **Unique** | `users.user_id` 참조, 1:1 관계를 DB 레벨에서 강제 |
| password_hash | 비밀번호 해시 | VARCHAR(255) | Nullable | 자체 로그인 시에만 사용 |
| created_at | 최초 등록일시 | DATETIME | Default Now | |
| updated_at | 최종 변경일시 | DATETIME | Default Now | 비밀번호 변경 이력 추적용 |

### `user_tokens` — 리프레시 토큰 관리
중복 로그인(다중 기기) 지원, 강제 로그아웃, refresh token 보안 검증을 위한 테이블. **Redis 대신 이 테이블이 refresh token 저장소 역할을 한다.**

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| token_id | 토큰 이력 ID | BIGINT | PK | |
| user_id | 사용자 ID | BIGINT | FK, Not Null | `users.user_id` 참조, 1:N (기기별 다중 발급) |
| refresh_token | 리프레시 토큰 | VARCHAR(512) | Not Null | |
| device_info | 접속 기기 정보 | VARCHAR(255) | Nullable | 기기별 로그아웃 기능에 사용 |
| expires_at | 토큰 만료 일시 | DATETIME | Not Null | |
| created_at | 생성 | DATETIME | Default Now | |
| updated_at | 수정일시 | DATETIME | Default Now | 토큰 로테이션 시점 추적 |

---

## 2. `user` 도메인

### `users` — 사용자/임직원
순수 인사 메타데이터만 기록. 로그인 자격 증명은 `user_credentials`로 분리되어 있다.

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| user_id | 사용자 ID | BIGINT | PK | |
| position_id | 직급 ID | BIGINT | FK, Not Null | `positions` 참조 |
| team_id | 팀 ID | BIGINT | FK, Not Null | `teams` 참조 |
| employee_number | 사번 | VARCHAR(50) | Not Null | 로그인 ID로 사용 |
| name | 이름 | VARCHAR(50) | Not Null | |
| email | 이메일 | VARCHAR(255) | Nullable | 마이페이지에서 수정 가능(FR-025) |
| phone_number | 전화번호 | VARCHAR(20) | Nullable | 마이페이지에서 수정 가능(FR-025) |
| status | 상태 | VARCHAR(30) | Nullable | 업무중/휴가중/외근중 등, 마이페이지에서 수정 가능 |
| profile_image_url | 프로필 사진 | VARCHAR(512) | Nullable | 조직도·마이페이지 노출용 (MVP1: 변경 불가, 조회만) |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `teams` — 팀
회사의 조직 계층(본부-부-팀 등)을 정의.

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| team_id | 부서 ID | BIGINT | PK | |
| parent_team_id | 상위 부서 ID | BIGINT | Nullable | 인접 리스트 방식, 최상위는 Null |
| team_name | 부서명 | VARCHAR(50) | Not Null | |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `teams_closure` — 팀 계층 구조(클로저 테이블)
무제한 깊이의 조직도를 재귀 쿼리 없이 빠르게 조회하기 위한 클로저 테이블.

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| ancestor_team_id | 조상 팀 ID | BIGINT | PK, FK | |
| descendant_team_id | 자손 팀 ID | BIGINT | PK, FK | 본인 자신도 포함(depth=0) |
| depth | 계층 깊이 | INT | Not Null | 본인 0, 직속 하위 1 |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `positions` — 직급

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| position_id | 직급 ID | BIGINT | PK | |
| position_name | 직급명 | VARCHAR(50) | Not Null | 예: 대리, 사원, 부장 |
| code | 직급 코드 | VARCHAR(255) | Nullable | 인사 시스템 연동/정렬용 |
| status | 사용 상태 | VARCHAR(30) | Nullable | 활성/비활성 |
| level | 직급 레벨 | VARCHAR(255) | Nullable | 레벨별 직급 조회용 |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

> **참고**: `users`, `teams`, `positions`는 MVP1에서 관리자 CRUD API 없이 `backend/src/main/resources/db/seed/`의 시딩 데이터로만 채워진다. `user` 도메인은 이 테이블들에 대해 조회(GET) API와, `users`에 한해 본인 프로필 수정(PATCH) API만 제공한다.

---

## 3. `schedule` 도메인

### `schedules` — 일정 기본
캘린더에 표시될 모든 일정의 핵심 메타데이터.

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| schedule_id | 일정 ID | BIGINT | PK | |
| title | 일정 제목 | VARCHAR(200) | Not Null | |
| schedule_type | 일정 분류 | VARCHAR(30) | Nullable | 값 확정: `PERSONAL`/`TEAM`/`PROJECT` (product-specs/schedule.md 참고) |
| visibility | 공개 여부 | VARCHAR(30) | Nullable | 값 확정: `PUBLIC`/`PRIVATE`/`TEAM_ONLY` (열람 가능 범위, 공유 대상은 `schedule_targets`로 별도 관리) |
| start_at | 시작 일시 | DATETIME | Not Null | |
| end_at | 종료 일시 | DATETIME | Not Null | |
| creator_id | 등록자 ID | BIGINT | FK, Not Null | `users.user_id` 참조, 수정/삭제 권한 검증 기준 |
| color_label | 색상 라벨 | VARCHAR(20) | Nullable | 캘린더 UI 색상 구분용 (product-specs/schedule.md 결정으로 추가) |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `schedules_details` — 일정 상세 설명
목록 조회 성능을 위해 무거운 본문/장소 정보를 `schedules`에서 분리(1:1).

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| schedule_details_id | 일정 상세 ID | BIGINT | PK | |
| schedule_id | 일정 ID | BIGINT | FK, Not Null | 부모 일정 |
| content | 일정 내용 | VARCHAR(200) | Nullable | |
| location | 장소 명칭 | VARCHAR(30) | Nullable | |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `schedule_targets` — 일정 공유/참조 대상
하나의 일정이 여러 사람/프로젝트/팀에 동시에 연결되는 N:M 구조를 해소하는 매핑 테이블.

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| schedule_target_id | 일정 공유 ID | BIGINT | PK | |
| schedule_id | 일정 ID | BIGINT | FK, Not Null | |
| user_id | 대상 사원 ID | BIGINT | FK, Nullable | target_type='USER'일 때만 값 존재 |
| project_id | 대상 프로젝트 ID | BIGINT | FK, Nullable | target_type='PROJECT'일 때만 값 존재 |
| ancestor_team_id | 조상 팀 ID | BIGINT | FK, Nullable | target_type='TEAM'일 때만 값 존재, `teams_closure` 조인용 |
| team_id | 자손 팀 ID | BIGINT | FK, Nullable | target_type='TEAM'일 때만 값 존재, 하위 조직 포함 검증용 |
| target_type | 대상 유형 | VARCHAR(30) | Not Null | USER / PROJECT / TEAM |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

> **주의**: `target_type`에 따라 `user_id`/`project_id`/`ancestor_team_id`+`team_id` 중 실제로 유효한 컬럼이 달라지는 다형적 구조다. 위 4개 FK 컬럼은 모두 `Nullable`로 확정했으며, `target_type`에 맞는 컬럼만 채워지고 나머지는 `NULL`이어야 한다는 규칙은 DB `CHECK` 제약이 아닌 **서비스 레이어 검증**으로 처리한다 (2번 결정과 동일 방침).

### `projects` — 프로젝트

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| project_id | 프로젝트 ID | BIGINT | PK | |
| project_name | 프로젝트명 | VARCHAR(50) | Not Null | |
| description | 프로젝트 설명 | TEXT | Nullable | |
| status | 진행 상태 | VARCHAR(30) | Nullable | 준비중/진행중/보류/완료 |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `projects_members` — 프로젝트 참여자 매핑 (N:M 해소)

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| project_member_id | 프로젝트 멤버 ID | BIGINT | PK | |
| project_id | 프로젝트 ID | BIGINT | FK, Not Null | |
| user_id | 참여자 사원 ID | BIGINT | FK, Not Null | |
| joined_at | 투입 일시 | DATETIME | Default Now | |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

---

## 4. `meetingroom` 도메인

### `rooms` — 회의실

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| room_id | 회의실 ID | BIGINT | PK | |
| room_name | 자원명 | VARCHAR(100) | Not Null | 예: 1회의실, 대회의실 |
| capacity | 수용 인원 | BIGINT | Nullable | |
| location | 자원 위치 | VARCHAR(255) | Nullable | 예: 본관 3층 302호 |
| field | 기타 여분 필드 | VARCHAR(255) | Nullable | 빔프로젝터 유무 등 비정형 특성 |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

### `rooms_reservations` — 회의실 예약 현황
`schedules`와 연동되어 회의실 예약 시 일정이 자동 생성/동기화된다(FR-021).

| 컬럼 | 논리명 | 타입 | 제약조건 | 비고 |
|---|---|---|---|---|
| reservation_id | 예약 고유 ID | BIGINT | PK | |
| room_id | 회의실 ID | BIGINT | FK, Not Null | |
| schedule_id | 연동 일정 ID | BIGINT | FK, Not Null | `schedules.schedule_id` 참조, 강한 동기화 |
| title | 예약 목적 제목 | VARCHAR(200) | Not Null | |
| start_at | 예약 시작 시간 | DATETIME | Not Null | |
| end_at | 예약 종료 시간 | DATETIME | Not Null | 동일 회의실에서 겹치는 시간대 예약 금지(검증 필요) |
| status | 예약 상태 | VARCHAR(30) | Nullable | 승인대기/예약완료/취소됨 |
| cancelled_at | 취소 일시 | DATETIME | Nullable | |
| count | 이용 예상 인원 | INT | Nullable | |
| field | 여분 필드 | VARCHAR(255) | Nullable | |
| created_at / updated_at | 생성/수정일시 | DATETIME | Default Now | |

> **비즈니스 룰**: 동일 `room_id`에 대해 `start_at`~`end_at` 구간이 겹치는 예약은 생성할 수 없다. DB 제약(EXCLUDE constraint 등)이 아닌 **서비스 레이어에서 겹침 여부를 조회 후 검증**하는 방식으로 구현한다. 예약 생성/수정 시 `meetingroom` 서비스에서 동일 `room_id`의 기존 예약(취소되지 않은 것)과 시간 겹침 쿼리를 먼저 수행하고, 겹치면 `ErrorCode`(예: `MEETINGROOM_001`)로 거부한다. 동시성(동시 예약 요청) 문제를 완전히 막으려면 트랜잭션 격리 수준 또는 비관적 락 적용 여부를 구현 시 함께 검토할 것.

---

## 5. MVP1 미구현 (스키마만 유지) — RBAC 도메인

`roles`, `permissions`, `role_permissions`, `user_roles`는 원래 ERD설계서에 설계되어 있으나, MVP1에서는 관리자 기능이 시딩 데이터로 대체되면서 **구현하지 않는다**. 스키마 설계 자체는 향후(MVP2 이후 또는 관리자 기능 확장 시) 참고할 수 있도록 ERD설계서 원문을 남겨두되, 마이그레이션에는 포함하지 않는다.

---

## 6. 확정된 결정 사항

- **`schedule_targets`의 다형적 FK 처리**: `user_id`/`project_id`/`ancestor_team_id`/`team_id`는 모두 `Nullable`로 확정. `target_type`에 맞는 컬럼만 채우는 규칙은 DB 제약이 아닌 서비스 레이어 검증으로 처리한다.
- **회의실 예약 시간 중복 방지**: DB 제약(EXCLUDE 등)을 쓰지 않고, `meetingroom` 서비스 레이어에서 겹침 조회 후 검증하는 방식으로 확정.
- **`user_credentials`의 1:1 제약**: `user_id`에 `UNIQUE` 제약을 마이그레이션에 명시적으로 포함하는 것으로 확정.