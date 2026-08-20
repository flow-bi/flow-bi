# DB_SCHEMA.md

## 1. 문서 상태

> **상태: Reviewed Baseline Draft**
>
> 이 문서는 초기 ERD를 기준으로 하되 승인된 인증 결정인 Redis 기반 서버 세션과 최초 로그인 비밀번호 변경 상태, PostgreSQL 팀 계층 Migration을 반영한다. 나머지 미검토 구조는 초기 기준선으로 유지한다.

인증 영역을 제외한 ERD의 명칭, 타입, 오탈자와 예비 필드는 원본 추적을 위해 그대로 기록한다. 실제 PostgreSQL Migration을 작성하기 전 별도 Schema Review와 승인이 필요하다.

## 2. 조직 및 사용자 관리

### 2.1 `users`

임직원의 핵심 인사 정보를 관리한다.

| 컬럼                | 타입           | 제약         | 설명              |
| ------------------- | -------------- | ------------ | ----------------- |
| `user_id`           | `BIGINT`       | PK           | 사용자 ID         |
| `position_id`       | `BIGINT`       | FK, NOT NULL | 직급 ID           |
| `team_id`           | `BIGINT`       | FK, NOT NULL | 소속 팀 ID        |
| `employee_number`   | `VARCHAR(50)`  | NOT NULL     | 사번 및 로그인 ID |
| `name`              | `VARCHAR(50)`  | NOT NULL     | 이름              |
| `email`             | `VARCHAR(255)` | UNIQUE, NOT NULL | 이메일         |
| `phone_number`      | `VARCHAR(20)`  | NULL         | 전화번호          |
| `status`            | `VARCHAR(30)`  | NOT NULL     | 계정 상태         |
| `profile_image_url` | `VARCHAR(512)` | NULL         | 프로필 이미지 URL |
| `created_at`        | `DATETIME`     | DEFAULT NOW  | 생성일시          |
| `updated_at`        | `DATETIME`     | DEFAULT NOW  | 수정일시          |

관계: Position N:1, Team N:1, User Credentials 1:1. 로그인 세션은 PostgreSQL이 아니라 Redis의 Spring Session 저장소에서 관리한다.

`status`는 계정 활성화 상태인 `ACTIVE`, `INACTIVE`만 허용한다. 재직 상태와 업무 상태는 별도 개념이며 이 컬럼에 혼합하지 않는다. V2 Migration은 기존 사용자 이메일을 추측해 생성하지 않으며, 기존 사용자가 있으면 승인된 이메일 Backfill 전까지 적용을 중단한다.

### 2.2 `user_credentials`

사용자 인증정보를 인사정보와 분리한다. 현재 자체 로그인만 고려하며 `provider`는 기준선에 없다.

| 컬럼                   | 타입           | 제약                   | 설명                         |
| ---------------------- | -------------- | ---------------------- | ---------------------------- |
| `credential_id`        | `BIGINT`       | PK                     | 인증정보 ID                  |
| `user_id`              | `BIGINT`       | FK, NOT NULL, UNIQUE   | 사용자 ID                    |
| `password_hash`        | `VARCHAR(255)` | NOT NULL               | 비밀번호 Hash                |
| `must_change_password` | `BOOLEAN`      | NOT NULL, DEFAULT TRUE | 임시 비밀번호 변경 필요 여부 |
| `created_at`           | `DATETIME`     | DEFAULT NOW            | 생성일시                     |
| `updated_at`           | `DATETIME`     | DEFAULT NOW            | 수정일시                     |

관리자가 임시 비밀번호를 발급하거나 초기화할 때 `must_change_password`를 `TRUE`로 설정하고, 사용자가 새 비밀번호로 변경을 완료하면 `FALSE`로 변경한다.

### 2.3 `teams`

조직 계층의 팀을 관리한다.

