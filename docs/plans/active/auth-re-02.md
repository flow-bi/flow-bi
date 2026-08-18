# 작업 계획: auth-re-02

## 1. 기본 정보

### 사용자 요청

인증 코드를 계층별 `controller`, `service`, `dto` 패키지에 흩어 두지 않고 로그인, 비밀번호 변경, 세션, Credential 등 기능별로 함께 배치하여 관련 코드를 쉽게 찾을 수 있도록 리팩터링한다.

### 작업 목적

하나의 인증 기능을 이해하거나 수정할 때 여러 계층 디렉터리를 오가는 비용을 줄인다. `auth` 도메인 내부를 기능 우선 패키지로 재구성하되 기존 API, 인증·세션·비밀번호 정책, Redis 상태와 DB 계약은 변경하지 않고 패키지 소유권과 의존 방향을 자동화 테스트로 고정한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `docs/adr-detail/ADR-001.md`, `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `AUTH-RE2-001`: 로그인 Controller, Service, 요청·응답 DTO와 인증 실패 예외는 `auth.login`, 로그인 제한 Port·Redis Adapter·예외는 `auth.login.ratelimit`에서 함께 소유한다.
- `AUTH-RE2-002`: 최초 비밀번호 변경 Controller, Service, 요청 DTO, Password Policy, 관련 예외와 변경 강제 Filter는 `auth.password`에서 함께 소유한다.
- `AUTH-RE2-003`: 세션 상태 Controller, 세션 세대 Service·Store·Redis Adapter, 사용자 세션 정리, 세션 검증·절대 만료·Redis 장애 Filter, 로그아웃 Handler와 세션 예외는 `auth.session`에서 함께 소유한다.
- `AUTH-RE2-004`: `UserCredential`과 JPA Repository는 `auth.credential`, 개발용 직원 계정 Adapter는 `auth.dev`, CSRF·Principal·공통 인증/인가 Handler와 Spring Security 설정은 `auth.security`에서 소유하고 감사 Port·Adapter는 `auth.audit`에 유지한다.
- `AUTH-RE2-005`: 기능 패키지는 파일 수가 적은 현재 규모에서 `controller/service/dto` 하위 계층을 다시 만들지 않고 관련 타입을 같은 기능 경계에 평탄하게 배치하며, 기존 최상위 `auth.controller`, `auth.service`, `auth.dto`, `auth.entity`, `auth.repository`, `auth.exception`, `auth.ratelimit` 패키지를 제거한다.
- `AUTH-RE2-006`: Controller는 HTTP 처리, Service는 Use Case 조정, Store·Repository·RateLimiter는 외부 상태 접근이라는 기존 역할을 유지하고, 로그인·비밀번호 기능은 Redis 구현체가 아니라 공개된 세션·rate-limit 경계에만 의존한다.
- `AUTH-RE2-007`: 모든 HTTP 경로·요청·응답·상태 코드, CSRF와 Cookie, 비활성 사용자 거부, 로그인 제한, Credential, 최초 비밀번호 변경, 세션 세대·무효화·fail-closed와 감사 로그 계약을 변경하지 않는다.
- `AUTH-RE2-008`: 제품 코드와 테스트의 패키지 구조를 동일한 기능 기준으로 맞추고 구조 테스트가 기능 소유권, 허용된 공유 경계와 레거시 패키지 부재를 검증한다.
- `AUTH-RE2-009`: `backend/BACKEND.md`에 도메인 내부 기능 우선 패키지 원칙, 평탄한 초기 배치와 기능 간 의존 방향을 현재 구현과 일치하도록 기록한다.

---

## 2. 실행 Task

### Task 1. 인증 기능 중심 Vertical Slice 패키지 재구성

#### 선행 Task

- `없음`

#### 작업 목적

인증 도메인의 계층별 최상위 패키지를 로그인·비밀번호·세션·Credential 기능 경계로 재배치하고, 공유 보안·감사 코드와 외부 소비자 import를 정렬하여 기능 탐색성과 응집도를 높인다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationService.java`
- `backend/src/test/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain/AuthenticationToUserDetailIntegrationTest.java`
- `backend/src/test/java/com/flowbi/domain/user/UserDetailApiRedTest.java`
- `backend/src/test/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationServiceTest.java`
- `backend/BACKEND.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/adr-detail`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `.agents`

#### 구현 항목

