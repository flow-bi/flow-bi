# 작업 계획: synthetic-01

## 1. 기본 정보

### 사용자 요청

로컬 환경에서 자동 생성하거나 화면에 노출하던 Synthetic 인증 계정 기능과 관련 코드를 제거하고, 자동화 테스트는 테스트별로 격리된 계정 데이터를 사용하도록 정리한다. 로컬 일반 직원 계정 수동 생성 기능은 Synthetic 계정 기능과 분리하여 유지한다.

### 작업 목적

애플리케이션 시작 시 고정 테스트 계정을 생성하고 로그인 화면에 자격증명을 노출하는 개발 편의 기능을 제거하여 인증 경계를 단순화한다. 동시에 관리자 계정 생성 흐름이 아직 제공되지 않는 현재 상태에서도 로컬 개발자가 정상 등록 유스케이스를 통해 일반 직원 계정을 수동 생성할 수 있도록 개발용 Adapter를 별도 opt-in 경계로 유지한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `backend/README.md`, `frontend/FRONTEND.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `SYNTHETIC-001`: 어떤 Profile에서도 애플리케이션 시작만으로 Synthetic 사용자·팀·직급·인증정보가 생성되지 않는다.
- `SYNTHETIC-002`: `auth.test-fixtures`, `AUTH_TEST_FIXTURES_*`, Synthetic 전용 Properties·Initializer·등록 유스케이스와 런타임 자격증명 주입 계약이 제품 코드·설정·현재 계약 문서에 남지 않는다.
- `SYNTHETIC-003`: 로그인 화면은 사번·비밀번호 입력과 개발 환경의 수동 직원 계정 생성 진입점만 제공하며 테스트 사번이나 비밀번호를 표시하지 않는다.
- `SYNTHETIC-004`: 개발용 직원 계정 Adapter는 `local` 또는 `test` Profile과 별도의 명시적 opt-in 설정이 함께 있을 때만 등록되고, Production Profile에서는 등록되지 않으며 기존 CSRF·검증·트랜잭션·최초 비밀번호 변경 강제 계약을 유지한다.
- `SYNTHETIC-005`: 로그인·최초 비밀번호 변경·세션·직원 등록 자동화 테스트는 전역 고정 계정에 의존하지 않고 각 테스트가 필요한 계정 데이터를 직접 준비한다.
- `SYNTHETIC-006`: 비밀번호 Encoder Bean은 fixture 수명주기와 분리된 인증 보안 구성에서 제공되어 Synthetic 코드 제거 후에도 모든 Profile의 애플리케이션 Context와 인증 기능이 정상 동작한다.

---

## 2. 실행 Task

### Task 1. Backend Synthetic 인증 수명주기 제거와 개발 Adapter 분리

#### 선행 Task

- `없음`

#### 작업 목적

런타임 Synthetic 계정 자동 생성과 전용 등록 우회 경로를 제거하고, 정상 직원 등록 유스케이스를 사용하는 개발용 Adapter와 공통 인증 Bean을 독립된 안전한 경계로 정리한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth/fixture`
- `backend/src/main/java/com/flowbi/domain/auth/controller`
- `backend/src/main/java/com/flowbi/domain/auth/security`
- `backend/src/main/java/com/flowbi/domain/user/service`
- `backend/src/main/resources`
- `backend/src/test/java/com/flowbi/domain/auth/fixture`
- `backend/src/test/java/com/flowbi/domain/auth/controller`
- `backend/src/test/java/com/flowbi/domain/auth/repository`
- `backend/src/test/java/com/flowbi/domain/auth/security`
- `backend/src/test/java/com/flowbi/domain/user/service`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `backend/README.md`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/src/main/java/com/flowbi/domain/auth/session`
- `backend/src/main/java/com/flowbi/domain/auth/service`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `frontend`

#### 구현 항목

- [ ] Red: `local`·`test` Profile에서 레거시 `auth.test-fixtures.enabled=true`와 Synthetic 자격정보를 주입해도 Synthetic Bean·ApplicationRunner가 등록되지 않고 고정 사용자·팀·직급·인증정보가 생성되지 않는다는 실패 테스트를 먼저 작성하고 실패 원인을 기록한다.
- [ ] Red: 개발용 직원 계정 Adapter가 새 opt-in 설정과 `local` 또는 `test` Profile의 교집합에서만 등록되고 Production에서는 등록되지 않으며, POST 요청의 CSRF 보호와 `mustChangePassword=true`가 유지된다는 실패 테스트를 먼저 작성한다.
- [ ] Red: 일반 직원 등록 Service에 `registerFixture` 같은 Synthetic 전용 공개 경로가 없고, 정상 `register`가 중복 사번·이메일과 부분 저장을 기존 계약대로 거부한다는 실패 테스트를 작성한다.
- [ ] Red: `PasswordEncoder` Bean이 fixture Configuration이 아니라 인증 보안 Configuration에서 단일 제공된다는 실패 테스트를 작성한다.
- [ ] Green: `SyntheticAuthFixtureInitializer`, Synthetic/Test Fixture Properties와 설정 Bean, 관련 환경변수 바인딩 및 Synthetic 전용 테스트를 제거하고, 삭제한 동작의 부재를 검증하는 테스트로 대체한다.
- [ ] Green: `EmployeeAccountRegistrationService.registerFixture`와 고정 계정 보정 분기를 제거하되, `register`의 사번·이메일 중복 검사, 기존 Team·Position 참조, 비밀번호 정책, 단방향 Hash, 단일 트랜잭션과 `mustChangePassword=true` 계약을 유지한다.
- [ ] Green: fixture Configuration의 `PasswordEncoder` Bean을 제거하고 인증 보안 Configuration에서 단일 Bean으로 제공하여 로그인·비밀번호 변경·직원 등록 의존성이 모든 Profile에서 동일한 Encoder를 주입받도록 한다.
- [ ] Green: `DevEmployeeAccountController`를 fixture 패키지에서 인증 Controller 계층으로 옮기고, Synthetic 설정과 분리된 `auth.dev-employee-account.enabled` / `AUTH_DEV_EMPLOYEE_ACCOUNT_ENABLED` opt-in 설정으로 전환하면서 기존 `/api/dev/auth/employee-account-options` 및 `/api/dev/auth/employee-accounts` 요청·응답 계약과 Production 미등록·CSRF 보호를 유지한다.
- [ ] Refactor: `auth.fixture` 제품 패키지와 fixture 전용 이름·중복 Configuration을 제거하고 테스트 데이터는 각 테스트의 Setup 또는 Factory에서 직접 생성하도록 정리하되, 인증·최초 비밀번호 변경·세션 검증의 단언을 삭제하거나 약화하지 않는다.
- [ ] `backend/API.md`, `backend/README.md`, `backend/DB_SCHEMA.md`에서 Synthetic 자동 계정·기존 환경변수 설명을 제거하고 개발용 수동 계정 Adapter의 새 활성화 조건, Production 차단, 비밀정보 비커밋 조건을 실제 코드와 동기화한다.
- [ ] 구현 문제로 실패하면 원인을 기록하고 최대 3회까지 수정·재검증하며, 이후에도 실패하면 우회하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.controller.DevEmployeeAccountControllerTest" --tests "com.flowbi.domain.auth.security.SyntheticAuthRemovalTest" --tests "com.flowbi.domain.auth.security.SecurityConfigurationIntegrationTest" --tests "com.flowbi.domain.user.service.EmployeeAccountRegistrationServiceTest"`를 실행해 자동 계정 생성 부재, Adapter 등록 경계, CSRF, 정상 등록과 Encoder Bean 소유권을 검증한다.
- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.auth.repository.AuthenticationPersistenceIntegrationTest"`를 실행해 PostgreSQL에서 일반 직원과 Hash Credential이 한 트랜잭션으로 저장되고 Synthetic 초기화에 의존하지 않는지 검증한다.
- [ ] `rg -n -i "SyntheticAuth|Synthetic Fixture|registerFixture|auth\.test-fixtures|AUTH_TEST_FIXTURES" backend/src/main backend/API.md backend/DB_SCHEMA.md backend/README.md` 결과가 0건인지 확인해 제품 코드·설정·현재 계약 문서에서 레거시 Synthetic 계약이 제거되었음을 검증하고, `rg -n "auth\.dev-employee-account|AUTH_DEV_EMPLOYEE_ACCOUNT_ENABLED" backend/src/main backend/src/test backend/API.md backend/README.md`가 새 opt-in 계약과 테스트를 찾는지 확인한다. 제거 동작 자체는 앞선 `SyntheticAuthRemovalTest`와 `EmployeeAccountRegistrationServiceTest`로 검증한다.
- [ ] `backend`에서 `./gradlew spotlessCheck`를 실행해 변경한 Java 소스와 테스트 Formatting을 검증한다.
- [ ] 오류 응답·로그·테스트 출력에 평문 비밀번호, 비밀번호 Hash, CSRF 값, Session ID와 불필요한 개인정보가 포함되지 않는지 확인한다.
- [ ] Red → Green → Refactor 각 단계의 명령과 결과, `SYNTHETIC-001`, `SYNTHETIC-002`, `SYNTHETIC-004`~`SYNTHETIC-006` 충족 여부를 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 로그인, 최초 비밀번호 변경, 세션과 정상 직원 등록 기능에 회귀 문제가 없어야 한다.
- Mandatory Gate 중 Permission/Security, Scope, Requirements, TDD, Automated Verification, Contract Sync, Critical Findings가 모두 `PASS`여야 한다.
- TDD가 적용되며 Red → Green → Refactor 순서와 각 단계의 검증 증거가 있어야 한다.
- 요구사항 ID `SYNTHETIC-001`, `SYNTHETIC-002`, `SYNTHETIC-004`~`SYNTHETIC-006`이 테스트와 실행 기록에 추적되어야 한다.
- 문서 갱신 대상 `backend/API.md`, `backend/README.md`, `backend/DB_SCHEMA.md`가 코드·설정과 일치해야 한다.
- 공개 인증 방식, 권한 모델, DB 스키마와 Migration은 변경하지 않아야 하며 이를 변경해야 하는 상황은 구현하지 않고 사람 검토로 전환해야 한다.
- 이 Task의 `quality_score`가 인증·보안 작업 기준인 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목 누락 또는 검증 실패
- 애플리케이션 시작이나 테스트 실행으로 고정 Synthetic 계정이 생성됨
- Production Profile에서 개발용 직원 계정 Controller가 등록되거나 인증·인가 우회 경로가 확대됨
- 평문 비밀번호, 비밀번호 Hash, CSRF 값 또는 Session ID가 소스·문서·로그·응답에 노출됨
- `PasswordEncoder` Bean 제거로 Application Context, 로그인 또는 비밀번호 변경이 실패함
- 테스트 삭제·단언 약화·Mock 우회로 인증 또는 트랜잭션 회귀를 숨김
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경
- 관련 Product Spec·Design Doc·Security 기준과 다른 동작 구현
- Red → Green → Refactor 증거 누락 또는 3회 수정·재검증 후에도 동일 실패
- Mandatory Gate 중 하나라도 미통과하거나 `quality_score`가 `90` 미만임