| 컬럼             | PostgreSQL 타입            | 제약                                      | 설명       |
| ---------------- | -------------------------- | ----------------------------------------- | ---------- |
| `team_id`        | `BIGINT`                   | PK, identity                              | 팀 ID      |
| `parent_team_id` | `BIGINT`                   | NULL, FK → `teams.team_id`, self 제외 CHECK | 상위 팀 ID |
| `team_name`      | `VARCHAR(50)`              | NOT NULL                                  | 팀 이름    |
| `created_at`     | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`     | 생성일시   |
| `updated_at`     | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`     | 수정일시   |

`parent_team_id`에는 `idx_teams_parent_team_id`를 둔다. 이름은 `lower(btrim(team_name))`으로
정규화하며, 최상위 팀은 `uk_teams_root_normalized_name` partial unique index로, 하위 팀은
`uk_teams_parent_normalized_name` partial unique index로 같은 부모 아래 중복을 막는다.
기존 팀은 Migration에서 `parent_team_id = NULL`인 최상위 팀으로 보존한다.

### 2.4 `teams_closure`

팀 계층을 Closure Table Pattern으로 관리한다.

| 컬럼                 | PostgreSQL 타입            | 제약                                        | 설명                |
| -------------------- | -------------------------- | ------------------------------------------- | ------------------- |
| `ancestor_team_id`   | `BIGINT`                   | 복합 PK, FK → `teams.team_id`, NOT NULL     | 조상 팀 ID          |
| `descendant_team_id` | `BIGINT`                   | 복합 PK, FK → `teams.team_id`, NOT NULL     | 자손 팀 ID          |
| `depth`              | `INTEGER`                  | NOT NULL, Closure depth CHECK                | 조상에서 자손까지 간선 수 |
| `created_at`         | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`       | 생성일시            |
| `updated_at`         | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `CURRENT_TIMESTAMP`       | 수정일시            |

`depth`는 조상에서 자손까지의 간선 수다. 동일 팀 행은 반드시 `depth = 0`, 서로 다른 팀 행은
반드시 `depth > 0`이다. Migration은 모든 기존 팀에 `(team_id, team_id, 0)` 행을 backfill한다.
조회용 인덱스는 `idx_teams_closure_ancestor_depth_descendant(ancestor_team_id, depth,
descendant_team_id)` 및 `idx_teams_closure_descendant_depth_ancestor(descendant_team_id, depth,
ancestor_team_id)`이며, 복합 PK 선두 컬럼과 중복되는 단일 인덱스는 만들지 않는다.

### 2.5 `positions`

임직원의 인사 직급을 관리한다.

| 컬럼            | 타입           | 제약        | 설명       |
| --------------- | -------------- | ----------- | ---------- |
| `position_id`   | `BIGINT`       | PK          | 직급 ID    |
| `position_name` | `VARCHAR(50)`  | NOT NULL    | 직급명     |
| `code`          | `VARCHAR(255)` | NULL        | 직급 Code  |
| `status`        | `VARCHAR(30)`  | NULL        | 사용 상태  |
| `level`         | `VARCHAR(255)` | NULL        | 직급 Level |
| `created_at`    | `DATETIME`     | DEFAULT NOW | 생성일시   |
| `updated_at`    | `DATETIME`     | DEFAULT NOW | 수정일시   |

`user_position_histories`는 추후 논의 대상으로 기준선 테이블에 포함하지 않는다.

## 3. 역할 및 권한 관리

### 3.1 `roles`

| 컬럼         | 타입          | 제약        | 설명     |
| ------------ | ------------- | ----------- | -------- |
| `role_id`    | `BIGINT`      | PK          | 역할 ID  |
| `role_name`  | `VARCHAR(50)` | NOT NULL    | 역할명   |
| `created_at` | `DATETIME`    | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME`    | DEFAULT NOW | 수정일시 |

### 3.2 `permissions`

| 컬럼              | 타입          | 제약        | 설명     |
| ----------------- | ------------- | ----------- | -------- |
| `permission_id`   | `BIGINT`      | PK          | 권한 ID  |
| `permission_name` | `VARCHAR(50)` | NOT NULL    | 권한명   |
| `created_at`      | `DATETIME`    | DEFAULT NOW | 생성일시 |
| `updated_at`      | `DATETIME`    | DEFAULT NOW | 수정일시 |

