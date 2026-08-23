# 작업 계획: calendar-10

## 1. 기본 정보

### 사용자 요청

캘린더 일정에서 참석자 추가 기능을 실제 데이터로 테스트할 수 있도록 사용자 데이터를 DB에 추가하는 Migration 파일을 저장소에 반영한다.

### 작업 목적

공유 개발 DB에 참석자 검색과 다중 선택을 확인할 수 있는 명확한 합성 사용자가 없어 캘린더 참석자 추가 기능을 수동 검증하기 어려운 문제를 해결한다. 기존 `users` Schema는 변경하지 않고 신규 Flyway Versioned Migration으로 검색 가능한 `ACTIVE` 사용자 프로필만 추가한다. 로그인 가능한 개발 계정이나 비밀번호·인증정보는 생성하지 않으며, 기존의 로컬 전용 직원 계정 등록 기능과 운영 인증 정책을 변경하지 않는다.

### 작업 유형

- chore

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`, `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/DB_SCHEMA.md`, `docs/adrs/0002-calendar-migration-and-postgresql-verification.md`, `docs/adrs/0003-flyway-migration-version-management.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `CAL-ATTENDEE-DATA-001`: 신규 Migration 적용 후 참석자 검색에 사용할 수 있는 합성 `ACTIVE` 사용자 프로필이 3명 이상 존재한다.
- `CAL-ATTENDEE-DATA-002`: 각 합성 사용자는 기존 팀과 직급을 FK로 참조하며, 사번과 이메일이 서로 다르고 이름만으로 테스트 데이터임을 식별할 수 있다.
- `CAL-ATTENDEE-DATA-003`: Migration은 `user_credentials`, 비밀번호 Hash, Role 또는 로그인 가능한 인증정보를 생성하지 않는다.
- `CAL-ATTENDEE-DATA-004`: 이미 적용된 Migration은 변경하지 않고 ADR-0003의 UTC Timestamp 전역 Version 규칙을 따르는 신규 Migration 파일만 추가한다.
- `CAL-ATTENDEE-DATA-005`: 빈 PostgreSQL 전체 Migration 적용과 기존 기준 데이터가 있는 PostgreSQL의 증분 적용에서 사용자·조직 데이터와 Flyway History가 보존된다.
- `CAL-ATTENDEE-DATA-006`: 참석자 검색 API는 추가된 합성 사용자를 검색 결과의 기존 최소 필드로 반환하며 비활성 사용자 제외, 인증·인가 및 개인정보 최소화 계약에 회귀가 없다.
- `CAL-ATTENDEE-DATA-007`: `backend/DB_SCHEMA.md`는 로그인 계정 생성과 참석자 검색용 비인증 사용자 기준 데이터의 경계를 실제 Migration과 일치하게 설명한다.

### 정책 충돌 및 적용 경계

- 현재 `backend/DB_SCHEMA.md`와 `SyntheticAuthRemovalTest`는 “Development account creation is not a migration or a startup fixture.”를 요구한다.
- 이 Plan은 사용자 요청에 따라 그 문구를 삭제해 개발 계정의 Migration 생성을 허용하는 작업이 아니다. 로그인 가능한 개발 계정은 계속 로컬·테스트 Profile의 명시적 opt-in 등록 기능으로만 생성한다.
- 신규 Migration은 캘린더 참석자 검색을 위한 비인증 합성 사용자 프로필만 생성한다. `user_credentials` 행, 평문 비밀번호, 비밀번호 Hash, Token, Session, Role 부여는 모두 금지한다.
- 이 경계와 다른 로그인 가능 계정 또는 운영 사용자 데이터가 필요하면 구현을 중단하고 별도 사람 승인을 받는다.

---

## 2. 실행 Task

### Task 1. 참석자 검색용 합성 사용자 Migration 및 계약 동기화

#### 선행 Task

- `없음`

#### 작업 목적

기존 인증·사용자 Schema와 조직 기준 데이터를 참조하여 캘린더 참석자 검색에서 사용할 수 있는 비인증 합성 사용자 프로필을 안전한 신규 Migration으로 추가하고, 문서와 회귀 테스트를 실제 데이터 경계에 맞춘다.

#### 수정 가능 경로

