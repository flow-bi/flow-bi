# 작업 계획: auth-re-01

## 1. 기본 정보

### 사용자 요청

`backend` 인증 도메인에 혼재한 책임을 `session`, `ratelimit` 등 기능별 경계로 분리하고, 기존 인증 동작을 유지하면서 클래스·메서드 이름과 제어 흐름의 가독성을 높이는 리팩터링을 진행한다.

### 작업 목적

인증 도메인의 JPA 영속성, 로그인 제한, Redis 세션 세대 상태, Spring Security 필터와 인증 Use Case가 패키지 이름만으로 구분되도록 정리한다. 현재 작업 트리의 부분 리팩터링에서 발생할 수 있는 인증 정책 회귀를 먼저 테스트로 고정하고, 외부 API·DB·보안 정책을 바꾸지 않은 채 유지보수성과 의존 방향을 개선한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `docs/adr-detail/ADR-001.md`, `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `AUTH-RE-001`: `auth.repository`에는 JPA 인증정보 영속성만 남기고, 로그인 제한 Port와 Redis Adapter는 `auth.ratelimit`, 세션 세대 상태와 Spring Session 정리 책임은 `auth.session`, HTTP 보안 필터와 설정은 `auth.security`, 인증 Use Case 조정은 `auth.service`에서 소유한다.
- `AUTH-RE-002`: 올바른 활성 직원 로그인, 존재하지 않는 계정과 잘못된 비밀번호의 동일 실패 응답, 비활성 직원 로그인 거부, 성공 시 로그인 실패 상태 초기화, 의존성 장애 시 fail-closed 동작과 감사 로그 의미를 유지한다.
- `AUTH-RE-003`: 로그인 실패 제한은 사번과 요청 출처의 원문을 Redis Key에 남기지 않으며, 기존 15분 실패 윈도우·5회 임계값·15분 제한·성공 시 초기화·Redis 장애 시 fail-closed 계약을 보존한다.
- `AUTH-RE-004`: 세션 세대 Key와 변경 진행 Key, `AUTH_GENERATION`, 원자적 세대 증가, 변경 중 새 로그인 거부, 현재 세션 유지, 나머지 세션의 멱등 정리와 Redis 장애 시 fail-closed 계약을 보존한다.
- `AUTH-RE-005`: `UserCredential.create`의 `mustChangePassword` 입력 의미, 비밀번호 변경 후 상태 해제, 현재 비밀번호 정책과 사용자 상세 응답의 JSON 계약을 변경하지 않으며 미사용 미래 기능을 리팩터링에 추가하지 않는다.
- `AUTH-RE-006`: 책임과 의도가 드러나는 이름, 짧고 단일 목적의 메서드, 중복 없는 조건식과 필요한 이유만 설명하는 주석을 사용하고, 구조 테스트로 레거시 패키지와 이름의 재유입을 방지한다.

---

## 2. 실행 Task

### Task 1. 인증 책임별 패키지 경계와 가독성 정리

#### 선행 Task

- `없음`

#### 작업 목적

현재 작업 트리에서 시작된 `ratelimit`과 `session` 분리를 승인된 인증 계약에 맞게 완성하고, 로그인·Credential·세션 흐름을 동작 보존형 리팩터링으로 정리한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user/dto/UserDetailResponse.java`
- `backend/src/main/java/com/flowbi/domain/user/service/UserAuthentication.java`
- `backend/src/test/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain/AuthenticationToUserDetailIntegrationTest.java`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/adr-detail`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `.agents`

#### 구현 항목

- [ ] Red: `AuthDomainOwnershipTest`와 `AuthApplicationLayerStructureTest`를 먼저 보강하여 JPA Repository, 로그인 제한, 세션 상태·정리, Security Filter, Use Case Service의 목표 패키지와 의존 방향을 단언하고, `auth.repository.LoginRateLimiter`, `auth.repository.RedisLoginRateLimiter`, `auth.repository.SessionGenerationStore`, `auth.repository.RedisSessionGenerationStore`, `SessionIndexCleanup` 등 레거시 위치·이름이 남은 현재 상태에서 실패를 확인한다.
- [ ] Red: 로그인과 Credential 특성화 테스트를 먼저 보강하여 활성 직원의 정상 로그인, 비활성 직원·없는 계정·잘못된 비밀번호 거부, Dummy Hash 검증, 성공 시 rate limit 초기화, 의존성 장애 fail-closed, `UserCredential.create`의 `mustChangePassword` 입력 보존과 비밀번호 변경 후 상태 해제를 검증하고 현재 초안의 회귀를 확인한다.
- [ ] Red: Redis 로그인 제한 테스트를 먼저 작성하여 원문 사번·요청 출처 비노출, 첫 실패부터 시작하는 15분 윈도우, 5회 임계값, 15분 제한, 제한 중 추가 실패의 안전한 처리, 성공 시 초기화와 Redis 장애 변환을 검증하고 현재 초안과의 차이를 확인한다.
- [ ] Red: 세션 세대와 세션 정리 특성화 테스트를 먼저 보강하여 Key·TTL, 새 세션 세대 결정, 세대 누락·불일치 거부, 변경 중 유지 세션 판별, 원자적 변경 시작·완료, 물리 정리 실패 시 논리적 fail-closed 동작을 검증한다.
- [ ] Green: 로그인 제한 Port와 Redis Adapter를 `auth.ratelimit`, 세션 세대 Store·Redis Adapter와 Spring Session 정리 구현을 `auth.session`에 배치하고, `auth.repository`에는 `UserCredentialRepository` 같은 JPA 영속성만 남기며 빈 `.gitkeep`과 모든 생성자 주입·import·테스트 참조를 정리한다.
- [ ] Green: `LoginAuthenticationService`, `SessionGenerationService`, `SessionGenerationValidationFilter`, `SecurityConfiguration`의 역할은 기존 계층에 유지하되, 의도가 드러나는 클래스·메서드·변수 이름과 작은 조건 함수로 흐름을 정리하고 비활성 사용자 검사, 감사 이벤트, 마스킹, 예외 변환과 세션 속성 계약을 보존한다.
- [ ] Green: `UserCredential`, `PasswordPolicy`, `UserAuthentication`, `UserDetailResponse`의 타입과 검증 흐름을 읽기 쉽게 정리하되 `mustChangePassword`, 허용 비밀번호 의미와 API 직렬화 결과를 바꾸지 않고, 현재 요구사항에 없는 임시 비밀번호 초기화 API 등 미사용 미래 동작은 추가하지 않는다.
- [ ] Refactor: 구현을 반복 설명하는 주석, 과도한 줄바꿈, 중복 Optional 조회와 긴 조건식을 제거하고 Spotless 형식에 맞추되 Redis 원자성·TTL·Key Prefix·예외·로그 메시지에서 보안상 의미 있는 구분은 유지한다.
- [ ] 구현 문제로 실패하면 원인을 기록하고 최대 3회까지 수정·재검증하며, 이후에도 실패하면 단언이나 보안 계약을 완화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.repository.AuthDomainOwnershipTest" --tests "com.flowbi.domain.auth.service.AuthApplicationLayerStructureTest"`를 실행하여 책임별 패키지 배치, 레거시 위치·이름 제거와 계층 의존 방향을 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.service.LoginAuthenticationServiceTest" --tests "com.flowbi.domain.auth.ratelimit.*" --tests "com.flowbi.domain.auth.entity.*"`를 실행하여 로그인 정상·실패·비활성 사용자·rate limit·Credential 상태와 기존 비밀번호 정책의 회귀가 없는지 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.service.SessionGenerationServiceTest" --tests "com.flowbi.domain.auth.session.*" --tests "com.flowbi.domain.auth.security.SecurityConfigurationIntegrationTest" --tests "com.flowbi.domain.auth.controller.SessionStatusControllerIntegrationTest"`를 실행하여 Redis 세션 세대, 현재 세션 유지, 물리 세션 정리, Filter 연결과 fail-closed 동작을 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.AuthenticationToUserDetailIntegrationTest"`를 실행하여 인증 Principal에서 사용자 상세 조회까지의 타입 연결과 기존 JSON 응답 계약을 검증한다.
- [ ] 저장소 루트에서 `rg -n "auth\.repository\.(LoginRateLimiter|RedisLoginRateLimiter|SessionGenerationStore|RedisSessionGenerationStore)|SessionIndexCleanup" backend/src/main backend/src/test` 결과가 0건이고, `rg -n "auth\.(ratelimit|session)" backend/src/main backend/src/test`가 새 책임 경계와 소비자 import를 찾는지 확인한다.
- [ ] 저장소 루트에서 `git diff --check -- backend/src/main/java/com/flowbi/domain/auth backend/src/main/java/com/flowbi/domain/user/dto/UserDetailResponse.java backend/src/main/java/com/flowbi/domain/user/service/UserAuthentication.java backend/src/test/java/com/flowbi/domain/auth backend/src/test/java/com/flowbi/domain/AuthenticationToUserDetailIntegrationTest.java`를 실행하여 변경 범위의 patch 형식과 후행 공백을 검증한다.