### 3.3 `role_permissions`

Role과 Permission의 N:M Mapping이다.

| 컬럼                 | 타입       | 제약         | 설명       |
| -------------------- | ---------- | ------------ | ---------- |
| `role_permission_id` | `BIGINT`   | PK           | Mapping ID |
| `role_id`            | `BIGINT`   | FK, NOT NULL | 역할 ID    |
| `permission_id`      | `BIGINT`   | FK, NOT NULL | 권한 ID    |
| `created_at`         | `DATETIME` | DEFAULT NOW  | 생성일시   |
| `updated_at`         | `DATETIME` | DEFAULT NOW  | 수정일시   |

### 3.4 `user_roles`

User와 Role의 N:M Mapping이다.

| 컬럼           | 타입       | 제약         | 설명       |
| -------------- | ---------- | ------------ | ---------- |
| `user_role_id` | `BIGINT`   | PK           | Mapping ID |
| `user_id`      | `BIGINT`   | FK, NOT NULL | 사용자 ID  |
| `role_id2`     | `BIGINT`   | FK, NOT NULL | 역할 ID    |
| `created_at`   | `DATETIME` | DEFAULT NOW  | 생성일시   |
| `updated_at`   | `DATETIME` | DEFAULT NOW  | 수정일시   |

## 4. 일정 및 협업 관리

### 4.1 `schedules`

일정의 핵심 Meta Data를 관리한다.

| 컬럼            | 타입           | 제약         | 설명                     |
| --------------- | -------------- | ------------ | ------------------------ |
| `schedule_id`   | `BIGINT`       | PK           | 일정 ID                  |
| `title`         | `VARCHAR(200)` | NOT NULL     | 제목                     |
| `schedule_type` | `VARCHAR(30)`  | NULL         | 전사·팀·개인·프로젝트 등 |
| `visibility`    | `VARCHAR(30)`  | NULL         | 공개 범위                |
| `start_at`      | `DATETIME`     | NOT NULL     | 시작일시                 |
| `end_at`        | `DATETIME`     | NOT NULL     | 종료일시                 |
| `creator_id`    | `BIGINT`       | FK, NOT NULL | 등록자 ID                |
| `created_at`    | `DATETIME`     | DEFAULT NOW  | 생성일시                 |
| `updated_at`    | `DATETIME`     | DEFAULT NOW  | 수정일시                 |

관계: User N:1, Schedule Details 1:N으로 설명되어 있으나 상세 명세는 1:1 의도, Schedule Targets 1:N, Room Reservations 1:N.

### 4.2 `schedules_details`

일정의 상세 내용과 장소를 분리한다.

| 컬럼                  | 타입           | 제약         | 설명      |
| --------------------- | -------------- | ------------ | --------- |
| `schedule_details_id` | `BIGINT`       | PK           | 상세 ID   |
| `schedule_id`         | `BIGINT`       | FK, NOT NULL | 일정 ID   |
| `content`             | `VARCHAR(200)` | NULL         | 상세 내용 |
| `location`            | `VARCHAR(30)`  | NULL         | 장소      |
| `created_at`          | `DATETIME`     | DEFAULT NOW  | 생성일시  |
| `updated_at`          | `DATETIME`     | DEFAULT NOW  | 수정일시  |

### 4.3 `schedule_targets`

일정을 사용자·프로젝트·팀 대상에 연결한다.

