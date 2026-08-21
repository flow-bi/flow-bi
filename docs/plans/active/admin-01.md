# 작업 계획: admin-01

## 1. 기본 정보

### 사용자 요청

화면을 제외한 관리자 API, 데이터베이스, 권한과 백엔드 테스트를 확정 문서 계약에 따라 구현한다.

### 작업 목적

`ADMIN`, `SYSTEM_ADMIN`, `HR_ADMIN`의 고정 전역 RBAC를 구축하고 직원·팀·역할 관리의 비파괴 상태 전이, 대상 보호와 세션 무효화를 TDD로 구현한다. 시스템 운영 기능 자체는 후속 Plan으로 남기되 필요한 역할·권한 기준 데이터는 이 Plan에서 만든다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/admin.md`, `docs/product-specs/system-admin.md`, `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- Security: `SECURITY.md`
- Backend Contract: `backend/API.md`, `backend/DB_SCHEMA.md`
- Quality: `CONVENTIONS.md`, `backend/BACKEND.md`, `docs/quality/quality-model.md`

### 공통 실행 원칙

- 각 Task는 Red → Green → Refactor 순서와 실행 결과를 기록한다.
- 기존 Migration을 수정하지 않고 새 Flyway Version만 추가한다.
- 실제 PostgreSQL에서 Migration과 제약조건을 검증하며 H2 통과만으로 완료하지 않는다.
- 미인증은 401, 권한 부족은 403, 대상 없음은 404, 상태 충돌은 안정적인 409 오류 코드로 반환한다.
- UI 표시를 보안 경계로 사용하지 않고 Controller와 Method Security에서 권한을 검증한다.
- 비밀번호·해시·세션 ID·CSRF 값과 과도한 개인정보를 응답이나 로그에 남기지 않는다.
- 역할 부여·회수의 시각, 행위자, 이전 상태를 저장하거나 로그에 남기는 구현은 금지한다.

---

## 2. 실행 Task

### Task 1. 관리자 RBAC와 최초 ADMIN Bootstrap

#### 선행 Task

- 없음

#### 구현 항목

- [ ] Red: 역할·권한 Code와 표시 이름 UNIQUE, `UNIQUE(role_id, permission_id)`, `UNIQUE(user_id, role_id)`, FK `RESTRICT`, 고정 Seed, 권한 합집합과 기본 거부의 실패 테스트를 작성한다.
- [ ] Red: 배포 값 누락·중복 사번/이메일·없는 팀/직급·비활성 팀 참조에서 Bootstrap Migration이 실패하는 테스트를 작성한다.
- [ ] Green: `ADMIN`, `SYSTEM_ADMIN`, `HR_ADMIN`과 8개 권한을 새 Migration으로 생성한다. `ADMIN`은 8개 전부, `SYSTEM_ADMIN`은 시스템 운영 4개, `HR_ADMIN`은 `USER_MANAGE`, `TEAM_MANAGE`를 명시적으로 매핑한다.
- [ ] Green: `role_permissions`, `user_roles`는 Surrogate PK와 FK 조합 UNIQUE만 가지며 생성·수정·부여 시각 컬럼과 역할 변경 감사 테이블을 만들지 않는다.
- [ ] Green: 배포 환경에서 주입한 사번·이름·이메일·기존 활성 팀 ID·기존 직급 ID·BCrypt 해시로 `ACTIVE + EMPLOYED`, `mustChangePassword=true`, `ADMIN` 최초 계정을 만든다. 실제 값이나 가짜 팀·직급을 저장소에 추가하지 않는다.
- [ ] Green: 로그인 시 DB의 현재 역할별 권한 합집합을 `GrantedAuthority`로 로딩하고 조회 장애 시 기본 거부한다.
- [ ] Refactor: 표시 이름이 아닌 안정적인 Code를 중앙 정의하고 인증·역할 도메인 경계를 정리한다.

#### 검증 및 완료 조건

- [ ] 역할·권한 Persistence와 인증 테스트, PostgreSQL Migration 검증을 통과한다.
- [ ] 세 역할의 권한 집합이 문서와 정확히 같고 `SYSTEM_ADMIN + HR_ADMIN`이 `ADMIN` 권한을 얻지 않는다.
- [ ] Migration 재실행 안전성, 기존 데이터 보존, 비밀정보 비커밋을 검증한다.

