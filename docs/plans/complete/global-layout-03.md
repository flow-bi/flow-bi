# 작업 계획: global-layout-03

## 1. 기본 정보

### 사용자 요청

공용 레이아웃의 헤더에 하드코딩된 이름 대신 현재 로그인한 사용자의 실제 이름이 표시되도록 연동한다.

### 작업 목적

인증 세션에는 변경 가능한 프로필 정보를 저장하지 않는 기존 보안 원칙을 유지하면서, 서버가 인증 Principal로 식별한 현재 사용자의 최소 이름 정보를 제공하고 공용 헤더가 이를 조회해 표시하도록 한다. 클라이언트가 사용자 ID를 전달하거나 정적 이름으로 인증 사용자를 가장하지 않게 하며 로딩, 실패, 재시도와 세션 만료 상태를 명확하게 처리한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/global-layout.md`, `docs/product-specs/auth.md`, `docs/product-specs/my-page.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/API.md`, `backend/BACKEND.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `GL-CURRENT-USER-001`: 정상 인증 사용자는 요청에 사용자 ID를 제공하지 않고 `/api/me/header`에서 자신의 이름을 문자열 `name` 필드 하나로 포함한 헤더용 응답을 조회할 수 있다.
- `GL-CURRENT-USER-002`: 현재 사용자 API는 인증 Principal의 불변 `userId`만 신뢰하고, 미인증·비밀번호 변경 필요·비활성 또는 존재하지 않는 사용자 요청을 기존 보안 계약에 따라 안전하게 거부한다.
- `GL-CURRENT-USER-003`: 현재 사용자 응답은 헤더 표시에 필요한 `name`만 제공하고 사번, 이메일, 조직 정보, 권한, Credential과 세션 정보를 노출하지 않으며 `Cache-Control: no-store`를 적용한다.
- `GL-CURRENT-USER-004`: 정상 인증 화면의 공용 헤더는 하드코딩된 이름이 아니라 `GET /api/me/header`에서 받은 현재 사용자 이름을 데스크톱과 모바일에서 표시한다.
- `GL-CURRENT-USER-005`: 이름 조회의 로딩과 실패를 텍스트로 구분하고 재시도 수단을 제공하며, `401` 응답은 기존 전역 세션 만료 경계를 통해 로그인 화면으로 전환한다.
- `GL-CURRENT-USER-006`: 현재 사용자 API부터 공용 헤더 표시까지의 핵심 흐름을 Backend 테스트, Component Test와 Cypress E2E로 검증한다.

---

## 2. 실행 Task

### Task 1. 인증 Principal 기반 현재 사용자 이름 조회 API

#### 선행 Task

- `없음`

#### 작업 목적

