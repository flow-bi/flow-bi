# DB_SCHEMA.md

## 1. 문서 상태

> **상태: Initial Baseline Draft**
>
> 이 문서는 현재 ERD의 테이블, 컬럼과 관계를 개선하지 않고 기록한 초기 기준선이다. 전체 프로젝트 문서 작성 후 아키텍처·보안·API·품질 기준과 함께 검토한다. 검토 전에는 구조 개선을 목적으로 임의 변경하지 않는다.

ERD에 존재하는 명칭, 타입, 오탈자와 예비 필드는 원본 추적을 위해 그대로 기록한다. 실제 PostgreSQL Migration을 작성하기 전 별도 Schema Review와 승인이 필요하다.

## 2. 조직 및 사용자 관리

### 2.1 `users`

임직원의 핵심 인사 정보를 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `user_id` | `BIGINT` | PK | 사용자 ID |
| `position_id` | `BIGINT` | FK, NOT NULL | 직급 ID |
| `team_id` | `BIGINT` | FK, NOT NULL | 소속 팀 ID |
| `employee_number` | `VARCHAR(50)` | NOT NULL | 사번 및 로그인 ID |
| `name` | `VARCHAR(50)` | NOT NULL | 이름 |
| `email` | `VARCHAR(255)` | NULL | 이메일 |
| `phone_number` | `VARCHAR(20)` | NULL | 전화번호 |
| `status` | `VARCHAR(30)` | NULL | 재직·활동 상태 |
| `profile_image_url` | `VARCHAR(512)` | NULL | 프로필 이미지 URL |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

관계: Position N:1, Team N:1, User Credentials 1:1, User Tokens 1:N.

### 2.2 `user_credentials`

사용자 인증정보를 인사정보와 분리한다. 현재 자체 로그인만 고려하며 `provider`는 기준선에 없다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `credential_id` | `BIGINT` | PK | 인증정보 ID |
| `user_id` | `BIGINT` | FK, NOT NULL, UNIQUE | 사용자 ID |
| `password_hash` | `VARCHAR(255)` | NULL | 비밀번호 Hash |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 2.3 `user_tokens`

다중 Device의 Refresh Token을 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `token_id` | `BIGINT` | PK | Token ID |
| `user_id` | `BIGINT` | FK, NOT NULL | 사용자 ID |
| `refresh_token` | `VARCHAR(512)` | NOT NULL | Refresh Token |
| `device_info` | `VARCHAR(255)` | NULL | 접속 Device 정보 |
| `expires_at` | `DATETIME` | NOT NULL | 만료일시 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 2.4 `teams`

조직 계층의 팀을 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `team_id` | `BIGINT` | PK | 팀 ID |
| `parent_team_id` | `BIGINT` | NULL | 상위 팀 ID |
| `team_name` | `VARCHAR(50)` | NOT NULL | 팀 이름 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 2.5 `teams_closure`

팀 계층을 Closure Table Pattern으로 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `ancestor_team_id` | `BIGINT` | PK, FK | 조상 팀 ID |
| `descendant_team_id` | `BIGINT` | PK, FK | 자손 팀 ID |
| `depth` | `INT` | NOT NULL | 계층 거리; 자신은 0 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 2.6 `positions`

임직원의 인사 직급을 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `position_id` | `BIGINT` | PK | 직급 ID |
| `position_name` | `VARCHAR(50)` | NOT NULL | 직급명 |
| `code` | `VARCHAR(255)` | NULL | 직급 Code |
| `status` | `VARCHAR(30)` | NULL | 사용 상태 |
| `level` | `VARCHAR(255)` | NULL | 직급 Level |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

`user_position_histories`는 추후 논의 대상으로 기준선 테이블에 포함하지 않는다.

## 3. 역할 및 권한 관리

