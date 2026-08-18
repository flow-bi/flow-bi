# 작업 계획: loginAuth-02

## 1. 기본 정보

### 사용자 요청

auth 도메인에 집중된 사용자, 직급, 팀 책임을 기존 user, position, team 도메인으로 분리한다. 승인된 PostgreSQL 인증 기준선에 맞춰 DB 생성과 JPA 매핑을 검증하고, Service, Controller, DTO, Repository, Entity를 각 도메인의 책임에 맞게 배치하여 auth가 로그인, 자격정보, 비밀번호, 세션과 보안 책임만 갖도록 정리한다.

### 작업 목적

`domain.auth.persistence`에 함께 존재하는 사용자·팀·직급 영속 모델과 Repository를 승인된 도메인 경계로 이동하고, 인증 기능은 user 도메인의 명시적인 Service를 통해 사용자 정보를 사용하도록 의존 방향을 바로잡는다. 기존 Flyway V1의 `positions`, `teams`, `users`, `user_credentials` 생성 계약과 인증·세션 정책은 변경하지 않으며, 확정된 사용자 상세 조회 계약을 user 도메인의 Controller, Service, DTO 계층으로 구현한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`, `docs/product-specs/organization-chart.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/AGENTS.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 사용자·팀·직급 영속 책임과 인증 의존성 분리

#### 선행 Task

- 없음

#### 작업 목적

기존 PostgreSQL 인증 기준선의 테이블과 관계는 유지하면서 `AuthUser`, `Team`, `Position` 및 각 Repository의 소유권을 user, team, position 도메인으로 옮긴다. auth에는 `UserCredential`과 인증 유스케이스만 남기고, 로그인과 테스트 Fixture가 다른 도메인의 Repository를 직접 조정하지 않도록 명시적인 도메인 Service 경계로 협력하게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth/login`
- `backend/src/main/java/com/flowbi/domain/auth/password`
- `backend/src/main/java/com/flowbi/domain/auth/persistence`
- `backend/src/main/java/com/flowbi/domain/auth/fixture`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/java/com/flowbi/domain/team`
- `backend/src/main/java/com/flowbi/domain/position`
- `backend/src/test/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration/V1__create_authentication_tables.sql`
- `frontend`
- `docs`

#### 구현 항목