#### 제외 범위

- 시스템 상태·로그·오류, 테마와 회의실 자원 API 구현
- 조직 범위 역할과 동적 역할·권한 CRUD

---

### Task 2. 역할 조회·부여·회수 API와 대상 보호

#### 선행 Task

- Task 1

#### 구현 항목

- [ ] Red: `GET /api/users/{userId}/roles`, `POST`·`DELETE /api/users/{userId}/roles/{roleCode}`의 401·403·404, 정상 처리, 알 수 없는 Code, 비활성·퇴직 대상, 멱등성 실패 테스트를 작성한다.
- [ ] Red: 마지막 `ACTIVE + EMPLOYED + ADMIN`의 회수에 `409 LAST_ADMIN_REQUIRED`가 발생하고 동시 요청에서도 마지막 관리자가 보존되는 테스트를 작성한다.
- [ ] Green: 모든 역할 API에 `ROLE_MANAGE`를 요구하고 역할은 `ACTIVE + EMPLOYED` 사용자에게만 부여한다.
- [ ] Green: 동일 역할 재부여와 미보유 역할 회수는 멱등 성공으로 처리한다.
- [ ] Green: 역할 변경과 대상 세션의 원자적 논리 차단을 조정하고, Redis 물리 삭제는 멱등 후처리한다. 실패 폐쇄 계약을 유지한다.
- [ ] Green: 역할 변경 이력 API·감사 Entity·이벤트 로그를 추가하지 않는다.
- [ ] Refactor: 역할 대상 잠금과 마지막 총 관리자 Guard를 상태 변경 Task에서도 재사용할 수 있게 분리한다.

#### 검증 및 완료 조건

- [ ] 권한·멱등성·경합·세션 무효화 통합 테스트를 통과한다.
- [ ] DB와 애플리케이션 로그에서 역할 변경 시각·행위자·이전 상태가 생성되지 않는다.

---

### Task 3. 직원 등록·조회·일반 정보 수정 API

#### 선행 Task

- Task 1

#### 구현 항목

- [ ] Red: `POST /api/users`, `GET /api/users`, `GET`·`PUT /api/users/{userId}`의 인증·권한·검증·중복·Pagination·개인정보 최소화 테스트를 작성한다.
- [ ] Green: `USER_MANAGE`를 요구하고 신규 직원을 `ACTIVE + EMPLOYED`, `mustChangePassword=true`로 생성한다.
- [ ] Green: 등록 요청에서 임시 비밀번호를 받지 않고 서버가 CSPRNG로 대문자·소문자·숫자·특수문자를 포함한 20자 값을 생성해 BCrypt 해시만 저장한다.
- [ ] Green: 평문은 `Cache-Control: no-store` 성공 응답에서 한 번만 반환하고 로그·세션·재조회 응답에 포함하지 않는다.
- [ ] Green: 일반 정보 수정에서 사번, 계정·재직 상태, Credential과 역할을 변경하지 못하게 한다.
- [ ] Green: 관리자 역할 보유자 수정에는 `USER_MANAGE + PRIVILEGED_ACCOUNT_MANAGE`를 모두 요구한다.
- [ ] Refactor: 등록·조회·수정 DTO와 대상 권한 Guard를 분리하고 N+1을 방지한다.

#### 검증 및 완료 조건

- [ ] 직원 API의 Security MockMvc, Transaction, Repository Query 테스트를 통과한다.
- [ ] `SYSTEM_ADMIN`은 직원 목록을 조회하지 못하고 별도 최소 계정 상태 API만 사용할 수 있어야 한다.

---

### Task 4. 직원 계정 상태·퇴직·비밀번호 초기화 API

#### 선행 Task

- Task 2, Task 3

#### 구현 항목

