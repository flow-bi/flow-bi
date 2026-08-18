# 작업 계획: login-auth-04

## 1. 기본 정보

### 사용자 요청

최초 로그인 사용자가 강제 비밀번호 변경 화면에서 오류로 갇히지 않도록 비밀번호 변경을 정상화하고, 변경할 수 없는 경우 현재 세션을 로그아웃할 수 있게 한다. 현재 개발 상태와 원인을 확인한 결과를 기준으로 회귀 방지 계획을 수립한다.

### 작업 목적

임시 비밀번호 로그인 후 비밀번호 변경과 로그아웃에 필요한 CSRF 발급 요청이 강제 변경 필터에 차단되는 문제를 수정하고, 강제 변경 화면에 명시적인 로그아웃 경로를 제공한다. 기존 Redis 세션 세대 기반 무효화, 현재 세션 유지, 일반 기능 접근 제한 정책은 변경하지 않는다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `backend/API.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`

### 현재 구현 상태

- 로그인, Redis 기반 세션, 세션 상태 조회, 최초 비밀번호 변경 API, 비밀번호 정책 검증, 현재 세션 유지와 다른 세션 무효화 로직은 구현되어 있다.
- 프런트엔드는 세션의 `mustChangePassword` 값으로 비밀번호 변경 화면에 라우팅하고 변경 API 및 로그아웃 API를 호출할 수 있다.
- `changePassword`와 `logout`은 상태 변경 요청 전에 `GET /api/auth/csrf`를 호출하지만, `MustChangePasswordFilter`는 강제 변경 상태에서 이 경로를 허용하지 않아 두 흐름이 `403 PASSWORD_CHANGE_REQUIRED`로 중단된다.
- 강제 비밀번호 변경 화면에는 로그아웃 실행 요소가 없어 변경 실패 시 사용자가 현재 세션에서 벗어날 수 없다.
- 기존 백엔드 테스트는 비밀번호 변경·로그아웃 Endpoint 자체만 허용되는지 확인하고 CSRF 발급 선행 요청은 다루지 않는다. 기존 Cypress 테스트는 CSRF 성공 응답을 Mock하여 실제 필터 충돌을 재현하지 못한다.

---

## 2. 실행 Task

### Task 1. 강제 비밀번호 변경 세션의 CSRF 발급 허용

#### 선행 Task

- 없음

#### 작업 목적