#### 제외 범위

- 운영용 직원 계정 생성 API와 인사팀 관리자 RBAC 구현
- 로그인·세션·비밀번호 정책과 개발 Adapter의 기존 요청·응답 계약 자체의 변경
- `/api/dev/auth`의 URL, 요청·응답 DTO와 정상 등록 비즈니스 규칙 변경
- DB 스키마, Flyway Migration과 기존 로컬 DB 데이터 삭제
- 프론트엔드 로그인 화면과 Cypress 변경
- 전체 Backend lint, test, build 실행은 모든 Task 완료 후 Harness 실행기가 수행한다.

#### 작업 결과

`none`

#### 남은 문제

`운영용 직원 등록은 인증 Design Doc에 따라 인사팀 관리자 RBAC가 구현될 때까지 별도 후속 작업으로 남는다. 개발용 Adapter는 그 전까지만 local/test opt-in 경계에서 유지한다.`

---

### Task 2. 프론트엔드 자격증명 노출 제거 및 개발 계정 생성 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

로그인 화면의 런타임 Synthetic 자격증명 계약과 표시 UI를 제거하면서, 개발 환경에서 수동으로 일반 직원 계정을 생성하고 해당 사번으로 로그인 입력을 이어가는 접근 가능한 흐름을 유지한다.