| 컬럼                 | 타입          | 제약         | 설명                      |
| -------------------- | ------------- | ------------ | ------------------------- |
| `schedule_target_id` | `BIGINT`      | PK           | 공유 ID                   |
| `schedule_id`        | `BIGINT`      | FK, NOT NULL | 일정 ID                   |
| `user_id`            | `BIGINT`      | FK, NULL     | 대상 사용자               |
| `project_id`         | `BIGINT`      | FK, NULL     | 대상 프로젝트             |
| `ancestor_team_id`   | `BIGINT`      | FK, NULL     | 조상 팀 ID                |
| `team_id`            | `BIGINT`      | FK, NULL     | 자손 팀 ID                |
| `target_type`        | `VARCHAR(30)` | NOT NULL     | `USER`, `PROJECT`, `TEAM` |
| `created_at`         | `DATETIME`    | DEFAULT NOW  | 생성일시                  |
| `updated_at`         | `DATETIME`    | DEFAULT NOW  | 수정일시                  |

### 4.4 `projects`

| 컬럼           | 타입          | 제약        | 설명                   |
| -------------- | ------------- | ----------- | ---------------------- |
| `project_id`   | `BIGINT`      | PK          | 프로젝트 ID            |
| `project_name` | `VARCHAR(50)` | NOT NULL    | 프로젝트명             |
| `description`  | `TEXT`        | NULL        | 설명                   |
| `status`       | `VARCHAR(30)` | NULL        | 준비·진행·보류·완료 등 |
| `created_at`   | `DATETIME`    | DEFAULT NOW | 생성일시               |
| `updated_at`   | `DATETIME`    | DEFAULT NOW | 수정일시               |

### 4.5 `projects_members`

Project와 User의 N:M Mapping이다.

| 컬럼                | 타입       | 제약         | 설명        |
| ------------------- | ---------- | ------------ | ----------- |
| `project_member_id` | `BIGINT`   | PK           | 참여 ID     |
| `project_id`        | `BIGINT`   | FK, NOT NULL | 프로젝트 ID |
| `user_id`           | `BIGINT`   | FK, NOT NULL | 사용자 ID   |
| `joined_at`         | `DATETIME` | DEFAULT NOW  | 참여일시    |
| `created_at`        | `DATETIME` | DEFAULT NOW  | 생성일시    |
| `updated_at`        | `DATETIME` | DEFAULT NOW  | 수정일시    |

## 5. 자원 및 예약 관리

### 5.1 `rooms`

| 컬럼         | 타입           | 제약        | 설명                           |
| ------------ | -------------- | ----------- | ------------------------------ |
| `room_id`    | `BIGINT`       | PK          | 회의실 ID                      |
| `room_name`  | `VARCHAR(100)` | NOT NULL    | 회의실명                       |
| `capacity`   | `BIGINT`       | NULL        | 수용 인원                      |
| `location`   | `VARCHAR(255)` | NULL        | 위치                           |

### 5.2 `rooms_reservations`

회의실 예약과 일정 연결을 관리한다.

| 컬럼             | 타입           | 제약         | 설명                     |
| ---------------- | -------------- | ------------ | ------------------------ |
| `reservation_id` | `BIGINT`       | PK           | 예약 ID                  |
| `room_id`        | `BIGINT`       | FK, NOT NULL | 회의실 ID                |
| `schedule_id`    | `BIGINT`       | FK, NOT NULL | 일정 ID                  |
| `title`          | `VARCHAR(200)` | NOT NULL     | 예약 제목                |
| `start_at`       | `TIMESTAMP`    | NOT NULL     | 시작일시                 |
| `end_at`         | `TIMESTAMP`    | NOT NULL     | 종료일시                 |
| `status`         | `VARCHAR(30)`  | NOT NULL     | `RESERVED`, `CANCELED`   |

`rooms_reservations`의 시간 구간은 `end_at > start_at`이어야 한다. `room_id`, `status`,
`start_at`, `end_at`의 복합 Index로 활성 예약 중복 조회를 지원하고, `schedule_id` Index로
연결 일정 여부 조회를 지원한다.

## 6. 기준선 관계 요약

```text
positions 1 --- N users N --- 1 teams
users 1 --- 1 user_credentials
teams N --- N teams (teams_closure)
users N --- N roles (user_roles)
roles N --- N permissions (role_permissions)
users 1 --- N schedules
schedules 1 --- N schedule_targets
schedules --- schedules_details
projects N --- N users (projects_members)
rooms 1 --- N rooms_reservations
schedules 1 --- N rooms_reservations
```