`mustChangePassword=true`인 인증 세션이 비밀번호 변경과 로그아웃에 필요한 CSRF Cookie를 발급받을 수 있게 하되, 그 밖의 일반 API 접근 제한은 유지한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth/password`
- `backend/src/test/java/com/flowbi/domain/auth/password`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 강제 비밀번호 변경 Principal로 `GET /api/auth/csrf`를 요청하면 CSRF 발급 응답을 받고, 일반 보호 API는 계속 `403 PASSWORD_CHANGE_REQUIRED`로 거부되는 실패 테스트를 먼저 작성한다.
- [ ] Green: `MustChangePasswordFilter`의 허용 경로에 정확한 HTTP Method와 CSRF Endpoint만 최소 추가하여 비밀번호 변경·로그아웃의 보안 선행 요청을 통과시킨다.
- [ ] Refactor: 허용 경로 판정을 읽기 쉬운 형태로 정리하되 허용 범위를 넓히지 않고 기존 비밀번호 변경·로그아웃 예외 동작을 유지한다.
- [ ] `backend/API.md`의 강제 비밀번호 변경 허용 Endpoint 계약에 CSRF 발급 경로와 용도를 동기화한다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최대 3회까지 같은 Task의 검증을 반복하며, 우회나 보안 검증 완화 없이 실패 원인을 기록한다.

#### 검증 항목

- [ ] `backend`에서 `./gradlew test --tests com.flowbi.domain.auth.password.MustChangePasswordFilterTest`를 실행해 CSRF 발급 허용, 일반 API 차단, 비밀번호 변경·로그아웃 허용을 검증한다.
- [ ] `backend`에서 `./gradlew spotlessCheck`를 실행해 변경한 Java 코드의 정적 형식 검증을 통과한다.
- [ ] 허용 경로가 `GET /api/auth/csrf`, `GET /api/auth/session`, `PUT /api/auth/password`, `POST /api/auth/logout`로 한정되고 미인증·일반 API 접근 정책이 완화되지 않았는지 테스트로 확인한다.
- [ ] 오류 응답과 로그에 비밀번호, CSRF 값, 세션 식별자가 노출되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 요구사항 FR-009, FR-010, NFR-001과 최초 로그인 비밀번호 변경 인수 조건을 충족해야 한다.
- Mandatory Gate의 permission_security, scope, requirements, tdd, automated_verification, contract_sync, critical_findings가 모두 PASS여야 한다.
- TDD `Red → Green → Refactor` 단계와 각 검증 결과가 작업 결과에 기록되어야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `backend/API.md`와 실제 허용 경로가 일치해야 한다.
- 인증·보안 작업 기준 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- CSRF 발급 외 일반 기능 접근이 강제 변경 상태에서 허용됨
- CSRF 보호를 비활성화하거나 Cookie·세션 정책을 완화함
- 비밀번호 변경 또는 로그아웃 Endpoint가 계속 CSRF 선행 요청 단계에서 차단됨
- 테스트 또는 Spotless 검증 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- 요구사항·API 계약과 다른 동작 구현
- 검증할 수 없는 상태로 종료하거나 `quality_score`가 90 미만임

#### 제외 범위

- CSRF 저장 방식, Cookie 속성, 세션 만료 정책 변경
- Redis 세션 세대 알고리즘과 비밀번호 정책 변경
- DB 스키마 또는 Migration 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 강제 비밀번호 변경 화면의 로그아웃 탈출 경로

#### 선행 Task

- `Task 1`

#### 작업 목적

비밀번호 변경에 실패하거나 사용자가 변경을 중단하려는 경우 강제 변경 화면에서 현재 세션을 로그아웃하고 로그인 화면으로 돌아갈 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features/auth`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/test`

#### 수정 금지 경로

- `frontend/src/features/auth/devEmployeeAccounts.ts`
- `frontend/src/features/auth/EmployeeAccountModal.tsx`
- `frontend/src/index.css`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: 강제 비밀번호 변경 화면에서 로그아웃 실행 요소가 보이고, 실행 시 현재 세션 로그아웃 요청 후 로그인 화면으로 이동하는 실패 컴포넌트·앱 테스트를 먼저 작성한다.
- [ ] Red: 비밀번호 변경과 로그아웃 요청이 Task 1의 CSRF 허용 계약을 사용하며 오류 발생 시 사용자가 이해할 수 있는 상태를 제공하는 실패 테스트를 작성한다.
- [ ] Green: `PasswordChangePage`에 키보드로 접근 가능한 로그아웃 실행 요소를 추가하고 `App`의 현재 세션 로그아웃 흐름에 연결한다.
- [ ] Green: 비밀번호 변경 성공 시 기존처럼 현재 세션을 유지한 채 일반 화면으로 이동하고, 로그아웃 성공 시 인증 화면 상태와 민감한 입력값을 정리한 뒤 로그인 화면으로 이동한다.
- [ ] Refactor: 변경과 로그아웃의 제출 중복 방지, 오류 표시, 포커스 이동을 기존 인증 UI 패턴과 일관되게 정리한다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최대 3회까지 같은 Task의 검증을 반복하며, 성공으로 위장하거나 단언을 약화하지 않는다.

#### 검증 항목

- [ ] `frontend`에서 `npm run test:unit -- src/features/auth/api.test.ts src/features/auth/PasswordChangePage.test.tsx src/test/App.test.tsx`를 실행한다.
- [ ] `frontend`에서 `npm run typecheck`, `npm run lint`, `npm run format:check`를 실행한다.
- [ ] 선행 Task의 CSRF 허용 계약과 충돌 없이 비밀번호 변경과 로그아웃 요청이 Cookie 인증 및 `X-XSRF-TOKEN` Header를 유지하는지 확인한다.
- [ ] 비밀번호 변경 성공, 정책 오류, 세션 만료, 로그아웃 성공·실패, 중복 제출 방지 상태를 검증하고 비밀번호가 화면·오류·로그에 노출되지 않는지 확인한다.
- [ ] 로그아웃 실행 요소의 접근 가능한 이름, 키보드 조작, 오류 포커스와 제출 중 상태를 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 요구사항 FR-010, NFR-001과 “비밀번호 변경과 로그아웃 외 일반 기능 접근 제한” 인수 조건을 충족해야 한다.
- Mandatory Gate의 permission_security, scope, requirements, tdd, automated_verification, contract_sync, critical_findings가 모두 PASS여야 한다.
- TDD `Red → Green → Refactor` 단계와 각 검증 결과가 작업 결과에 기록되어야 한다.
- 비밀번호 변경 화면에서 현재 세션을 로그아웃할 수 있고 성공 후 로그인 화면으로 이동해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 인증·보안 작업 기준 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 강제 비밀번호 변경 화면에서 로그아웃을 실행할 수 없음
- 로그아웃 실패를 성공으로 표시하거나 보호 화면·비밀번호 입력값을 부적절하게 유지함
- 비밀번호 변경 성공 후 현재 세션이 불필요하게 종료되거나 일반 화면 이동이 실패함
- 단위 테스트, TypeScript, Lint 또는 Formatting 검증 실패
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- Product Spec의 강제 변경·로그아웃 동작과 충돌함
- 검증할 수 없는 상태로 종료하거나 `quality_score`가 90 미만임

#### 제외 범위

- 일반 마이페이지 비밀번호 변경 화면
- 모든 기기 로그아웃 및 기기별 세션 관리 UI
- 로그인 화면 또는 전역 레이아웃의 시각적 재설계

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 최초 로그인 비밀번호 변경 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`