- [ ] Red: PostgreSQL Testcontainers에서 Flyway V1이 `positions`, `teams`, `users`, `user_credentials`를 생성하고 필수 FK, `users.employee_number` UNIQUE, `user_credentials.user_id` UNIQUE와 1:1 관계를 보장하는 실패 테스트를 먼저 작성하거나 현재 테스트를 도메인 분리 목표에 맞게 강화하고 실패 결과를 기록한다.
- [ ] Red: auth가 user, team, position Repository를 직접 소유하거나 로그인 Service가 user Repository를 직접 참조하는 현재 결합을 드러내는 단위·통합 테스트를 작성하고 의도한 이유로 실패하는지 확인한다.
- [ ] Green: `Position` Entity와 Repository를 기존 `domain.position/entity`, `domain.position/repository`에, `Team` Entity와 Repository를 기존 `domain.team/entity`, `domain.team/repository`에 이동한다.
- [ ] Green: `AuthUser`를 `User`로 정리하여 기존 `domain.user/entity`와 `domain.user/repository`가 `users` 테이블의 유일한 영속 소유자가 되게 하고, team·position 연관과 식별자·사번·이름·상태 매핑을 승인된 기준선에 맞춘다.
- [ ] Green: `UserCredential` Entity와 Repository는 auth에 유지하고 user와의 1:1 FK, 비밀번호 Hash, `mustChangePassword`만 인증 영속 책임으로 보존한다. Entity를 Controller 응답이나 세션 정보로 직접 노출하지 않는다.
- [ ] Green: 로그인은 사번으로 필요한 최소 사용자 인증 정보를 반환하는 user 도메인 Service를 통해 협력하고, auth Service가 user Repository를 직접 참조하지 않도록 변경한다. 기존 내부 `userId` Principal, 비밀번호 변경 강제, 실패 폐쇄 정책은 유지한다.
- [ ] Green: synthetic 인증 Fixture는 각 도메인의 Service 경계를 통해 user·team·position을 준비하고 auth는 자격정보 생성만 담당하도록 분리한다. 운영 Profile 차단과 런타임 주입 규칙은 변경하지 않는다.
- [ ] Refactor: 옮긴 기존 타입과 Repository를 auth에서 제거하고, 순환 의존·중복 Entity·중복 Repository·빈 계층 타입 없이 package와 실제 파일 경로를 일치시킨다.
- [ ] 구현 문제로 검증이 실패하면 같은 오류당 최초 실행을 포함해 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] PostgreSQL Testcontainers 기반 Persistence 통합 테스트를 지정 실행하여 Flyway V1 적용, JPA Entity 매핑, FK·UNIQUE·1:1 제약과 user-team-position 조회를 확인한다.
- [ ] 로그인 Service 단위 테스트와 로그인·최초 비밀번호 변경·세션 관련 인증 회귀 테스트를 지정 실행하여 FR-009, NFR-001, NFR-002가 유지되는지 확인한다.
- [ ] Fixture 통합 테스트를 지정 실행하여 local/test 조건에서만 데이터가 생성되고 운영 Profile에서는 활성화되지 않는지 확인한다.
- [ ] `./gradlew spotlessCheck`로 변경한 Java 코드의 정적 형식을 검증한다.
- [ ] Red → Green → Refactor 단계별 명령, 실패·성공 결과와 재시도 횟수를 Task 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- Mandatory Gate G1~G7 중 적용 항목이 모두 PASS여야 한다.
- `users`, `teams`, `positions` Entity와 Repository가 auth에 남아 있지 않아야 한다.
- auth의 로그인 Service가 user, team, position Repository를 직접 참조하지 않아야 하고 순환 의존이 없어야 한다.
- Flyway V1을 수정하지 않고 PostgreSQL에서 기준선 DB 생성과 제약 검증이 통과해야 한다.
- 기존 로그인, 비밀번호 변경 강제, 세션 Principal과 자격정보 연결에 회귀가 없어야 한다.
- 관련 문서 갱신 대상은 없다. 공개 API, DB 스키마 의미, 인증·권한 정책을 변경하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목 누락 또는 관련 테스트·정적 검증 실패
- Flyway V1 수정, 새 Schema 의미 도입 또는 승인되지 않은 Migration 추가
- 기존 데이터 관계, FK, UNIQUE 또는 자격정보 1:1 계약 훼손
- 인증 방식, 세션·Principal, 비밀번호 또는 권한 정책 변경
- auth에 사용자·팀·직급 Entity/Repository 책임이 남거나 역방향·순환 의존 발생
- 테스트 삭제, 단언 약화, 검증 우회 또는 3회 재시도 후 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- `quality_score`가 `90` 미만

#### 제외 범위

- DB 컬럼·제약 의미 변경, 새 Migration, 기존 데이터 전환과 파괴적 Schema 변경
- 팀·직급 CRUD API와 Controller·DTO 생성
- 역할·권한 모델, 세션·토큰 정책과 비밀번호 정책 변경
- 운영 데이터 생성 또는 운영 환경 배포

#### 작업 결과

`none`

#### 남은 문제

- 팀 계층, 직원 상태, 팀·직급 관리 API는 관련 계약과 Schema Review를 위한 별도 Plan이 필요하다.
- 실제 Schema 변경이 필요하다고 발견되면 구현하지 않고 `backend/DB_SCHEMA.md`의 변경 절차와 사람 승인 필요사항으로 기록한다.

---

### Task 2. user 도메인 사용자 상세 조회 계층 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

