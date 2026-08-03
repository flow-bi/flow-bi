# 작업 계획: frontend-unit-test-01

## 1. 기본 정보

### 사용자 요청

프런트엔드 단위·컴포넌트 테스트 환경을 구축하고 프로젝트에 적합한 테스트 구조를 정립한다.

### 작업 목적

현재 Cypress E2E만 구성된 Vite·React·TypeScript 프런트엔드에 빠르고 격리된 단위·컴포넌트 테스트 계층을 추가한다. Vitest가 기존 Vite 설정과 TypeScript 경로 별칭을 공유하게 하고, jsdom·React Testing Library·jest-dom·user-event를 통해 순수 로직과 사용자가 관찰할 수 있는 컴포넌트 동작을 검증한다. Cypress는 핵심 브라우저 흐름에 유지하여 단위·컴포넌트·E2E의 책임을 분리한다.

### 작업 유형

- test

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `frontend/AGENTS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`, `https://vitest.dev/config/`, `https://vitest.dev/config/environment.html`, `https://testing-library.com/docs/react-testing-library/intro/`, `https://testing-library.com/docs/react-testing-library/setup/`, `https://testing-library.com/docs/user-event/intro/`

---

## 2. 실행 Task

### Task 1. Vitest 및 React Testing Library 환경 구축

#### 선행 Task

- `없음`

#### 작업 목적

프런트엔드 작업자가 Vite 설정과 동일한 모듈 변환·경로 별칭 아래에서 순수 TypeScript 로직과 React 컴포넌트를 빠르게 검증하고, Harness가 단위 테스트를 자동 품질 게이트에 포함할 수 있는 최소 실행 환경을 제공한다.