- `backend/src/main/resources/db/migration`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/auth/security/SyntheticAuthRemovalTest.java`
- `backend/DB_SCHEMA.md`

#### 수정 금지 경로

- `backend/src/main/java`
- `backend/src/main/resources/application.yml`
- `backend/API.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/adrs`
- `SECURITY.md`
- `backend/src/main/resources/db/migration/V20260812000001_00__auth_create_authentication_tables.sql`
- `backend/src/main/resources/db/migration/V20260812000002_00__calendar_create_calendar_schema.sql`
- `backend/src/main/resources/db/migration/V20260812000003_00__calendar_add_creation_constraints.sql`
- `backend/src/main/resources/db/migration/V20260812000004_00__project_add_membership_contract.sql`
- `backend/src/main/resources/db/migration/V20260812000005_00__user_align_user_domain_schema.sql`
- `backend/src/main/resources/db/migration/V20260818072947_00__room_create_room_schema.sql`
- `backend/src/main/resources/db/migration/V20260819030558_00__organization_insert_shared_reference_data.sql`
- `backend/src/main/resources/db/migration/V20260819090000_00__room_add_reservation_cancellation_audit.sql`
- `backend/src/main/resources/db/migration/V20260820000000_00__room_insert_initial_rooms.sql`
- `backend/src/main/resources/db/migration/V20260820095523_00__team_add_hierarchy_closure.sql`

#### 구현 항목

- [ ] Red: 빈 PostgreSQL에 전체 Migration을 적용했을 때 식별 가능한 합성 `ACTIVE` 사용자가 3명 이상 생성되고 각 사용자의 사번·이메일이 유일하며 기존 팀·직급 FK가 유효해야 한다는 PostgreSQL Migration 테스트를 먼저 작성하고, 신규 Migration이 없어 실패하는 결과를 기록한다.
- [ ] Red: 기존 조직 및 사용자 기준 데이터가 있는 PostgreSQL에 증분 Migration을 적용해도 기존 행이 변경·삭제되지 않고 합성 사용자가 중복되지 않으며 Flyway `validate`가 통과해야 한다는 실패 테스트를 먼저 작성한다.
- [ ] Red: 참석자 검색 API가 추가된 합성 사용자를 이름 또는 사번으로 검색해 기존 `userId`, `displayName` 최소 응답으로 반환하고, 비활성 사용자는 제외하며 인증·인가 계약을 유지한다는 회귀 테스트를 작성한다.
- [ ] Red: 합성 사용자에게 `user_credentials`, Role, Token 또는 Session 데이터가 생성되지 않고, 운영 코드나 Startup Initializer를 통한 고정 계정 생성이 다시 도입되지 않는다는 보안 경계 테스트를 작성한다.
- [ ] Green: 구현 시점의 UTC를 사용해 `VyyyyMMddHHmmss_NN__user_insert_calendar_attendee_test_data.sql` 형식의 저장소 전체에서 유일한 신규 Flyway Versioned Migration을 생성한다.
- [ ] Green: Migration은 실제 개인정보로 오인되지 않는 합성 이름, 예약된 테스트용 이메일 도메인과 충돌 가능성이 낮은 테스트 사번을 사용해 `users`에 `ACTIVE` 프로필을 3명 이상 추가한다.
- [ ] Green: 사용자 행은 기존 조직 기준 데이터의 팀·직급을 이름으로 조회해 FK를 연결하되 생성된 숫자 ID를 외부 계약으로 고정하지 않는다. 필수 참조 데이터가 없거나 모호해 안전하게 연결할 수 없으면 부분 삽입하지 않고 Migration을 실패시킨다.
- [ ] Green: Migration은 `user_credentials`, Role, 인증정보 또는 캘린더 일정·참석 관계를 삽입하지 않으며 기존 사용자와 적용된 Migration의 이름·내용·Checksum을 변경하지 않는다.
- [ ] Green: 재적용·충돌 방어 기준은 `employee_number`와 `email`의 기존 UNIQUE 계약을 따르고, 동일 테스트 식별자가 이미 같은 의미로 존재하는 경우 중복 생성하지 않으며 다른 데이터와 충돌하면 덮어쓰지 않고 실패한다.
- [ ] Green: `backend/DB_SCHEMA.md`에 참석자 검색용 비인증 합성 사용자 기준 데이터의 목적, 식별자, 참조 조직, 비인증 경계와 제거·변경 시 신규 보정 Migration을 사용한다는 정책을 기록한다.
- [ ] Refactor: Migration Test Fixture와 검증 Query의 중복만 최소 범위에서 정리하고, 기존 Synthetic Startup Fixture 제거 및 개발 계정 opt-in 경계를 약화하지 않는다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 DB 제약·보안 단언 또는 검증 범위를 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] 저장소 루트에서 Migration 파일명이 ADR-0003 정규식 `^V[0-9]{14}_[0-9]{2}__[a-z0-9]+_[a-z0-9_]+\.sql$`을 만족하고 Version이 전체 Migration에서 유일한지 확인한다.
- [ ] `backend`에서 신규 또는 확장한 PostgreSQL Migration 테스트를 실행하여 빈 DB 전체 적용, 기존 기준 데이터 증분 적용, FK·UNIQUE·기존 데이터 보존, 합성 사용자 중복 방지와 `flyway validate`를 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.schedule.controller.ScheduleAttendeeControllerTest" --tests "com.flowbi.domain.auth.security.SyntheticAuthRemovalTest"`를 실행하여 참석자 검색과 인증 Fixture 경계를 검증한다.
- [ ] `backend`에서 `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`를 순서대로 실행한다.
- [ ] 저장소 루트에서 `rg -n -i "password|password_hash|credential|token|session|secret" backend/src/main/resources/db/migration/<신규-migration-파일명>`을 실행하고 인증정보 삽입이 없음을 검토한다.
- [ ] 저장소 루트에서 `git diff --check -- backend/src/main/resources/db/migration backend/src/test/java/com/flowbi/domain/schedule backend/src/test/java/com/flowbi/domain/auth/security/SyntheticAuthRemovalTest.java backend/DB_SCHEMA.md`를 실행하여 Patch 형식과 변경 범위를 검증한다.