### 3.1 `roles`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `role_id` | `BIGINT` | PK | 역할 ID |
| `role_name` | `VARCHAR(50)` | NOT NULL | 역할명 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 3.2 `permissions`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `permission_id` | `BIGINT` | PK | 권한 ID |
| `permission_name` | `VARCHAR(50)` | NOT NULL | 권한명 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 3.3 `role_permissions`

Role과 Permission의 N:M Mapping이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `role_permission_id` | `BIGINT` | PK | Mapping ID |
| `role_id` | `BIGINT` | FK, NOT NULL | 역할 ID |
| `permission_id` | `BIGINT` | FK, NOT NULL | 권한 ID |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 3.4 `user_roles`

User와 Role의 N:M Mapping이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `user_role_id` | `BIGINT` | PK | Mapping ID |
| `user_id` | `BIGINT` | FK, NOT NULL | 사용자 ID |
| `role_id2` | `BIGINT` | FK, NOT NULL | 역할 ID |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

## 4. 일정 및 협업 관리

### 4.1 `schedules`

일정의 핵심 Meta Data를 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `schedule_id` | `BIGINT` | PK | 일정 ID |
| `title` | `VARCHAR(200)` | NOT NULL | 제목 |
| `schedule_type` | `VARCHAR(30)` | NULL | 전사·팀·개인·프로젝트 등 |
| `visibility` | `VARCHAR(30)` | NULL | 공개 범위 |
| `start_at` | `DATETIME` | NOT NULL | 시작일시 |
| `end_at` | `DATETIME` | NOT NULL | 종료일시 |
| `creator_id` | `BIGINT` | FK, NOT NULL | 등록자 ID |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

관계: User N:1, Schedule Details 1:N으로 설명되어 있으나 상세 명세는 1:1 의도, Schedule Targets 1:N, Room Reservations 1:N.

### 4.2 `schedules_details`

일정의 상세 내용과 장소를 분리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `schedule_details_id` | `BIGINT` | PK | 상세 ID |
| `schedule_id` | `BIGINT` | FK, NOT NULL | 일정 ID |
| `content` | `VARCHAR(200)` | NULL | 상세 내용 |
| `location` | `VARCHAR(30)` | NULL | 장소 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 4.3 `schedule_targets`

일정을 사용자·프로젝트·팀 대상에 연결한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `schedule_target_id` | `BIGINT` | PK | 공유 ID |
| `schedule_id` | `BIGINT` | FK, NOT NULL | 일정 ID |
| `user_id` | `BIGINT` | FK, NULL | 대상 사용자 |
| `project_id` | `BIGINT` | FK, NULL | 대상 프로젝트 |
| `ancestor_team_id` | `BIGINT` | FK, NULL | 조상 팀 ID |
| `team_id` | `BIGINT` | FK, NULL | 자손 팀 ID |
| `target_type` | `VARCHAR(30)` | NOT NULL | `USER`, `PROJECT`, `TEAM` |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 4.4 `projects`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `project_id` | `BIGINT` | PK | 프로젝트 ID |
| `project_name` | `VARCHAR(50)` | NOT NULL | 프로젝트명 |
| `description` | `TEXT` | NULL | 설명 |
| `status` | `VARCHAR(30)` | NULL | 준비·진행·보류·완료 등 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 4.5 `projects_members`

Project와 User의 N:M Mapping이다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `project_member_id` | `BIGINT` | PK | 참여 ID |
| `project_id` | `BIGINT` | FK, NOT NULL | 프로젝트 ID |
| `user_id` | `BIGINT` | FK, NOT NULL | 사용자 ID |
| `joined_at` | `DATETIME` | DEFAULT NOW | 참여일시 |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

## 5. 자원 및 예약 관리

### 5.1 `rooms`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `room_id` | `BIGINT` | PK | 회의실 ID |
| `room_name` | `VARCHAR(100)` | NOT NULL | 회의실명 |
| `capacity` | `BIGINT` | NULL | 수용 인원 |
| `location` | `VARCHAR(255)` | NULL | 위치 |
| `Field` | `VARCHAR(255)` | NULL | 장비 등 비정형 특성 예비 Field |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