- [ ] Red: `PATCH /api/users/{userId}/account-status`, `PATCH /api/users/{userId}/employment-status`, `POST /api/users/{userId}/password-reset`의 상태 전이, 권한, 세션, 실패 Rollback 테스트를 작성한다.
- [ ] Green: `INACTIVE`는 가역 접근 차단으로 처리하고 재활성화 시 새 일회용 임시 비밀번호와 `mustChangePassword=true`를 설정한다.
- [ ] Green: 퇴직은 한 트랜잭션에서 `TERMINATED + INACTIVE`로 바꾸고 모든 세션을 무효화한다. `TERMINATED` 복구는 거부하며 재입사에는 새 사용자 등록을 요구한다.
- [ ] Green: 비밀번호 초기화도 Task 3과 같은 서버 생성·해시·일회 반환 계약을 사용한다.
- [ ] Green: 관리자 역할 보유 대상에는 두 권한을 요구하고 마지막 총 관리자 비활성화·퇴직에는 `LAST_ADMIN_REQUIRED`를 반환한다.
- [ ] Green: 본인 상태 변경도 같은 Guard를 적용하고 본인 비밀번호에는 일반 비밀번호 변경 API를 사용하게 한다.
- [ ] Refactor: 계정·재직 상태를 분리하고 세션 무효화와 임시 비밀번호 발급을 공통 Use Case로 정리한다.

#### 검증 및 완료 조건

- [ ] 상태 전이표, 동시성, 세션 실패 폐쇄, 민감정보 비노출 테스트를 통과한다.
- [ ] 연차·휴가·휴직 상태와 직원 물리 삭제를 구현하지 않는다.

---

### Task 5. 팀 상태와 계층 영속 계약

#### 선행 Task

- Task 1

#### 구현 항목

- [ ] Red: `teams.status` CHECK와 Index, 기존 팀 `ACTIVE` Backfill, Closure 무결성과 기존 데이터 보존 테스트를 작성한다.
- [ ] Green: `ACTIVE`, `INACTIVE`만 허용하고 팀과 Closure 경로를 물리 삭제하지 않는다.
- [ ] Green: 비활성 팀을 일반 조직도·배정·이동·하위 팀 생성 후보에서 제외하는 Repository 계약을 구현한다.
- [ ] Refactor: 팀 상태와 계층 조회 규칙을 한 경계에 모은다.

#### 검증 및 완료 조건

- [ ] 실제 PostgreSQL에서 Migration, CHECK, Index와 Backfill을 검증한다.

---

### Task 6. 팀 생성·조회·정보·계층 수정 API

#### 선행 Task

- Task 5

#### 구현 항목

- [ ] Red: `GET /api/teams`, `POST /api/teams`, `PUT /api/teams/{teamId}`의 `TEAM_MANAGE`, 이름 충돌, 상위 팀, 순환, Transaction과 N+1 테스트를 작성한다.
- [ ] Green: 새 팀은 `ACTIVE`로 생성하고 활성 상위 팀만 지정할 수 있게 한다.
- [ ] Green: 비활성 팀을 일반 목록과 직원 이동 후보에서 제외하며 관리 조회는 상태를 명시적으로 반환한다.
- [ ] Refactor: Closure 갱신을 원자적 Use Case로 유지한다.

#### 검증 및 완료 조건

- [ ] 계층 생성·이동·순환 거부·개인정보 비노출 테스트를 통과한다.

---

### Task 7. 팀 비활성화·재활성화 API

#### 선행 Task

- Task 6

#### 구현 항목

- [ ] Red: `PATCH /api/teams/{teamId}/status`의 인증·권한·멱등성, 활성 사용자, 활성 하위 팀, 비활성 상위 팀과 경합 테스트를 작성한다.
- [ ] Green: 활성 사용자나 활성 하위 팀이 있으면 `409 TEAM_IN_USE`로 거부한다.
- [ ] Green: 재활성화는 상위 팀이 없거나 활성일 때만 허용하고 하위 팀·사용자를 자동 재활성화하지 않는다.
- [ ] Green: 팀 또는 Closure 레코드를 삭제하지 않고 상태만 전환한다.
- [ ] Refactor: 비활성화 선행조건을 잠금 범위와 함께 명시한다.

#### 검증 및 완료 조건

- [ ] 계층·소속 경합과 Transaction Rollback 테스트를 통과한다.
- [ ] 팀 `DELETE` Endpoint가 없어야 한다.