#### 수정 가능 경로

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.app.json`
- `frontend/src`
- `frontend/FRONTEND.md`
- `frontend/README.md`

#### 수정 금지 경로

- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `.agents`
- `frontend/cypress`
- `frontend/cypress.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/index.css`

#### 구현 항목

- [ ] Vitest, jsdom, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`을 개발 의존성으로 추가하고 `package-lock.json`을 동기화한다.
- [ ] Jest, 별도 Babel 변환 계층, 중복 DOM 환경, Browser Mode, Coverage 도구와 Mock Service Worker는 이번 최소 환경에 추가하지 않는다.
- [ ] 기존 `vite.config.ts`가 Vite Plugin과 `@` 경로 별칭을 그대로 제공하면서 Vitest의 `test` 설정도 인식하도록 구성한다.
- [ ] Vitest 대상을 `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx`로 제한하고 기본 환경을 `jsdom`으로 설정하며, 테스트 API는 전역으로 주입하지 않고 각 테스트가 `vitest`에서 명시적으로 import하게 한다.
- [ ] `frontend/src` 아래에 공통 테스트 Setup 경계를 만들고 `@testing-library/jest-dom/vitest` matcher 등록과 `afterEach`의 React Testing Library `cleanup`을 구성한다.
- [ ] `frontend/src` 아래에 제품 코드에 의존하지 않는 최소 환경 계약 테스트를 작성하여 React 렌더링, 접근 가능한 Role·Name 조회, jest-dom matcher와 비동기 `user-event` 상호작용이 함께 동작하는지 검증한다.
- [ ] `test:unit`은 단발성 Headless 실행, `test:unit:watch`는 로컬 Watch 실행으로 Script를 분리하고, 기존 `check` Script에 `test:unit`을 포함하여 Type Check·Lint·Formatting·Build와 함께 실패를 전파한다.
- [ ] `frontend/FRONTEND.md`에 단위·컴포넌트 테스트 기술 기준과 테스트 피라미드의 책임을 기록한다. 순수 함수·Schema·DTO 변환은 Vitest, 컴포넌트의 사용자 관찰 동작은 React Testing Library, 핵심 브라우저 흐름은 Cypress가 담당한다.
- [ ] `frontend/FRONTEND.md`에 기능 테스트는 대상 구현 옆의 `*.test.ts` 또는 `*.test.tsx`로 배치하고, 공통 Setup과 향후 Provider Wrapper만 `src/test`에 두며, 실제 Provider가 필요하기 전에는 범용 `render` Helper를 미리 만들지 않는 구조를 기록한다.
- [ ] `frontend/README.md`에 단발 실행, Watch 실행, 전체 Check 명령과 테스트 파일 명명·실행 방법을 기록한다.
- [ ] TDD 예외: 이 Task는 제품 동작이 아닌 최초 단위 테스트 도구 설정이므로 Red → Green → Refactor를 적용하지 않는다. 대신 설치 전 `test:unit` Script와 Runner가 없음을 기준선으로 기록하고, 환경 계약 테스트·Type Check·전체 Frontend Check를 대체 검증으로 남긴다.
- [ ] 설정 문제로 검증이 실패하면 변경 범위 안에서 최대 3회 수정·재검증하고, 계속 실패하면 검증이나 Type 규칙을 우회하지 않고 Task를 실패 처리하여 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm ls vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom`으로 필요한 개발 의존성과 의존성 해석 오류가 없는지 검증한다.
- [ ] `cd frontend && npm run test:unit`으로 환경 계약 테스트가 Headless에서 종료 코드 0으로 통과하고 열린 Handle 없이 종료되는지 검증한다.
- [ ] `cd frontend && npm run typecheck`로 Vitest, jsdom, jest-dom Type과 기존 Cypress Type이 충돌하지 않는지 검증한다.
- [ ] `cd frontend && npm run check`로 단위 테스트가 전체 Frontend 품질 명령에 포함되고 Type Check·Lint·Formatting·Build가 모두 통과하는지 검증한다.
- [ ] `frontend/cypress`, `frontend/cypress.config.ts`와 제품 기능 파일에 변경이 없으며 단위 테스트 설정에 실제 Token, 비밀번호, 운영 개인정보나 인증 우회 값이 포함되지 않았는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 Cypress E2E 설정과 제품 기능에 회귀 문제가 없어야 한다.
- 요구사항 ID는 `N/A`이다. 사용자 기능이 아닌 내부 테스트 실행 환경 구축이며 Product Spec의 의미를 변경하지 않는다.
- TDD Gate는 승인된 설정 Task 예외와 환경 계약 테스트·Type Check·전체 Check 증거를 근거로 `N/A` 처리해야 한다.
- Mandatory Gate 중 Permission·보안, Active Plan 범위, 요구사항, 승인된 TDD 예외, 자동 검증, 계약 동기화와 Critical Finding이 모두 통과해야 한다.
- 문서 갱신 대상인 `frontend/FRONTEND.md`, `frontend/README.md`와 실제 Package Script·설정·배치 구조가 일치해야 한다.
- Vitest·Testing Library 외의 테스트 러너, Browser Mode, Coverage Gate, MSW 또는 새 외부 서비스가 필요하면 임의로 추가하지 않고 `HUMAN_REVIEW_REQUIRED`로 보고한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- `npm run test:unit`, `npm run typecheck` 또는 `npm run check` 실패
- 환경 계약 테스트가 React 렌더링, 접근 가능한 조회, jest-dom matcher와 `user-event` 상호작용을 모두 검증하지 못함
- Vitest와 Cypress의 전역 Type이 충돌하거나 기존 Vite Plugin·경로 별칭이 깨짐
- `test:unit` 실패가 `npm run check`의 실패로 전파되지 않음
- 실제 제품 컴포넌트나 Cypress E2E Spec을 설정 검증용으로 변경함
- 불필요한 Jest·Babel·Browser Mode·Coverage·MSW 또는 중복 테스트 도구 도입
- 실제 Token, 비밀정보, 운영 개인정보 또는 인증 우회 값 추가
- 승인된 TDD 예외와 대체 검증 증거가 누락됨
- 3회 수정 후에도 필수 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 기존 또는 신규 제품 기능의 단위·컴포넌트 테스트 작성
- Cypress 설정과 E2E Spec 변경
- API Mock Server 및 MSW 도입
- Browser Mode와 실제 Browser 기반 Vitest 실행
- Coverage 도구, 최소 Coverage 비율과 CI/CD Gate 확정
- Visual Regression, Snapshot 중심 테스트와 접근성 전용 Scanner 도입
- Jest 또는 다른 테스트 러너 병행
- Backend 테스트 구성 변경

#### 작업 결과

`none`

#### 남은 문제

- 공통 QueryClient·Router·Form Provider Wrapper는 실제 기능 테스트에서 중복 필요성이 확인될 때 해당 기능 Plan에서 `src/test`에 추가한다.
- API 경계 Mock은 실제 API Client와 계약이 확정된 뒤 MSW 도입 필요성을 별도 검토한다.
- Coverage 측정과 최소 비율은 테스트 기반과 CI 실행 환경이 안정된 후 별도 Plan에서 결정한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 단위·컴포넌트·E2E 테스트의 책임과 파일 배치가 `frontend/FRONTEND.md`에 명시되고 실행 Script와 일치해야 한다.
- Harness의 전체 Frontend 검증에서 `npm run check`가 단위 테스트 실패를 포함하여 정확한 종료 코드를 반환해야 한다.
- 전체 Mandatory Gate가 모두 통과하고 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 관련 Architecture, Frontend 기준 또는 품질 모델과 충돌함
- 기존 Cypress 설정이나 제품 기능을 테스트 환경 구축과 함께 변경함
- 문서와 실제 Package Script·설정·파일 배치가 불일치함
- 남은 문제가 사용자 확인 없이 방치됨
