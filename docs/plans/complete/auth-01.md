# 작업 계획: auth-01

## 1. 기본 정보

### 사용자 요청

백엔드 auth 도메인 내부의 혼재된 기능별·기술별 패키지와 파일 배치를 책임 중심 계층 구조로 리팩터링하되, 이전 실행에서 누락된 auth 외부 참조 파일의 수정 가능 경로를 보완하고 실행 범위와 검증에 부족한 부분이 없는지 다시 확인한다.

### 작업 목적

현재 `domain/auth` 아래의 `login`, `logout`, `password`, `session`, `security`, `persistence`, `fixture` 패키지는 Use Case, HTTP 진입점, 보안 필터, 영속성 Adapter와 DTO가 같은 기능 폴더 안에 혼재되어 탐색과 의존 방향 확인이 어렵다. 기존 Architecture와 Backend 기준에 맞춰 auth 도메인을 `controller`, `service`, `repository`, `entity`, `dto` 기본 계층과 `security`, `audit`, `exception`, `fixture` 보조 책임으로 정리하고 구조 규칙을 자동 테스트로 고정한다.

이 작업은 파일 위치와 package/import만 정리하는 내부 리팩터링이다. `FR-009`, `FR-010`, `NFR-001`, `NFR-002`의 동작, 공개 API, DB 스키마, Redis Key·TTL·원자 연산, Session Cookie, CSRF, CORS, 로그인 제한, 세션 무효화와 감사 이벤트의 의미는 변경하지 않는다. 현재 Active Plan `login-auth-04`와 수정 범위가 겹치므로 두 Plan을 동시에 실행하지 않고, 해당 작업이 종료되어 auth 작업 트리가 안정된 뒤 이 Plan을 실행한다.

이전 Harness 실행은 Task 1이 `domain/auth`만 수정하도록 제한된 상태에서 `UserCredential`, `UserCredentialRepository` 등 이동 대상의 auth 외부 consumer import를 갱신할 수 없어 중단되었다. 현재 전체 `backend/src/main`과 `backend/src/test`의 `com.flowbi.domain.auth` 참조를 다시 검색한 결과 외부 consumer는 `EmployeeAccountRegistrationService`, 해당 Service 테스트, `UserDetailApiRedTest`, `AuthenticationToUserDetailIntegrationTest` 4개로 확인되었다. 각 Task에는 실제 이동 대상에 영향을 받는 파일만 수정 가능 경로로 추가한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/AGENTS.md`, `backend/BACKEND.md`, `backend/API.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 인증 애플리케이션 계층 정리

#### 선행 Task

- 없음

#### 작업 목적