#### 작업 목적

최초 로그인부터 비밀번호 변경 성공 또는 현재 세션 로그아웃까지의 실제 브라우저 사용자 흐름을 회귀 테스트로 고정하여 같은 갇힘 문제가 재발하지 않게 한다.

#### 수정 가능 경로

- `frontend/cypress/e2e/login-auth`

#### 수정 금지 경로

- `frontend/src`
- `frontend/cypress/e2e/auth-routing`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: 임시 비밀번호 로그인 후 강제 변경 화면으로 이동하고 CSRF 발급을 거쳐 새 비밀번호 변경에 성공한 뒤 일반 화면에 진입하는 Cypress 실패 시나리오를 작성한다.
- [ ] Red: 강제 변경 화면에서 로그아웃하면 현재 세션 종료 요청이 전송되고 로그인 화면으로 복귀하는 Cypress 실패 시나리오를 작성한다.
- [ ] Green: Task 1과 Task 2의 공개 API·UI 계약만 사용하도록 Intercept와 검증을 구성해 두 시나리오를 통과시킨다.
- [ ] Refactor: 기존 `auth-routing` 테스트와 책임이 중복되지 않도록 최초 로그인 갇힘 회귀에 필요한 요청 순서와 사용자 관찰 결과만 유지한다.
- [ ] 테스트 Fixture와 실패 출력에 실제 비밀번호, 세션 ID, CSRF 값을 기록하지 않고 합성 값만 사용한다.
- [ ] 구현 문제로 검증이 실패하면 원인을 수정하고 최대 3회까지 같은 Task의 검증을 반복하며, Mock 응답으로 오류를 숨기거나 단언을 약화하지 않는다.

#### 검증 항목