#### 수정 가능 경로

- `frontend/src/features/auth`
- `frontend/cypress/e2e`

#### 수정 금지 경로

- `frontend/src/features/calendar`
- `frontend/src/features/dashboard`
- `frontend/src/shared`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 개발 빌드에서도 로그인 화면에 고정 사번·비밀번호가 표시되지 않고, 레거시 런타임 전역 자격증명 값에 의존하지 않는다는 LoginPage 단위 테스트를 먼저 작성한다.
- [ ] Red: 개발 환경의 직원 계정 생성 버튼·모달은 유지되고 생성 성공 후 반환된 사번만 로그인 입력에 반영되며 비밀번호는 화면이나 상태에 자동 주입되지 않는다는 실패 테스트를 작성한다.
- [ ] Red: `frontend/cypress/e2e/synthetic/**`에 테스트 자격증명 비노출과 개발용 수동 계정 생성 후 로그인 입력 연계를 검증하는 Cypress 시나리오를 먼저 작성한다.
- [ ] Green: `window.__FLOW_BI_TEST_ACCOUNTS__`, TestAccount 타입·조회·Notice와 고정 자격증명 렌더링을 제거하고 관련 테스트를 새 비노출 계약으로 교체한다.
- [ ] Green: 수동 직원 계정 생성 진입점을 Synthetic Notice와 분리된 개발 전용 컴포넌트로 이동하고 `import.meta.env.DEV`에서만 Lazy Loading하며, Adapter가 비활성화되어 API가 `404`를 반환하는 상태를 포함해 기존 Modal 접근성·오류·Loading·Empty 상태와 계정 생성 API 계약을 유지한다.
- [ ] Green: 기존 단위·Cypress 테스트의 전역 고정 Synthetic 계정 의존과 의미 있는 Synthetic 명칭을 테스트별 독립 입력으로 교체하되 로그인·최초 비밀번호 변경·라우팅 단언을 삭제하거나 약화하지 않는다.
- [ ] Refactor: 더 이상 사용하지 않는 import, 전역 Window 선언, 파일과 스타일 Hook을 제거하고 로그인 화면에는 운영 인증 입력과 개발 수동 계정 생성 책임만 남긴다.
- [ ] 구현 문제로 검증이 실패하면 원인을 기록하고 최대 3회까지 수정·재검증하며, 이후에도 실패하면 우회하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `frontend`에서 `npm run test:unit -- src/features/auth/LoginPage.test.tsx src/features/auth/EmployeeAccountModal.test.tsx`를 실행해 자격증명 비노출, 생성 사번 반영, 비밀번호 미주입과 Modal 상태·접근성을 검증한다.
- [ ] `frontend`에서 `npm run cy:run -- --spec "cypress/e2e/synthetic/**/*.cy.ts"`를 실행해 로그인 화면에 테스트 계정 정보가 없고, API Intercept와 Frontend 요청이 Task 1의 개발 Adapter 요청·응답 및 `404` 비활성 계약과 충돌하지 않으며, 생성된 사번만 로그인 입력에 반영되는지 검증한다.
- [ ] `rg -n -i "__FLOW_BI_TEST_ACCOUNTS__|TestAccountNotice|SyntheticAuth|Synthetic Fixture" frontend/src frontend/cypress` 결과가 0건인지 확인한다.
- [ ] `frontend`에서 `npm run typecheck`, `npm run lint`, `npm run format:check`를 실행해 Type·Lint·Formatting을 검증한다.
- [ ] Cypress에서 PC `1280x720`과 Mobile `390x844` viewport로 로그인 입력, 개발 계정 생성 버튼·모달의 키보드 접근, Focus 복귀, Loading·Empty·Error 상태를 확인한다.
- [ ] Red → Green → Refactor 각 단계의 명령과 결과, `SYNTHETIC-003`~`SYNTHETIC-005` 충족 여부를 실행 기록에 남긴다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 로그인, 최초 비밀번호 변경, 개발 직원 계정 생성과 인증 라우팅에 회귀 문제가 없어야 한다.
- Mandatory Gate 중 Permission/Security, Scope, Requirements, TDD, Automated Verification, Contract Sync, Critical Findings가 모두 `PASS`여야 한다.
- TDD가 적용되며 Red → Green → Refactor 순서와 각 단계의 검증 증거가 있어야 한다.
- 요구사항 ID `SYNTHETIC-003`~`SYNTHETIC-005`가 단위 테스트·Cypress·실행 기록에 추적되어야 한다.
- 문서 갱신 대상은 없으며 Task 1에서 확정한 개발 Adapter 계약만 사용해야 한다.
- 프론트엔드 번들, DOM, 전역 Window와 로그에 고정 테스트 사번·비밀번호가 없어야 한다.
- 인증 방식이나 개발 Adapter API 계약 변경이 추가로 필요하면 임의 구현하지 않고 사람 검토로 전환해야 한다.
- 이 Task의 `quality_score`가 인증·보안 작업 기준인 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목 누락 또는 검증 실패
- 개발 또는 Production 빌드의 화면·DOM·전역 Window·번들에 고정 테스트 자격증명이 남음
- 개발 수동 계정 생성 기능까지 제거되어 로컬에서 정상 계정을 준비할 경로가 사라짐
- 생성된 초기 비밀번호가 자동 입력·표시·로그 출력됨
- 실제 API 계약과 다른 Mock으로 Cypress 또는 단위 테스트를 통과시킴
- 테스트 삭제·단언 약화로 로그인·최초 비밀번호 변경·접근성 회귀를 숨김
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경
- 관련 Product Spec·Design Doc·Security 기준과 다른 동작 구현
- Red → Green → Refactor 증거 누락 또는 3회 수정·재검증 후에도 동일 실패
- Mandatory Gate 중 하나라도 미통과하거나 `quality_score`가 `90` 미만임