### 5.2 `rooms_reservations`

회의실 예약과 일정 연결을 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `reservation_id` | `BIGINT` | PK | 예약 ID |
| `room_id` | `BIGINT` | FK, NOT NULL | 회의실 ID |
| `schedule_id` | `BIGINT` | FK, NOT NULL | 일정 ID |
| `title` | `VARCHAR(200)` | NOT NULL | 예약 제목 |
| `start_at` | `DATETIME` | NOT NULL | 시작일시 |
| `end_at` | `DATETIME` | NOT NULL | 종료일시 |
| `status` | `VARCHAR(30)` | NULL | 대기·완료·취소 등 |
| `cancelled_at` | `DATETIME` | NULL | 취소일시 |
| `count` | `INT` | NULL | 예상 인원 |
| `Field` | `VARCHAR(255)` | NULL | 비고·특이사항 예비 Field |
| `created_at` | `DATETIME` | DEFAULT NOW | 생성일시 |
| `updated_at` | `DATETIME` | DEFAULT NOW | 수정일시 |

## 6. 기준선 관계 요약

```text
positions 1 --- N users N --- 1 teams
users 1 --- 1 user_credentials
users 1 --- N user_tokens
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

## 7. 검토 대기 항목

다음 항목은 기준선에 반영하지 않았으며 전체 문서 작성 후 Schema Review에서 검토한다.

- PostgreSQL에 맞는 `DATETIME` 타입 정합성
- `role_id2`, `projects_members`, `rooms_reservations`, `schedules_details` 등 명칭과 오탈자
- `employee_number`, 역할명, 권한명 및 Mapping 조합의 UNIQUE 제약
- `schedule_details` 관계가 1:1인지 1:N인지
- 확정된 일정 규칙을 표현할 Schema: 유형은 하나, 팀·프로젝트·참석자는 각각 다중 연결, 유형별 공개 대상 제한
- `schedule_targets`의 다형 관계와 CHECK/FK 무결성
- 일정과 회의실 예약의 관계 및 중복 저장된 제목·시간
- 회의실 중복 예약의 DB 수준 제약
- Refresh Token 원문 저장 또는 Hash 저장 정책
- Status 허용값과 상태 전이
- 확정된 삭제 정책을 표현할 상태·비활성화·Soft Delete 컬럼: 직원·팀 비활성화, 일정·예약 취소 또는 Soft Delete
- `Field` 예비 컬럼과 회의실 장비 모델
- `capacity`, `level`, `content`, `location` 타입과 길이
- Index, Foreign Key 삭제 정책과 감사 필드 제약
- 종일 일정, 색상 Label, 알림 설정과 업무 상태 관련 테이블

### 7.1 확정 정책

다음 정책은 팀 결정으로 확정됐지만 Initial Baseline ERD에는 아직 반영하지 않는다.

- 일정 유형은 `PERSONAL`, `TEAM`, `PROJECT` 중 정확히 하나다.
- 하나의 일정은 여러 참석자를 가질 수 있다.
- `TEAM` 일정은 여러 팀, `PROJECT` 일정은 여러 프로젝트와 연결될 수 있다.
- 개인 일정은 작성자와 참석자에게 공개한다.
- 팀 일정은 연결된 팀 소속 사용자와 참석자에게 공개한다.
- 프로젝트 일정은 연결된 프로젝트 참여자와 참석자에게 공개한다.
- 직원과 팀은 삭제하지 않고 비활성화한다.
- 일정과 예약은 취소 또는 Soft Delete하며 일반 기능에서 물리 삭제하지 않는다.

## 8. 변경 절차

1. 전체 문서 간 요구사항과 모델 충돌을 수집한다.
2. Schema Review에서 변경안을 작성한다.
3. 주요 결정은 ADR로 승인한다.
4. ERD와 이 문서를 함께 갱신한다.
5. 승인된 Migration을 작성하고 검증한다.