로그인·최초 비밀번호 변경·세션 세대 Use Case와 그 입출력, 예외, 비밀번호 정책, 감사 로깅을 책임별 package로 분리하여 Service의 역할과 의존 방향을 명확하게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationService.java`
- `backend/src/test/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationServiceTest.java`
- `backend/src/test/java/com/flowbi/domain/user/UserDetailApiRedTest.java`

#### 수정 금지 경로

- `backend/src/main/resources`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: 로그인·비밀번호 변경·세션 Use Case가 `auth.service`, 요청·결과 record가 `auth.dto`, 인증 실패 유형이 `auth.exception`, 감사 계약과 SLF4J 구현이 `auth.audit`에 위치해야 한다는 실패 구조 테스트를 먼저 작성한다. 아직 없는 새 type을 compile-time import하지 않고 reflection, classpath 또는 source package 검사로 현재 구조를 실행 가능한 테스트 실패로 검출하고 결과를 기록한다.
- [ ] Green: `LoginAuthenticationService`, `InitialPasswordChangeService`, `SessionGenerationService`, `SessionIndexCleanup`, `PasswordPolicy`를 `auth.service`로 이동하고 기존 생성자 주입·트랜잭션·잠금·실패 폐쇄 동작을 보존한다.
- [ ] Green: `LoginRequest`, `LoginResult`, `AuthenticatedLogin`, `PasswordChangeRequest`를 `auth.dto`로, 로그인·비밀번호·세션 관련 예외를 `auth.exception`으로 이동하고 오류 code·HTTP status로 이어지는 기존 의미를 변경하지 않는다.
- [ ] Green: 로그인·로그아웃·비밀번호 변경 Audit interface와 SLF4J 구현을 `auth.audit`로 이동하고 로그 이벤트 종류, 마스킹, 민감정보 비노출을 유지한다.
- [ ] Green: auth 내부 전체 테스트에서 이동된 Service·DTO·예외·감사 type의 package 선언과 import를 갱신하고, auth 바깥 consumer인 `EmployeeAccountRegistrationService`와 해당 Service 테스트의 `PasswordPolicy` 참조 및 `UserDetailApiRedTest`의 `SessionGenerationService` import·Mock type을 새 package로 함께 갱신한다.
- [ ] Refactor: Service 단위 테스트를 새 책임 package에 맞춰 이동하고 package 이동 때문에 불필요하게 넓어진 type·method visibility가 없는지 정리한다.
- [ ] 구현 문제로 검증이 실패하면 같은 오류당 최초 실행을 포함해 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 Task를 실패 처리하며 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] 새 애플리케이션 계층 구조 테스트를 지정 실행하여 `service`·`dto`·`exception`·`audit` 배치와 Controller→Service→Repository 의존 방향을 확인한다.
- [ ] `./gradlew test --tests "com.flowbi.domain.auth.service.*"`를 실행하여 로그인 정상·실패·rate limit, 비밀번호 정책·재사용 금지·세션 무효화, Redis 장애 fail-closed 동작을 확인한다.
- [ ] 선행 실행에서 정리한 `entity`·`repository` import와 충돌하거나 이를 우회하는 직접 Redis/JPA 접근이 새 Service에 생기지 않았는지 구조 테스트로 확인한다.
- [ ] 감사 로거 테스트 또는 지정 Service 테스트의 Mock 검증으로 로그인·로그아웃·비밀번호 변경 감사 호출과 민감정보 비노출이 기존과 동일한지 확인한다.
- [ ] `./gradlew test --tests "com.flowbi.domain.user.service.EmployeeAccountRegistrationServiceTest"`를 실행하여 auth 외부 계정 등록 Use Case가 이동된 `PasswordPolicy`와 정상 통합되는지 확인한다.
- [ ] `backend/src/main`과 `backend/src/test` 전체에서 이동된 Service·DTO·예외·감사 type의 이전 FQCN이 남지 않았는지 source 검색과 구조 테스트로 확인한다.
- [ ] Red → Green → Refactor 단계별 명령, 최초 실패 원인, 최종 성공 결과와 재시도 횟수를 Task 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Mandatory Gate G1~G7 중 적용 항목이 모두 PASS여야 한다.
- `FR-009`, `FR-010`, `NFR-001`, `NFR-002`와 인증 Design Doc의 로그인·비밀번호 변경·세션 무효화·감사 의미가 유지되어야 한다.
- API·DB Schema·Migration·보안 정책의 문서 갱신 대상이 없어야 하며, 변경 필요성이 발견되면 구현하지 않고 남은 문제로 기록해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 지정 구조·Service·감사 검증 실패
- Transaction, 비밀번호 정책, 로그인 제한, 세션 세대 또는 감사 이벤트 의미 변경
- 예외 message parsing을 변경하면서 API 오류 code·status 계약을 함께 변경함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- Controller와 Security Filter Chain의 동작 또는 공개 경로 변경
- 공통 전역 오류 모델 도입과 예외 처리 방식 재설계
- 비밀번호·세션·로그인 제한 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 인증 진입점 구조 정리 및 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

HTTP Controller와 Spring Security 구성요소를 각각 `auth.controller`와 `auth.security`에 모으고, 허용된 auth 하위 package와 의존 방향을 통합 구조 테스트로 고정하여 기존 기능별 package 혼재를 제거한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain/user/UserDetailApiRedTest.java`
- `backend/src/test/java/com/flowbi/domain/AuthenticationToUserDetailIntegrationTest.java`