확정된 `GET /api/users/:userId` 계약을 user 도메인의 Controller, Service, Repository, Entity, DTO 계층으로 구현하여 인증된 사용자가 직원의 최소 기본정보와 소속 팀·직급을 조회할 수 있게 한다. 여기서 `:userId`는 사용자 ID 경로 변수를 뜻한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/resources/db/migration`
- `frontend`
- `docs`

#### 구현 항목

- [ ] Red: 인증된 사용자 정상 조회, 미인증 요청 `401`, 비밀번호 변경 필요 세션의 접근 거부, 존재하지 않거나 노출할 수 없는 사용자 `404`를 재현하는 API 실패 테스트를 먼저 작성하고 실패 결과를 기록한다.
- [ ] Red: 응답 DTO가 `userId`, `name`, 계정 상태, 팀 식별자·이름, 직급 식별자·이름만 반환하고 사번, 비밀번호·Hash, 자격정보, 세션 식별자와 미확정 프로필 정보를 노출하지 않는 테스트를 작성한다.
- [ ] Green: user Repository가 사용자와 team·position을 필요한 범위로 함께 조회하고, 읽기 전용 트랜잭션을 가진 사용자 상세 조회 Service가 `404` 규칙과 DTO 변환을 담당하도록 구현한다.
- [ ] Green: `GET /api/users/:userId` Controller는 HTTP 요청·응답만 담당하고 Entity를 직접 노출하지 않으며 `Cache-Control: no-store`와 기존 인증·비밀번호 변경 강제 정책을 준수하도록 구현한다.
- [ ] Refactor: user의 controller/service/repository/entity/dto 실제 폴더와 package를 일치시키고 N+1, Controller의 Repository 직접 접근, auth Entity·DTO 재사용과 불필요한 양방향 의존을 제거한다.
- [ ] 구현 문제로 검증이 실패하면 같은 오류당 최초 실행을 포함해 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] 사용자 상세 Service 단위 테스트를 지정 실행하여 정상 조회, `404`, DTO 최소 필드와 team·position 매핑을 확인한다.
- [ ] 사용자 상세 API 통합 테스트를 지정 실행하여 정상 응답, `401`, 비밀번호 변경 필요 상태의 `403`, `404`, `Cache-Control: no-store`와 민감정보 미노출을 확인한다.
- [ ] Repository 통합 테스트를 지정 실행하여 PostgreSQL에서 사용자·팀·직급 조회가 추가 쿼리 폭증 없이 동작하는지 확인한다.
- [ ] `./gradlew spotlessCheck`로 변경한 Java 코드의 정적 형식을 검증한다.
- [ ] Red → Green → Refactor 단계별 명령, 실패·성공 결과와 재시도 횟수를 Task 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- Mandatory Gate G1~G7 중 적용 항목이 모두 PASS여야 한다.
- Controller, Service, Repository, Entity, DTO 책임과 실제 package 경로가 분리되어야 한다.
- API 응답에 사번, 이메일, 전화번호, 비밀번호·Hash, 자격정보 또는 세션 식별자가 포함되지 않아야 한다.
- 기존 인증 정책을 우회하지 않고 NFR-001과 개인정보 최소화 기준을 충족해야 한다.
- 관련 문서 갱신 대상은 없다. 기존 `backend/API.md`와 `backend/DB_SCHEMA.md` 계약 범위 안에서 구현해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목 누락 또는 관련 테스트·정적 검증 실패
- Entity 직접 응답, 민감정보 노출, 미인증 접근 허용 또는 비밀번호 변경 강제 우회
- Controller의 Repository 직접 접근, auth DTO·Entity 재사용, N+1 또는 순환 의존 발생
- 공개 API 또는 DB 계약을 임의 변경하거나 미확정 프로필·상태 정책 구현
- 테스트 삭제, 단언 약화, 검증 우회 또는 3회 재시도 후 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- `quality_score`가 `90` 미만

#### 제외 범위

- 직원 목록·검색, 직원 등록·수정·삭제·비활성화 API
- 조직도·팀 계층 조회와 팀·직급 CRUD Controller/DTO
- 이메일, 전화번호, 프로필 이미지, 내선번호, 근무 상태를 추가·변경하는 Schema와 API
- 관리자 역할·권한과 프런트엔드 화면

#### 작업 결과

`none`

#### 남은 문제

- 조직도 전체 조회, 팀 계층과 직원 목록은 별도 사용자 동작 단위의 Plan으로 구현해야 한다.
- Product Spec의 프로필·내선번호·근무 상태 전체 제공은 승인된 Schema Review와 API 상세 계약 이후 계획해야 한다.

---

### Task 3. 통합 검증

#### 선행 Task

- `Task 2`

#### 작업 목적

PostgreSQL과 실제 Spring Security 구성을 사용하는 통합 시나리오 테스트를 구현하여, 분리된 user·team·position 영속 모델과 auth 인증 흐름이 로그인부터 사용자 상세 조회까지 하나의 기능 흐름으로 연결되는지 검증한다.

#### 수정 가능 경로

- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main`
- `frontend`
- `docs`

#### 구현 항목