## 7. 승인된 Calendar Migration Schema

ADR-0001, ADR-0002와 ADR-0003 승인에 따라 Migration은 UTC Timestamp 기반 전역 Version 순서로 적용한다. `V20260812000001_00__auth_create_authentication_tables.sql`이 `users`와 `teams`를 생성하고, `V20260812000002_00__calendar_create_calendar_schema.sql`이 해당 식별자와 Calendar의 임시 `projects` 기준선을 참조해 Calendar 테이블을 생성한다. `V20260812000003_00__calendar_add_creation_constraints.sql`은 Calendar 제약조건과 Index를 추가한다. `V20260812000004_00__project_add_membership_contract.sql`은 Task 7의 실제 프로젝트 참여 판정을 위해 기준선 `projects`에 활성 상태를 추가하고 `projects_members`의 참조·중복 제약과 사용자 조회 Index를 생성한다. `V20260812000005_00__user_align_user_domain_schema.sql`은 기존 사용자에게 충돌하지 않는 전환용 이메일을 부여한 뒤 이메일·연락처·프로필 이미지 계약과 사용자 상태 제약을 적용한다. 사용자·조직 원장은 Authentication이 소유하며 Calendar가 이를 생성하거나 관리하지 않는다. `projects`와 `projects_members` 기준선은 Project 도메인의 영속 계약이 도입될 때 소유권을 이전한다.

- `schedules`: `status (ACTIVE|CANCELED)`, `cancelled_at`, `cancelled_by`, `is_all_day`, `color_label (RED|ORANGE|YELLOW|GREEN|BLUE|PURPLE)`, `creator_attends`를 추가하고 유형·공개 범위, 시간 구간, 취소 감사 조합을 CHECK로 보장한다.
- `schedules_details.schedule_id`는 UNIQUE인 1:1 관계다.
- `schedule_participants(schedule_id, user_id)`는 UNIQUE로 중복 참석자를 막고, 참석자와 `schedule_targets.USER`를 분리한다.
- `schedule_targets`는 `USER`, `TEAM`, `PROJECT`별 해당 FK 하나만 설정되는 CHECK와 각 외부 원장 FK를 가진다.
- 기간 조회는 `idx_schedules_active_period(status, start_at, end_at)`, 작성자 조회는 `idx_schedules_creator`, 공개 대상 조회는 참석자·사용자·팀·프로젝트별 Index를 사용한다.
- Migration은 추가 생성만 수행하며 일정 및 관계 데이터를 물리 삭제하거나 기존 Migration을 변경하지 않는다.

## 8. 검토 대기 항목

다음 항목은 기준선에 반영하지 않았으며 전체 문서 작성 후 Schema Review에서 검토한다.

- PostgreSQL에 맞는 `DATETIME` 타입 정합성
- `role_id2`, `projects_members`, `rooms_reservations`, `schedules_details` 등 명칭과 오탈자
- `employee_number`, 역할명, 권한명 및 Mapping 조합의 UNIQUE 제약
- `schedule_details` 관계가 1:1인지 1:N인지
- 확정된 일정 규칙을 표현할 Schema: 유형은 하나, 팀·프로젝트·참석자는 각각 다중 연결, 유형별 공개 대상 제한
- `schedule_targets`의 다형 관계와 CHECK/FK 무결성
- 일정과 회의실 예약의 관계 및 중복 저장된 제목·시간
- 회의실 중복 예약의 DB 수준 제약
- Status 허용값과 상태 전이
- 직원·팀 등 일정 외 도메인의 삭제·비활성화 정책 확정 후 필요한 상태 컬럼과 제약
- `Field` 예비 컬럼과 회의실 장비 모델
- `capacity`, `level`, `content`, `location` 타입과 길이
- Index, Foreign Key 삭제 정책과 감사 필드 제약
- 종일 일정, 색상 Label, 알림 설정과 업무 상태 관련 테이블