#### 제외 범위

- 개발용 직원 계정 Adapter의 Backend 구현과 설정
- 운영용 회원가입 또는 관리자 직원 등록 UI
- 로그인·최초 비밀번호 변경·세션 정책 변경
- 전역 디자인 시스템 또는 인증 외 화면 리팩터링
- 전체 Frontend check, test, build 실행은 모든 Task 완료 후 Harness 실행기가 수행한다.

#### 작업 결과

`none`

#### 남은 문제

`개발용 수동 직원 계정 생성 UI는 운영용 관리자 직원 등록 UI가 구현되면 제거 여부를 별도 검토한다.`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 요구사항 ID `SYNTHETIC-001`~`SYNTHETIC-006`의 인수 조건이 모두 충족되어야 한다.
- 전체 Mandatory Gate가 모두 `PASS`이고 전체 `quality_score`가 `90` 이상이어야 한다.
- 고정 Synthetic 계정 없이 테스트별 준비 데이터로 로그인·최초 비밀번호 변경·세션·직원 등록 검증이 통과해야 한다.
- 개발용 직원 계정 Adapter는 Backend의 `local` 또는 `test` Profile과 명시적 opt-in의 교집합에서만 등록되고, 수동 생성 UI는 Frontend 개발 빌드에서만 노출되며 Adapter 비활성 `404`를 안전하게 처리해야 한다.
- Harness 실행기가 Backend `spotlessCheck`, `test`, `build`와 Frontend `check`, Cypress 대상 시나리오를 최종 1회 실행해 모두 통과해야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec, Design Doc, Architecture 또는 Security 기준과 충돌함
- 고정 Synthetic 계정 생성·자격증명 노출·전역 계정 의존이 남음
- Production Profile에서 개발용 계정 생성 경로가 등록되거나 인증 우회가 발생함
- 기존 사용자 변경을 관련 없이 되돌리거나 DB 데이터를 삭제함
- 현재 Active Plan 간 Synthetic 유지·제거 요구가 충돌한 상태로 동시 실행됨
- 남은 문제가 사용자 확인 없이 방치됨
- 전체 Mandatory Gate 중 하나라도 미통과하거나 전체 `quality_score`가 `90` 미만임