---

### Task 8. 시스템 관리자 최소 계정 상태 조회

#### 선행 Task

- Task 1, Task 3

#### 구현 항목

- [ ] Red: `GET /api/system/account-statuses`의 `ACCOUNT_STATUS_READ`, Pagination, 필터, 최소 데이터와 401·403 테스트를 작성한다.
- [ ] Green: 사번, 계정 상태와 재직 상태만 반환하는 별도 DTO를 사용한다.
- [ ] Green: `SYSTEM_ADMIN`이 직원 상세·수정·팀·역할·비밀번호 API에 접근하지 못하게 한다.
- [ ] Refactor: 직원 관리 조회와 영속 Query만 안전하게 공유하고 응답 경계를 분리한다.

#### 검증 및 완료 조건

- [ ] 이름·이메일·전화번호·직급·팀·역할 상세가 응답에 포함되지 않는다.
- [ ] 시스템 상태·로그·오류, 테마와 회의실 자원 구현은 후속 Plan으로 남긴다.

---

### Task 9. 관리자 백엔드 계약 통합 검증

#### 선행 Task

- Task 1~8

#### 구현 항목

- [ ] Red: 일반 사용자, `HR_ADMIN`, `SYSTEM_ADMIN`, 두 역할 동시 보유자, `ADMIN`의 허용·거부 행렬을 실제 Security Filter Chain으로 검증한다.
- [ ] Red: 최초 총 관리자 생성부터 추가 `ADMIN` 부여, 직원·팀 상태 전이와 마지막 총 관리자 보호까지 독립 인수 흐름을 작성한다.
- [ ] Green: OpenAPI가 문서의 Endpoint, 권한, 상태 코드, 일회용 임시 비밀번호 응답과 `no-store`를 표현하게 한다.
- [ ] Green: 역할 변경 이력 Endpoint와 직원·팀 DELETE Endpoint가 노출되지 않는 계약 테스트를 추가한다.
- [ ] Refactor: `backend/API.md`, `backend/DB_SCHEMA.md`와 실제 구현의 최종 차이만 동기화한다.

#### 검증 및 완료 조건

- [ ] 관리자 통합 인수·OpenAPI·전체 Backend 테스트, 정적 분석과 빌드를 통과한다.
- [ ] G1~G7 품질 Gate와 `quality_score >= 90`을 충족한다.

---

## 3. 전체 완료 조건

- 세 역할과 8개 권한의 Seed·매핑·인가 동작이 문서와 정확히 일치한다.
- 최초 `ADMIN` Bootstrap이 비밀정보를 저장소에 남기지 않고 실패 조건에서 안전하게 중단된다.
- 관리자 역할 대상 보호, 마지막 총 관리자 보호와 세션 무효화가 모든 관련 API에 일관되게 적용된다.
- 직원은 계정·재직 상태, 팀은 활성 상태를 분리해 비파괴적으로 관리된다.
- 임시 비밀번호는 서버 생성·해시 저장·일회 응답 계약을 지킨다.
- 역할 변경 이력 데이터·로그·API, 직원·팀 물리 삭제가 없다.
- TDD 기록과 실제 PostgreSQL 검증을 포함한 모든 품질 Gate가 통과한다.

## 4. 전체 실패 조건

- 역할명, UI 표시 또는 암묵적 `ADMIN` 우회로 권한을 허용함
- `SYSTEM_ADMIN + HR_ADMIN`을 `ADMIN`으로 취급함
- 관리자 역할 보유자나 마지막 총 관리자 Guard를 우회함
- 역할 변경 이력을 저장·로그하거나 민감정보를 노출함
- 직원·팀을 물리 삭제하거나 `TERMINATED`를 복원함
- 기존 Migration 수정, PostgreSQL 검증 누락, 테스트 약화 또는 실패 은폐

## 5. 후속 작업

- `SYSTEM_MONITOR` 기반 상태·로그·오류 조회 API
- `THEME_MANAGE` 기반 회사 테마 API
- `ROOM_RESOURCE_MANAGE` 기반 회의실 사진·장비 API
- 최초 관리자 장애 시 승인된 긴급 복구 Runbook