### 8.1 확정 정책

다음 정책은 팀 결정으로 확정됐지만 Initial Baseline ERD에는 아직 반영하지 않는다.

- 일정 유형은 `PERSONAL`, `TEAM`, `PROJECT` 중 정확히 하나다.
- 하나의 일정은 여러 참석자를 가질 수 있다.
- `TEAM` 일정은 여러 팀, `PROJECT` 일정은 여러 프로젝트와 연결될 수 있다.
- 개인 일정은 작성자와 참석자에게 공개한다.
- 팀 일정은 연결된 팀 소속 사용자와 참석자에게 공개한다.
- 프로젝트 일정은 연결된 프로젝트 참여자와 참석자에게 공개한다.
- 일반 일정 삭제는 물리 삭제하지 않고 `CANCELED` 상태로 보존한다.
- 취소된 일반 일정의 상세, 공유 대상과 참석자 관계는 이력 확인을 위해 유지한다.
- 일반 일정 취소 시 취소 시각과 취소 주체를 기록하고 기본 일정 조회에서 제외한다.

일정 취소 정책을 실제 Schema에 반영할 때는 `schedules.status`, `schedules.cancelled_at`, `schedules.cancelled_by` 컬럼과 상태값 제약 및 조회 Index를 Schema Review에서 확정한다. Initial Baseline 표와 ERD는 승인된 Migration 계획이 마련되기 전까지 변경하지 않는다.

### 7.2 인증 Schema 확정 정책

- 브라우저 인증은 Redis 기반 Spring Session을 사용하므로 PostgreSQL에 `user_tokens`를 두지 않는다.
- `user_credentials.must_change_password`는 임시 비밀번호 변경 필요 상태의 영속 기준이다.
- 실제 Migration에서는 기존 계정의 `must_change_password` 초기값과 배포 전환 절차를 데이터 상태에 맞게 별도로 검증한다.
- Spring Session 데이터와 사용자별 세션 인덱스는 Redis가 관리하며 PostgreSQL ERD 관계에 포함하지 않는다.

## 7.3 Authentication migration and fixture boundary

- `backend/src/main/resources/db/migration/V20260812000001_00__auth_create_authentication_tables.sql` creates the minimal `positions`, `teams`, `users`, and `user_credentials` tables required by the authentication baseline.
- `users.employee_number` is unique; `user_credentials.user_id` is unique and required; both user reference keys are required foreign keys. `must_change_password` defaults to `TRUE`, and `password_hash` is required with a maximum length of 255.
- 공유 개발 DB는 `개발팀`, `기획팀`, `디자인팀`, `인사팀`, `마케팅팀`과 `인턴`, `사원`, `대리`, `과장`, `차장`, `부장`을 조직 기준 데이터로 Migration한다. 이름이 이미 존재하면 중복 삽입하지 않으며, 생성된 ID는 외부 계약으로 고정하지 않는다.
- Development account creation is not a migration or a startup fixture. The optional adapter is
  registered only when the `local` or `test` profile and
  `auth.dev-employee-account.enabled=true` (or
  `AUTH_DEV_EMPLOYEE_ACCOUNT_ENABLED=true`) are both active. Production profiles never register
  the adapter.

## 8. 변경 절차

1. 전체 문서 간 요구사항과 모델 충돌을 수집한다.
2. Schema Review에서 변경안을 작성한다.
3. 주요 결정은 ADR로 승인한다.
4. ERD와 이 문서를 함께 갱신한다.
5. 승인된 Migration을 작성하고 검증한다.

- 이미 적용된 Migration 파일은 수정하지 않고 새 Migration을 추가한다.
- 새 Migration Version은 ADR-0003의 `VyyyyMMddHHmmss_NN__domain_description.sql` 규칙을 사용한다.
- Flyway `outOfOrder`는 기본값 `false`를 유지한다.
- 파괴적 변경은 데이터 보존·전환·복구 계획과 사람의 승인이 선행되어야 한다.