- [ ] Red: 인증 구조 테스트를 먼저 작성하거나 보강하여 `auth.login`, `auth.login.ratelimit`, `auth.password`, `auth.session`, `auth.credential`, `auth.dev`, `auth.security`, `auth.audit`의 소유 타입과 허용 의존 방향을 단언하고, 현재 계층별 최상위 패키지 배치에서 실패를 확인한다.
- [ ] Red: 기존 로그인, 비밀번호 변경, 세션, Security, Credential, 개발 Adapter 테스트를 새 기능 패키지 기준으로 먼저 이동하여 제품 코드 이동 전 컴파일 또는 구조 검증이 실패함을 확인하되 동작 단언은 삭제하거나 약화하지 않는다.
- [ ] Green: `LoginController`, `LoginAuthenticationService`, `LoginRequest`, `LoginResult`, `AuthenticatedLogin`, `AuthenticationDependencyUnavailableException`을 `auth.login`으로 이동하고, `LoginRateLimiter`, `RedisLoginRateLimiter`, `LoginRateLimitUnavailableException`을 `auth.login.ratelimit`으로 이동한다.
- [ ] Green: `InitialPasswordChangeController`, `InitialPasswordChangeService`, `PasswordChangeRequest`, `PasswordPolicy`, `PasswordChangeException`, `PasswordChangeDependencyUnavailableException`, `MustChangePasswordFilter`를 `auth.password`로 이동한다.
- [ ] Green: `SessionStatusController`, `SessionGenerationService`, `SessionGenerationStore`, `RedisSessionGenerationStore`, `UserSessionCleanup`, `SessionGenerationValidationFilter`, `AbsoluteSessionTimeoutFilter`, `RedisSessionFailureFilter`, `LogoutHandler`, `LogoutSuccessHandler`, `SessionGenerationStoreUnavailableException`, `SessionGenerationValidationException`을 `auth.session`으로 이동한다.
- [ ] Green: `UserCredential`과 `UserCredentialRepository`를 `auth.credential`, `DevEmployeeAccountController`를 `auth.dev`, `CsrfTokenController`를 `auth.security`으로 이동하고 `SecurityConfiguration`, `AuthSecurityProperties`, `LoginPrincipal`, JSON 인증·인가 Handler와 `auth.audit` 타입은 공유 경계에 유지한다.
- [ ] Green: 제품 코드와 테스트의 package 선언, import, 생성자 주입, Spring Test Controller 참조를 모두 갱신하고, `EmployeeAccountRegistrationService`, 사용자 API 테스트와 인증-사용자 상세 통합 테스트 같은 auth 외부 소비자는 공개 기능 경계만 참조하도록 정리한다.
- [ ] Green: 테스트를 `login`, `login.ratelimit`, `password`, `session`, `credential`, `dev`, `security` 기능 패키지에 맞춰 이동하고, 구조 테스트는 `com.flowbi.domain.auth`의 공통 구조 검증으로 정리하여 최상위 `controller/service/dto/entity/repository/exception/ratelimit` 재유입과 기능별 Redis 구현 직접 의존을 차단한다.
- [ ] Green: 이동 후 비게 된 최상위 계층 디렉터리와 `.gitkeep`을 제거하되 클래스명, public 메서드 의미, Endpoint, 응답 JSON, Redis Key·TTL·원자성, 세션 속성, 예외 매핑과 로그 내용을 변경하지 않는다.
- [ ] Refactor: 기능 패키지 내부 파일 수가 적은 동안 불필요한 `controller/service/dto` 하위 폴더를 만들지 않고, 다른 기능이 직접 구현체에 의존하지 않도록 필요한 최소 가시성만 사용하며 순환 의존을 제거한다.
- [ ] Refactor: `backend/BACKEND.md`의 패키지 구조와 계층 원칙에 도메인 내부 기능 우선 배치, 기능별 평탄 구조, 공유 `security/audit` 경계와 외부 상태 Port 의존 원칙을 반영하되 상위 도메인 경계나 인증 아키텍처는 변경하지 않는다.
- [ ] 구현 문제로 실패하면 원인을 기록하고 최대 3회까지 수정·재검증하며, 이후에도 실패하면 테스트나 보안 계약을 우회하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.AuthFeaturePackageStructureTest"`를 실행하여 기능별 타입 소유권, 공유 경계, 의존 방향과 레거시 최상위 계층 패키지 부재를 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.login.*" --tests "com.flowbi.domain.auth.password.*" --tests "com.flowbi.domain.auth.session.*" --tests "com.flowbi.domain.auth.credential.*" --tests "com.flowbi.domain.auth.dev.*" --tests "com.flowbi.domain.auth.security.*"`를 실행하여 이동된 기능별 단위·통합·Security 테스트의 기존 단언을 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.AuthenticationToUserDetailIntegrationTest" --tests "com.flowbi.domain.user.UserDetailApiRedTest" --tests "com.flowbi.domain.user.service.EmployeeAccountRegistrationServiceTest"`를 실행하여 auth 외부 소비자의 컴파일, 직원 계정 등록, Principal 기반 사용자 조회와 JSON 계약을 검증한다.
- [ ] 저장소 루트에서 `rg -n "com\.flowbi\.domain\.auth\.(controller|service|dto|entity|repository|exception|ratelimit)(\.|;)" backend/src/main backend/src/test` 결과가 0건이고, `rg -n "com\.flowbi\.domain\.auth\.(login|password|session|credential|dev|security|audit)(\.|;)" backend/src/main backend/src/test`가 기능별 package 선언과 소비자 import를 찾는지 확인한다.
- [ ] 저장소 루트에서 `rg -n "기능 우선|기능별|security|audit" backend/BACKEND.md`가 기능 우선 패키지 원칙과 공유 경계를 찾고, 문서의 Controller·Service·Repository 책임 및 의존 방향 설명과 충돌하지 않는지 확인한다.
- [ ] 저장소 루트에서 `git diff --check -- backend/src/main/java/com/flowbi/domain/auth backend/src/main/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationService.java backend/src/test/java/com/flowbi/domain/auth backend/src/test/java/com/flowbi/domain/AuthenticationToUserDetailIntegrationTest.java backend/src/test/java/com/flowbi/domain/user/UserDetailApiRedTest.java backend/src/test/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationServiceTest.java backend/BACKEND.md`를 실행하여 변경 범위의 patch 형식과 후행 공백을 검증한다.