- [ ] Red: PostgreSQL Testcontainers와 실제 Security Filter Chain을 사용해 사번 로그인 후 발급된 세션으로 사용자 상세를 조회하는 통합 테스트를 먼저 작성하고, 통합 Fixture 또는 경계 연결이 빠진 이유로 실패하는 결과를 기록한다.
- [ ] Green: 테스트 전용 데이터 준비를 통해 position, team, user, user_credentials 관계를 생성하고 로그인 성공, 내부 `userId` Principal, 사용자 상세 조회 성공과 최소 DTO 응답을 하나의 시나리오로 검증한다.
- [ ] Green: 잘못된 자격정보, 미인증 상세 조회, `mustChangePassword` 사용자의 상세 조회 거부, 존재하지 않는 사용자 조회가 각각 기존 오류 계약으로 실패하는 통합 시나리오를 구현한다.
- [ ] Refactor: 테스트가 구현 세부 메서드 호출이나 운영 비밀정보에 의존하지 않도록 공개 HTTP 동작과 DB 제약을 기준으로 정리하고, 중복 Fixture와 불필요한 Mock을 제거한다.
- [ ] 구현 문제로 검증이 실패하면 같은 오류당 최초 실행을 포함해 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] 새 PostgreSQL 인증→사용자 상세 통합 테스트를 지정 실행하여 정상·인증 실패·비밀번호 변경 강제·미인증·미존재 시나리오를 확인한다.
- [ ] `./gradlew spotlessCheck`로 새 통합 테스트의 정적 형식을 검증한다.
- [ ] Red → Green → Refactor 단계별 명령, 실패·성공 결과와 재시도 횟수를 Task 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- Mandatory Gate G1~G7 중 적용 항목이 모두 PASS여야 한다.
- PostgreSQL에서 로그인, 세션 Principal, user-team-position 관계와 사용자 상세 API가 실제 HTTP 흐름으로 연결되어야 한다.
- 비밀번호, Hash, Session ID와 불필요한 개인정보가 응답·로그·테스트 출력에 노출되지 않아야 한다.
- 테스트를 위해 운영 코드, 공개 API, DB Schema 또는 보안 정책을 변경하지 않아야 한다.
- 관련 문서 갱신 대상은 없다. 기존 계약에 대한 통합 테스트만 추가해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 통합 시나리오 누락 또는 지정 테스트·정적 검증 실패
- Mock만으로 인증·DB·HTTP 경계를 대체함
- 테스트를 통과시키기 위해 운영 코드, 보안 설정, DB 제약 또는 단언을 완화함
- 비밀정보·비밀번호·Hash·세션 식별자 또는 과도한 개인정보 노출
- 3회 재시도 후 실패, 수정 가능 경로 밖 변경 또는 수정 금지 경로 변경
- `quality_score`가 `90` 미만

#### 제외 범위

- Task 1과 Task 2의 구현 재작성 또는 기능 범위 확장
- 전체 시스템 성능·부하 테스트와 운영 PostgreSQL 데이터 검증
- 팀·직급 CRUD, 조직도 전체 조회와 프런트엔드 E2E

#### 작업 결과

`none`

#### 남은 문제

- Docker 또는 Testcontainers 실행 환경을 사용할 수 없으면 PostgreSQL 통합 검증은 미실행으로 기록하고 Task를 완료 처리하지 않는다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어 auth가 로그인·자격정보·비밀번호·세션·보안 책임만 소유하고 user, team, position이 각 Entity와 Repository를 소유해야 한다.
- 기존 Flyway V1의 PostgreSQL DB 생성, FK·UNIQUE·1:1 제약과 JPA 매핑 검증이 통과해야 한다.
- 로그인, 최초 비밀번호 변경, 세션, Fixture와 사용자 상세 조회 회귀 테스트가 모두 통과해야 한다.
- Harness의 전체 `spotlessCheck`, `test`, `build`가 통과해야 한다.
- 각 Task의 수정 가능 경로와 수정 금지 경로를 준수해야 한다.
- 관련 문서와 실제 구현이 일치하고 공개 API·DB·보안 정책 변경이 없어야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 Mandatory Gate가 실패함
- 필수 검증 명령이 실패하거나 미실행 검증이 승인 없이 남음
- Task별 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 관련 Product Spec, Design Doc, Architecture, API 또는 DB 기준선과 충돌함
- 인증·권한·개인정보·DB 정책을 임의 변경함
- 기존 Flyway Migration을 수정하거나 승인되지 않은 Schema 변경을 추가함
- 테스트 삭제·단언 약화·검증 우회 또는 남은 문제 누락
- 전체 `quality_score`가 `90` 미만