- [ ] `frontend`에서 `npm run cy:run -- --spec "cypress/e2e/login-auth/**/*.cy.ts"`를 실행한다.
- [ ] 선행 Task의 허용 경로와 화면 계약을 기준으로 로그인, CSRF 발급, 비밀번호 변경, 일반 화면 이동의 요청 순서와 결과를 통합 검증한다.
- [ ] 선행 Task의 로그아웃 경로와 충돌 없이 강제 변경 화면에서 로그아웃 후 보호 화면이 남지 않고 로그인 화면이 표시되는지 검증한다.
- [ ] 강제 변경 상태에서 일반 기능으로 직접 이동할 수 없고, 비밀번호 변경 또는 로그아웃이라는 두 종료 경로가 모두 제공되는지 확인한다.
- [ ] Cypress 결과와 스크린샷·로그에 인증 민감정보가 노출되지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 요구사항 FR-009, FR-010, NFR-001, NFR-002와 최초 로그인 비밀번호 변경 인수 조건을 충족해야 한다.
- Mandatory Gate의 permission_security, scope, requirements, tdd, automated_verification, contract_sync, critical_findings가 모두 PASS여야 한다.
- TDD `Red → Green → Refactor` 단계와 각 검증 결과가 작업 결과에 기록되어야 한다.
- 비밀번호 변경 성공 경로와 로그아웃 탈출 경로가 브라우저 테스트에서 모두 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 인증·보안 작업 기준 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 최초 로그인 사용자가 비밀번호 변경 오류 후 강제 변경 화면에서 빠져나갈 수 없음
- 비밀번호 변경 성공 후 일반 화면 진입 실패 또는 로그아웃 후 보호 화면 잔류
- Cypress가 실제 요청 순서나 사용자 관찰 결과를 검증하지 않고 성공 Mock만 확인함
- Cypress 검증 실패 또는 민감정보가 테스트 산출물에 노출됨
- 수정 금지 경로 또는 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc의 세션 유지·무효화 정책과 충돌함
- 검증할 수 없는 상태로 종료하거나 `quality_score`가 90 미만임

#### 제외 범위

- 실제 운영 Redis·PostgreSQL을 사용하는 배포 환경 End-to-End 검증
- 일반 비밀번호 변경, 관리자 초기화, 역할 변경 세션 무효화 흐름
- 다중 기기 세션 관리 UI와 성능·부하 테스트

#### 작업 결과

`none`

#### 남은 문제

- Cypress 개발 서버의 API Intercept 기반 검증은 실제 Redis·PostgreSQL 연동을 대체하지 않으며, 백엔드 보안 필터 회귀는 Task 1의 Spring 테스트가 담당한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- Task 간 결과가 정상적으로 통합되어 최초 로그인 사용자가 비밀번호 변경 성공 또는 현재 세션 로그아웃으로 강제 변경 화면을 벗어날 수 있어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 인증되지 않은 요청과 강제 변경 상태의 일반 기능 접근은 계속 거부되어야 한다.
- 비밀번호 변경 성공 시 현재 세션은 유지되고 동일 사용자의 다른 세션을 무효화하는 기존 정책이 유지되어야 한다.
- 비밀번호, 비밀번호 해시, 세션 ID와 CSRF 값이 응답·로그·테스트 산출물에 노출되지 않아야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 전체 `quality_score`가 인증·보안 작업 기준 90 이상이어야 한다.
- 모든 Task 완료 후 Harness 실행기가 백엔드 전체 `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`와 프런트엔드 전체 `npm run check`, `npm run test:e2e`를 한 번 수행해 통과해야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- CSRF 보호, 인증·세션 정책 또는 일반 기능 접근 제한이 완화됨
- 최초 로그인 사용자가 비밀번호 변경과 로그아웃을 모두 완료할 수 없어 다시 갇힘
- 기존 현재 세션 유지 또는 다른 세션 무효화 정책에 회귀가 발생함
- 남은 문제가 사용자 확인 없이 방치됨