#### 완료 조건

- `AUTH-RE-001`부터 `AUTH-RE-006`까지 모두 충족해야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- Red → Green → Refactor 순서와 각 단계의 실행 증거가 기록되어야 한다.
- 외부 API, DB Schema, Redis 세션·로그인 제한 정책과 인증·인가 결과가 변경되지 않아야 한다.
- 문서 갱신 대상은 없으며 관련 Product Spec, Design Doc, ADR, `SECURITY.md`와 구현이 일치해야 한다.
- Mandatory Gate 중 Permission/Security, Scope, Requirements, TDD, Automated Verification, Contract Sync, Critical Findings가 모두 `PASS`여야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 책임별 패키지 경계 또는 레거시 위치·이름 제거가 완료되지 않음
- 비활성 직원이 로그인되거나 잘못된 자격정보가 계정 존재 여부를 구분해 노출함
- 로그인 실패 윈도우·임계값·제한 시간, 세션 세대·현재 세션 유지 또는 fail-closed 의미가 변경됨
- `mustChangePassword`, 비밀번호 정책, 사용자 상세 JSON, 공개 API 또는 DB 계약이 변경됨
- 테스트 단언 삭제·약화, 보안 검증 우회 또는 Red → Green → Refactor 증거 누락
- 3회 수정·재검증 후에도 동일한 필수 검증이 실패함
- 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- Mandatory Gate 중 하나가 실패하거나 `quality_score`가 90 미만임