현재 인증 사용자의 내부 식별자를 서버에서만 해석하여 공용 헤더에 필요한 이름 하나만 반환하는 보호 API를 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/user/controller`
- `backend/src/main/java/com/flowbi/domain/user/dto`
- `backend/src/main/java/com/flowbi/domain/user/service`
- `backend/src/main/java/com/flowbi/domain/user/repository`
- `backend/src/test/java/com/flowbi/domain/user`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: `GET /api/me/header`가 정상 인증 Principal의 사용자 이름을 문자열 `name` 필드 하나로 반환하고 `Cache-Control: no-store`를 설정하는 Controller 테스트를 먼저 작성하여 Endpoint 미구현 실패를 기록한다.
- [ ] Red: 요청 Path, Query 또는 Header의 사용자 ID를 받지 않고 Principal의 내부 `userId`만 사용하는지 검증하며, 다른 사용자의 이름과 사번·이메일·팀·직급·역할·Credential·세션 정보가 응답에 포함되지 않는 테스트를 작성한다.
- [ ] Red: 미인증 요청은 `401 UNAUTHENTICATED`, 비밀번호 변경 필요 사용자는 `403 PASSWORD_CHANGE_REQUIRED`, 비활성 또는 존재하지 않는 Principal 사용자는 개인정보를 추가 노출하지 않는 안전한 실패 응답으로 처리되는 테스트를 작성한다.
- [ ] Green: 현재 사용자 이름 전용 응답 DTO와 User Service 조회 경계를 추가하고 Controller가 검증된 `LoginPrincipal`의 `userId`만 전달하도록 구현한다.
- [ ] Green: User Repository는 활성 사용자 한 명의 이름만 조회하고 Entity나 기존 상세 응답을 API에 직접 노출하지 않으며, 사용자 이름을 세션이나 Redis 속성에 복제하지 않는다.
- [ ] Green: 헤더 전용 `/api/me/header` 보호 GET Endpoint에 최소 성공 응답, 인증·비밀번호 변경·사용자 비노출 오류와 캐시 금지 계약을 구현하고 `/api/me`는 향후 마이페이지 확장 경로로 보존한다.
- [ ] Green: `backend/API.md`와 OpenAPI 계약을 실제 Endpoint, 응답 필드, Principal 식별 기준, 오류 및 데이터 최소화 계약과 동기화한다.
- [ ] Refactor: Controller가 Repository에 직접 의존하지 않고 사용자 기본 정보와 인증·세션 책임의 기존 경계를 유지하도록 최소 범위에서 정리한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 사용자 식별·데이터 최소화 단언을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `backend`에서 `./gradlew test --tests "com.flowbi.domain.user.CurrentUserControllerTest" --tests "com.flowbi.domain.user.service.UserServiceTest" --tests "com.flowbi.domain.user.repository.UserRepositoryIntegrationTest" --tests "com.flowbi.domain.user.CurrentUserOpenApiContractTest"`를 실행하여 Principal 식별, 최소 응답, 활성 사용자 조회와 OpenAPI 계약을 검증한다.
- [ ] 저장소 루트에서 `rg -n "api/me|CurrentUser|name|Cache-Control|LoginPrincipal" backend/API.md backend/src/main/java/com/flowbi/domain/user backend/src/test/java/com/flowbi/domain/user`를 실행하여 문서·Controller·Service·Repository·테스트 연결을 확인한다.
- [ ] 저장소 루트에서 `git diff --check -- backend/src/main/java/com/flowbi/domain/user backend/src/test/java/com/flowbi/domain/user backend/API.md`를 실행하여 변경 범위의 patch 형식을 검증한다.

#### 완료 조건

- `GL-CURRENT-USER-001`부터 `GL-CURRENT-USER-003`까지 충족해야 한다.
- Red → Green → Refactor 실행 결과와 인증·데이터 최소화 검증이 기록되어야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 세션 상태 조회와 사용자 상세 조회 API에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 요청에서 받은 사용자 ID를 현재 사용자 식별 기준으로 신뢰하거나 다른 사용자의 이름을 반환함
- 이름 외 개인정보, 권한, Credential 또는 세션 정보가 응답되거나 사용자 이름이 세션에 저장됨
- 미인증·비밀번호 변경 필요·비활성 사용자 요청을 성공으로 처리하거나 안전한 실패 계약을 약화함
- Controller가 Repository에 직접 의존하거나 기존 사용자·인증 도메인 경계를 우회함
- API 구현과 `backend/API.md` 또는 OpenAPI 계약이 불일치함
- 테스트 단언 삭제·약화, 필수 검증 실패 또는 3회 수정 후에도 같은 문제가 지속됨
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경이 발생함
- `quality_score`가 `90` 미만임

#### 제외 범위

- DB Schema와 Migration 변경
- 세션 응답에 이름 또는 일반 프로필 정보를 추가하는 변경
- 마이페이지 전체 정보 조회·수정과 다른 직원의 정보 조회 정책 변경
- 기업명 동적 조회와 회사·테넌트 모델 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 공용 헤더 사용자 이름 연동 및 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

정상 인증 화면에서 현재 사용자 API를 조회해 공용 헤더에 실제 이름을 표시하고 로딩·오류·세션 만료 상태를 사용자에게 명확히 제공한다.

#### 수정 가능 경로

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/test/App.test.tsx`
- `frontend/src/features`
- `frontend/cypress/e2e/global-layout`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/meeting-room`
- `frontend/src/features/schedule-calendar`
- `frontend/src/features/schedule-create`
- `frontend/src/shared`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 현재 사용자 API Client가 `GET /api/me/header`를 세션 Cookie가 포함된 기존 인증 요청 경계로 호출하고 문자열 `name` 필드 계약을 유지하는 실패 테스트를 먼저 작성한다.
- [ ] Red: 공용 헤더가 API에서 받은 사용자 이름을 표시하고 기존 하드코딩 이름을 표시하지 않으며, 데스크톱과 모바일 레이아웃에서 같은 인증 사용자 이름을 제공하는 Component Test를 먼저 작성한다.
- [ ] Red: 이름 조회의 로딩 안내, 일반 조회 실패 Alert와 재시도, `401` 세션 만료 전환을 구분하고 실패를 정적 이름이나 빈 성공 값으로 대체하지 않는 테스트를 작성한다.
- [ ] Green: 현재 사용자 응답 타입과 조회 함수를 별도 Frontend 기능 경계에 추가하고 기존 `authenticatedFetch`를 사용해 전역 세션 만료 알림을 재사용한다.
- [ ] Green: `QueryClientProvider` 내부에서 TanStack Query가 현재 사용자 서버 상태와 재시도를 소유하도록 구성하고, 성공한 `name`을 공용 Header에 전달하여 하드코딩된 사용자 이름과 관련 TODO를 제거한다.
- [ ] Green: 로딩 중에는 이름 조회 진행 상태를 텍스트로 알리고, `401` 이외 오류에는 헤더 영역의 오류 메시지와 재시도 버튼을 제공하며, `401`은 Query Cache 정리와 로그인 화면 전환을 수행하는 기존 세션 경계에 위임한다.
- [ ] Green: 이름을 일반 텍스트로 렌더링하고 임의 HTML을 사용하지 않으며, 이름 조회 응답이나 오류를 브라우저 영속 저장소 또는 로그에 저장하지 않는다.
- [ ] Green: 기존 전역 레이아웃 Cypress 시나리오를 실제 `/api/me/header` 응답 이름 기반으로 갱신하고 데스크톱·390px 모바일에서 이름 표시와 레이아웃 overflow 부재를 검증한다.
- [ ] Refactor: 현재 사용자 Query Key와 API 책임을 새 기능 경계에 응집하고 로그아웃 또는 세션 만료 시 기존 Query Cache 정리 흐름이 사용자 이름도 제거하도록 유지한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 해당 Task 검증을 반복하고, 이후에도 실패하면 하드코딩 이름 복구나 오류 상태 은폐 없이 Task를 실패 처리한다.

#### 검증 항목

- [ ] `frontend`에서 `npm run test:unit -- src/App.test.tsx src/features/current-user`를 실행하여 API 계약, 실제 이름 표시, 로딩·오류·재시도와 세션 만료 동작을 검증한다.
- [ ] `frontend`에서 `npm run typecheck`와 `npm run lint -- src/App.tsx src/App.test.tsx src/features/current-user cypress/e2e/global-layout`를 실행하여 현재 사용자 타입, Query 경계와 접근 가능한 UI를 정적으로 검증한다.
- [ ] `frontend`에서 `npx cypress run --spec "cypress/e2e/global-layout/global-layout.cy.ts"`를 실행하여 Task 1의 문자열 `name` 필드 계약과 충돌 없이 데스크톱·모바일 공용 헤더에 인증 사용자 이름이 표시되는 핵심 흐름을 검증한다.
- [ ] 저장소 루트에서 `rg -n "김유선|userName=\"" frontend/src/App.tsx frontend/src/App.test.tsx frontend/cypress/e2e/global-layout` 결과가 0건이고, `rg -n "api/me|current-user|name" frontend/src/App.tsx frontend/src/features frontend/cypress/e2e/global-layout`가 조회와 표시 계약을 찾는지 확인한다.
- [ ] 저장소 루트에서 `git diff --check -- frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/features frontend/cypress/e2e/global-layout`를 실행하여 변경 범위의 patch 형식을 검증한다.

#### 완료 조건

- `GL-CURRENT-USER-004`부터 `GL-CURRENT-USER-006`까지 충족해야 한다.
- Red → Green → Refactor 실행 결과와 Component·Cypress 검증이 기록되어야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 인증 라우팅, 로그아웃, 회의실·캘린더 화면과 반응형 공용 레이아웃에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 헤더에 하드코딩 이름이나 서버가 제공하지 않은 대체 이름을 표시함
- `/api/me/header` 응답과 다른 Mock·타입으로 테스트를 통과시키거나 사용자 ID를 클라이언트에서 전송함
- 로딩·오류·세션 만료 상태를 구분하지 않거나 실패를 빈 이름 또는 성공 상태로 처리함
- 이름·응답 정보를 브라우저 영속 저장소나 로그에 남기거나 임의 HTML로 렌더링함
- 로그아웃·세션 만료 후 이전 사용자의 이름이 Query Cache 또는 화면에 남음
- 테스트 단언 삭제·약화, 필수 검증 실패 또는 3회 수정 후에도 같은 문제가 지속됨
- 이 Task의 수정 금지 경로 또는 수정 가능 경로 밖 변경이 발생함
- `quality_score`가 `90` 미만임

#### 제외 범위

- 기업명 `Flow BI`의 동적 조회와 회사·테넌트 설정
- 사용자 이름 수정, 프로필 사진, 팀·직급·업무 상태와 마이페이지 UI
- 역할·권한에 따른 헤더 기능 추가와 관리자 테마 설정
- 전역 검색 또는 공용 레이아웃의 시각적 재설계

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- `GL-CURRENT-USER-001`부터 `GL-CURRENT-USER-006`까지 모두 충족해야 한다.
- 모든 Task의 구현 항목과 검증 항목이 통과해야 한다.
- Task 1의 Principal 기반 최소 이름 API와 Task 2의 공용 헤더 표시가 기존 세션 만료·Query Cache 정리 흐름과 정상 통합되어야 한다.
- 각 Task가 Red → Green → Refactor 순서와 검증 결과를 실행 기록에 남겨야 한다.
- 모든 Task 완료 후 Harness 최종 검증에서 Backend 전체 `spotlessCheck`, `test`, `build`와 Frontend 전체 `check`, 관련 Cypress E2E가 통과해야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- `backend/API.md`, 서버 응답 DTO와 Frontend 응답 타입이 일치해야 한다.
- 인증·데이터 최소화, TDD, 자동 검증과 Contract Sync Gate가 모두 `PASS`여야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task, 구현 항목 또는 검증 항목이 실패함
- 인증 Principal이 아닌 클라이언트 입력으로 현재 사용자를 식별하거나 다른 사용자의 정보가 노출됨
- 이름 외 불필요한 개인정보·권한·Credential·세션 정보가 응답 또는 클라이언트 저장소에 포함됨
- 공용 헤더에 하드코딩 이름이 남거나 API 이름과 화면 표시가 불일치함
- 로딩·오류·세션 만료를 구분하지 않거나 실패 상태를 성공으로 위장함
- Backend API 문서, 서버 DTO와 Frontend 타입이 불일치함
- 필수 테스트 단언을 삭제·약화하거나 인증·오류 검증을 우회함
- Task별 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 관련 Product Spec, Design Doc, Architecture 또는 Security 원칙과 충돌함
- 남은 문제가 사용자 확인 없이 방치되거나 전체 `quality_score`가 `90` 미만임