#### 완료 조건

- `CAL-ATTENDEE-DATA-001`부터 `CAL-ATTENDEE-DATA-007`까지 모두 충족해야 한다.
- Red → Green → Refactor 실행 순서와 각 단계의 실패·성공 결과가 작업 기록에 남아야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- 신규 Migration 적용 후 참석자 검색에서 합성 사용자를 선택할 수 있어야 한다.
- 로그인 가능한 계정이나 비밀정보가 생성되지 않고 기존 로컬·테스트 개발 계정 등록 계약이 유지되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 사용자·조직·인증·캘린더 기능에 회귀 문제가 없어야 한다.
- DB Migration과 개인정보 경계 위험을 반영해 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 합성 사용자가 3명 미만이거나 참석자 검색에서 조회할 수 없음
- 실사용자 개인정보로 오인될 값, 중복 사번·이메일 또는 고정된 조직 숫자 ID를 사용함
- `user_credentials`, 비밀번호, 비밀번호 Hash, Token, Session 또는 Role을 생성함
- Production에서 로그인 가능한 고정 개발 계정 또는 Startup Fixture를 도입함
- 기존 사용자·조직 데이터를 갱신·삭제하거나 적용된 Migration을 수정함
- 빈 PostgreSQL 전체 적용, 기존 데이터 증분 적용, Flyway 검증, FK·UNIQUE 또는 데이터 보존 검증이 실패함
- 테스트 단언 삭제·약화, 필수 검증 실패 또는 3회 수정 후에도 같은 문제가 지속됨
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경이 발생함
- `quality_score`가 `90` 미만임

#### 제외 범위

- `users` 테이블, 제약조건, Index 또는 다른 DB Schema 변경
- 로그인 계정, 비밀번호, 권한, Role 또는 인증 정책 추가·변경
- 실제 직원 개인정보나 운영 데이터 추가
- 캘린더 참석자 검색 API 또는 Frontend 동작 변경
- 일정, 일정 참석 관계, 팀, 직급 또는 프로젝트 기준 데이터 추가
- 기존 Migration 수정, `flyway repair`, `outOfOrder=true`, DB History 수동 변경
- Migration 파일의 Git commit, 원격 저장소 push, PR 생성 또는 공유·운영 DB 직접 적용

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- Task 1의 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 신규 Migration, PostgreSQL 검증, 참석자 검색 회귀 테스트와 `backend/DB_SCHEMA.md`가 동일한 합성 사용자 데이터 경계를 설명해야 한다.
- 기존 로그인 계정 생성 정책, 인증·인가 및 개인정보 최소화 계약이 유지되어야 한다.
- 수정 범위가 Task 1의 `수정 가능 경로`를 벗어나지 않아야 한다.
- Task 1의 `수정 금지 경로`에 변경이 없어야 한다.
- 실행하지 못한 검증이 있다면 이유와 남은 위험을 기록하고 완료로 처리하지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 구현 또는 검증 항목이 실패함
- 합성 사용자 프로필이 아닌 로그인 가능한 고정 계정이나 비밀정보가 Migration에 포함됨
- 기존 데이터 보존, DB 제약, Flyway History 또는 참석자 검색 계약에 회귀가 발생함
- 관련 Product Spec, Design Doc, Security 또는 승인된 ADR과 충돌함
- Task 1의 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 미실행 검증, 정책 충돌 또는 남은 문제가 사용자 확인 없이 방치되거나 완료로 보고됨
- 전체 `quality_score`가 `90` 미만임