#### 제외 범위

- 인증 방식, Cookie, CSRF, 세션 만료, 로그인 실패 제한 임계값과 비밀번호 복잡도 정책 변경
- 공개 API, 사용자 화면, DB Schema, Migration과 Redis 운영 토폴로지 변경
- 관리자 비밀번호 초기화, 역할·권한 변경과 기기별 세션 관리 등 미구현 인증 기능 추가
- 새 의존성, 외부 서비스, 캐시 또는 인증 기술 도입
- `auth` 밖의 도메인 구조 정리와 관련 없는 포맷팅

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되고 검증 항목이 통과해야 한다.
- `AUTH-RE-001`부터 `AUTH-RE-006`까지 충족하고 관련 인증 문서와 실제 구현이 일치해야 한다.
- 모든 Task의 수정 범위가 각 Task의 `수정 가능 경로` 안에 있고 `수정 금지 경로`에 변경이 없어야 한다.
- Mandatory Gate가 모두 `PASS`이고 전체 `quality_score`가 90 이상이어야 한다.
- Harness가 수행하는 Backend 전체 lint, test와 build가 통과해야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 구현 항목 또는 검증 항목이 실패함
- 인증·세션·로그인 제한·Credential 동작이 Product Spec, Design Doc, ADR 또는 `SECURITY.md`와 충돌함
- 공개 API, DB Schema, 인증 정책 또는 품질 게이트가 승인 없이 변경됨
- 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 검증 실패를 테스트 약화나 우회로 통과시킴
- 남은 문제가 사용자 확인 없이 방치되거나 전체 `quality_score`가 90 미만임