#### 수정 금지 경로

- `backend/src/main/resources`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: 모든 운영 HTTP Controller는 `auth.controller`, Principal·Filter·Security handler·logout handler는 `auth.security`에 위치하고 운영 코드의 허용 하위 package가 `audit`, `controller`, `dto`, `entity`, `exception`, `fixture`, `repository`, `security`, `service`로 제한되어야 한다는 실패 통합 구조 테스트를 먼저 작성한다. 아직 없는 새 type을 compile-time import하지 않고 reflection, classpath 또는 source package 검사로 현재 구조를 실행 가능한 테스트 실패로 검출한다.
- [ ] Green: `LoginController`, `InitialPasswordChangeController`, `SessionStatusController`, `CsrfTokenController`를 `auth.controller`로 이동하고 URL, method, request/response JSON, status, Cache-Control과 CSRF 요구사항을 보존한다.
- [ ] Green: `LoginPrincipal`, `MustChangePasswordFilter`, `SessionGenerationValidationFilter`, logout handler·success handler를 `auth.security`로 이동하고 Security Filter Chain의 순서, 공개 경로, Session Cookie와 실패 응답을 변경하지 않는다.
- [ ] Green: local/test 전용 Fixture는 `auth.fixture`에 유지하면서 이동된 계층 import만 갱신하고 Profile·Property 이중 활성화 조건과 production 비노출을 보존한다.
- [ ] Green: auth 내부 전체 테스트에서 이동된 Controller·Principal·Filter·Handler type의 package 선언, import, Mock과 Spring `@Import` type을 갱신하고, auth 바깥에서 `LoginPrincipal`, `MustChangePasswordFilter`, `SessionGenerationValidationFilter`, `CsrfTokenController`를 사용하는 `UserDetailApiRedTest`와 `AuthenticationToUserDetailIntegrationTest`도 새 package로 함께 갱신한다.
- [ ] Refactor: 테스트를 `controller`, `security`, `service`, `repository` 책임에 맞춰 정리하고 더 이상 사용하지 않는 `login`, `logout`, `password`, `session`, `persistence` package 선언과 import를 제거한다.
- [ ] Refactor: 통합 구조 테스트가 Controller의 Repository 직접 참조, Service의 타 도메인 Repository 직접 참조, Entity의 API 직접 노출과 허용되지 않은 auth 최상위 package 재도입을 차단하도록 완성한다.
- [ ] 구현 문제로 검증이 실패하면 같은 오류당 최초 실행을 포함해 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 Task를 실패 처리하며 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] auth 통합 구조 테스트를 실행하여 새 package 목록, 계층별 type 배치, 금지 의존 방향과 기존 package 제거를 확인한다.
- [ ] `./gradlew test --tests "com.flowbi.domain.auth.controller.*" --tests "com.flowbi.domain.auth.security.*"`를 실행하여 로그인·로그아웃·CSRF·세션 상태·절대 만료·세션 세대·최초 비밀번호 변경 접근 제한 API 동작을 확인한다.
- [ ] `./gradlew test --tests "com.flowbi.domain.auth.fixture.*"`를 실행하여 local/test 이중 조건과 production Fixture 비노출이 유지되는지 확인한다.
- [ ] `./gradlew test --tests "com.flowbi.domain.AuthenticationToUserDetailIntegrationTest"`를 실행하여 선행 Task의 새 계층이 실제 PostgreSQL, Spring Security와 통합되고 로그인→세션→보호 API 흐름에 회귀가 없는지 확인한다.
- [ ] `./gradlew test --tests "com.flowbi.domain.user.UserDetailApiRedTest"`를 실행하여 auth 외부 MVC slice가 이동된 Controller·Principal·Filter·Service와 정상 통합되는지 확인한다.
- [ ] `backend/src/main`과 `backend/src/test` 전체에서 기존 `auth.login`, `auth.logout`, `auth.password`, `auth.session`, `auth.persistence` package 선언·import·문자열 FQCN이 남지 않았는지 source 검색과 통합 구조 테스트로 확인한다.
- [ ] 응답과 로그에 평문 비밀번호, 비밀번호 Hash, Session ID와 내부 예외가 새로 노출되지 않는지 기존 보안 단언과 통합 테스트로 확인한다.
- [ ] Red → Green → Refactor 단계별 명령, 최초 실패 원인, 최종 성공 결과와 재시도 횟수를 Task 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Mandatory Gate G1~G7 중 적용 항목이 모두 PASS여야 한다.
- `FR-009`, `FR-010`, `NFR-001`, `NFR-002`의 API·보안·세션·비밀번호 동작이 변경되지 않아야 한다.
- auth 운영 코드는 합의된 9개 책임 package에만 존재하고 통합 구조 테스트가 잘못된 배치와 역방향 의존을 자동 차단해야 한다.
- API·DB Schema·Migration·인증 정책의 문서 갱신 대상이 없어야 하며, 변경 필요성이 발견되면 구현하지 않고 남은 문제로 기록해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 지정 구조·Controller·Security·Fixture·PostgreSQL 통합 테스트 실패
- URL, HTTP method, JSON, status, Cookie, CSRF, CORS, Filter Chain, 세션 또는 접근 제한 동작 변경
- 기존 `login`, `logout`, `password`, `session`, `persistence` package 선언 또는 금지 의존이 남음
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- Frontend와 Cypress 변경
- API·DB Schema·Migration 변경
- 인증 방식, 권한 모델, Cookie·CSRF·CORS·세션 정책 변경
- 공통 `global` 오류 처리 도입, Session orchestration 재설계, trusted proxy 정책 변경
- 일정·프로젝트·회의실·알림 등 미구현 도메인 작업

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되고 auth 운영 코드가 `audit`, `controller`, `dto`, `entity`, `exception`, `fixture`, `repository`, `security`, `service` 책임으로만 구성되어야 한다.
- auth 외부 consumer 4개 파일의 package import, Mock type, Spring `@Import`와 테스트 Bean이 이동된 auth type을 참조해야 하며 이전 FQCN이 `backend/src/main`과 `backend/src/test`에 남지 않아야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 Product Spec, Design Doc, Architecture, Security와 실제 동작이 일치해야 한다.
- `FR-009`, `FR-010`, `NFR-001`, `NFR-002`의 사용자 동작과 보안 계약에 회귀가 없어야 한다.
- 공개 API, DB Schema, Flyway Migration, Redis Key·TTL·원자 연산과 인증·권한 정책이 변경되지 않아야 한다.
- 각 Task의 Red → Green → Refactor 실행 기록과 Mandatory Gate G1~G7 판정이 남아 있어야 한다.
- 모든 Task 완료 후 Harness 실행기가 `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`를 한 번씩 실행해 모두 통과해야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- Product Spec 또는 Design Doc과 충돌함
- 현재 Active Plan `login-auth-04`와 동시에 실행하여 동일 auth 파일에 충돌하거나 다른 작업자의 변경을 덮어씀
- 인증·세션·비밀번호·CSRF·CORS·Cookie·공개 Endpoint 정책이 변경되거나 완화됨
- 공개 API, DB Schema, Migration 또는 Redis 상태 계약이 변경됨
- 테스트 삭제, 단언 약화, 검증 우회 또는 TDD 실행 기록 누락
- 전체 `quality_score`가 90 미만
- 남은 문제가 사용자 확인 없이 방치됨