#### 완료 조건

- `AUTH-RE2-001`부터 `AUTH-RE2-009`까지 모두 충족해야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- Red → Green → Refactor 순서와 각 단계의 실행 증거가 기록되어야 한다.
- 기능 패키지와 테스트 구조가 일치하고 레거시 최상위 계층 패키지가 남지 않아야 한다.
- HTTP API, DB Schema, 인증·인가, 로그인 제한, 비밀번호, 세션과 감사 계약에 관찰 가능한 변경이 없어야 한다.
- `backend/BACKEND.md` 외 문서 갱신 대상은 없으며 Product Spec, Design Doc, ADR, `SECURITY.md`와 구현이 일치해야 한다.
- Mandatory Gate 중 Permission/Security, Scope, Requirements, TDD, Automated Verification, Contract Sync, Critical Findings가 모두 `PASS`여야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 기능별 패키지 중 하나 이상이 누락되거나 계층별 최상위 패키지와 레거시 import가 남음
- 테스트가 제품 코드 구조와 다른 패키지에 남거나 구조 테스트가 기능 소유권·의존 방향을 검증하지 못함
- 순환 의존, 기능 간 Redis/JPA 구현체 직접 의존 또는 불필요한 public 가시성이 추가됨
- Endpoint, JSON, 상태 코드, CSRF·Cookie, 로그인 제한, Credential, 비밀번호, 세션 또는 감사 계약이 변경됨
- `backend/BACKEND.md`와 구현 구조가 불일치하거나 상위 Architecture·Design 결정과 충돌함
- 테스트 단언 삭제·약화, 보안 검증 우회 또는 Red → Green → Refactor 증거 누락
- 3회 수정·재검증 후에도 동일한 필수 검증이 실패함
- 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- Mandatory Gate 중 하나가 실패하거나 `quality_score`가 90 미만임

#### 제외 범위

- 인증 방식, 권한 모델, Cookie, CSRF, 세션 만료, 로그인 제한과 비밀번호 정책 변경
- 공개 API, DB Schema, Migration, Redis Key·TTL·운영 토폴로지 변경
- 새로운 인증 기능, 관리자 기능, 사용자 화면 또는 외부 서비스 추가
- auth 상위 도메인 경계 변경, 새 최상위 모듈과 새 의존성 도입
- 파일 수가 적은 기능에 `controller/service/dto` 하위 계층을 다시 생성하는 작업
- 관련 없는 도메인의 패키지 재구성 또는 포맷팅

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되고 검증 항목이 통과해야 한다.
- `AUTH-RE2-001`부터 `AUTH-RE2-009`까지 충족하고 기능 패키지·테스트·`backend/BACKEND.md`가 일치해야 한다.
- 모든 Task의 수정 범위가 각 Task의 `수정 가능 경로` 안에 있고 `수정 금지 경로`에 변경이 없어야 한다.
- Mandatory Gate가 모두 `PASS`이고 전체 `quality_score`가 90 이상이어야 한다.
- Harness가 수행하는 Backend 전체 lint, test와 build가 통과해야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 구현 항목 또는 검증 항목이 실패함
- 인증 기능 동작이 Product Spec, Design Doc, ADR 또는 `SECURITY.md`와 충돌함
- 기능 패키지 소유권과 의존 방향이 `backend/BACKEND.md`와 일치하지 않음
- 공개 API, DB Schema, 인증 정책 또는 품질 게이트가 승인 없이 변경됨
- 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 검증 실패를 테스트 약화나 우회로 통과시킴
- 남은 문제가 사용자 확인 없이 방치되거나 전체 `quality_score`가 90 미만임
