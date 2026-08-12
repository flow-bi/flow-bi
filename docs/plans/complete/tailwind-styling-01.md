# 작업 계획: tailwind-styling-01

## 1. 기본 정보

### 사용자 요청

Tailwind CSS가 화면 구현에 사용되지 않고 전역 CSS 선택자 위주로 작성된 원인을 확인하고, 프로젝트의 Styling 표준에 맞게 Tailwind CSS가 실제 컴포넌트 스타일링에 적용되도록 개선한다.

### 작업 목적

현재 정상 설치된 Tailwind CSS v4와 Vite 연동을 유지하면서 역할 기반 디자인 토큰을 Tailwind Theme Utility로 노출하고, 전역 Layout과 Calendar 화면의 BEM 전용 스타일을 Tailwind Utility 중심으로 전환하여 `frontend/FRONTEND.md`의 Styling 기준과 실제 구현을 일치시킨다.

### 작업 유형

- refactor
- test

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `없음`
- Architecture: `frontend/FRONTEND.md`
- 기타 참고 문서: `frontend/DESIGN.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. Tailwind Theme Token과 전역 Layout Utility 전환

#### 선행 Task

- `없음`

#### 작업 목적

기존 `:root` 역할 색상과 Layout 값을 Tailwind v4 Utility에서 사용할 수 있게 연결하고, Header·Sidebar·Main Layout을 Tailwind Utility 중심으로 전환하되 기존 반응형·접근성 동작을 유지한다.

#### 수정 가능 경로

- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/cypress/e2e/global-layout`

#### 수정 금지 경로

- `backend`
- `docs`
- `.agents`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`

#### 구현 항목

- [ ] Red: 역할 기반 색상 Utility와 Tailwind 반응형 Utility가 Header·Sidebar·Main Layout에 적용되고 기존 BEM 선택자에 의존하지 않는다는 실패 Component Test와 Cypress Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: Tailwind v4의 `@theme` 또는 `@theme inline`을 사용해 `background`, `surface`, `primary`, `secondary`, `text-primary`, `text-secondary`, `border`, `focus-ring` 역할 토큰을 Utility API로 노출하되 기존 확정 색상 의미를 변경하지 않는다.
- [ ] Green: App Shell, Header, Desktop Sidebar, Mobile Sidebar, Backdrop, Main Content의 Layout·Spacing·Color·Responsive·Focus 스타일을 정적 Tailwind Utility Class로 전환한다.
- [ ] Green: `aria-current`, `aria-expanded`, Sidebar Open 상태처럼 조건부 스타일은 명시적인 Class 조합으로 표현하고 런타임 문자열 조합으로 Tailwind Class 탐지를 우회하지 않는다.
- [ ] Refactor: Tailwind Preflight로 충족되는 Reset과 전환이 끝난 전역 Layout 전용 BEM 규칙을 `index.css`에서 제거하며, CSS에는 Theme Token과 실제로 전역이어야 하는 최소 Base 규칙만 남긴다.
- [ ] Refactor: Cypress가 시각 구현용 BEM Class를 Selector로 사용하지 않고 Role, Accessible Name 또는 안정적인 `data-*` Hook으로 사용자 동작을 검증하도록 정리한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 재검증을 반복하고, 이후에도 실패하면 단언을 약화하거나 CSS 규칙을 복구해 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/App.test.tsx`로 Desktop/Mobile Layout, Sidebar 상태, Keyboard Focus와 Calendar Navigation 회귀를 검증한다.
- [ ] `cd frontend && npx cypress run --spec cypress/e2e/global-layout/global-layout.cy.ts`로 Header·Sidebar·Main Content의 Desktop 배치와 Mobile Overlay 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 조건부 Class 조합과 Component Type 안정성을 검증한다.
- [ ] `cd frontend && npm run build` 후 생성 CSS에 실제 사용한 역할 기반 Tailwind Utility가 포함되고 제거한 Layout BEM 규칙이 남지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Tailwind, Vite 또는 React 의존성 재설치·버전 변경
- 인증 화면과 Calendar 기능 내부 Style 전환
- 새로운 UI Component Library 또는 Class 조합 Library 도입
- 확정되지 않은 Theme Palette 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. Calendar와 Modal Tailwind Utility 전환

#### 선행 Task

- `Task 1`

#### 작업 목적

Calendar Header·Grid·Schedule Chip·상태 영역과 일정 생성·상세 Modal을 Tailwind Utility 중심으로 전환하여 현재 디자인과 사용자 동작을 유지하면서 Calendar 전용 전역 CSS 의존을 제거한다.

#### 수정 가능 경로

- `frontend/src/index.css`
- `frontend/src/features/schedule-calendar`
- `frontend/src/features/schedule-create`
- `frontend/cypress/e2e/calendar`
- `frontend/cypress/e2e/schedule-management.cy.ts`

#### 수정 금지 경로

- `backend`
- `docs`
- `.agents`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/src/App.tsx`
- `frontend/src/features/auth`

#### 구현 항목

- [ ] Red: Calendar Header, View Control, Weekday Header, Date Grid, Schedule Chip, Loading·Empty·Error State와 Create·Detail Modal이 역할 기반 Tailwind Utility 및 반응형 Variant로 표현되고 기존 사용자 흐름을 유지한다는 실패 Component Test와 Cypress Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: Calendar의 Layout·Spacing·Typography·Surface·Border·Hover·Focus·Responsive Style을 정적 Tailwind Utility Class로 전환한다.
- [ ] Green: Schedule Color Label처럼 데이터에 따라 달라지는 Style은 허용값별 완전한 Tailwind Class Mapping으로 정의하고 동적 Class 문자열 생성에 의존하지 않는다.
- [ ] Green: Create·Detail·Edit Modal의 Backdrop, Panel, Form Grid, Action Area와 저장·확인 상태를 Tailwind Utility로 전환하면서 Backdrop Click, Escape, Dirty Confirmation, Pending 보호와 Focus 복귀 계약을 유지한다.
- [ ] Green: 390px Mobile Viewport에서 Header Control Wrapping, 7열 Calendar Grid, Modal Layout과 가로 Overflow 방지 동작을 Tailwind Responsive Utility로 유지한다.
- [ ] Refactor: 전환이 끝난 Calendar·Modal·Schedule 전용 BEM 규칙과 중복 Hex 값을 `index.css`에서 제거하고 Theme/Base에 필요한 최소 CSS만 유지한다.
- [ ] Refactor: Component Test와 Cypress가 시각 구현용 Class Selector 대신 Role, Accessible Name 또는 안정적인 `data-*` Hook으로 Calendar와 Modal 동작을 검증하도록 정리한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 재검증을 반복하고, 이후에도 실패하면 단언을 약화하거나 기존 CSS를 병행해 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx src/features/schedule-calendar/calendarDate.test.ts src/features/schedule-create/ScheduleCreateModal.test.tsx`로 Calendar 보기, 요일 순서, 상태, Modal 종료와 Focus 계약을 검증한다.
- [ ] `cd frontend && npx cypress run --spec cypress/e2e/calendar/calendar-visual-refinement.cy.ts,cypress/e2e/calendar/modal-dismissal.cy.ts,cypress/e2e/schedule-management.cy.ts`로 Desktop·Mobile Calendar Style과 일정 관리 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 Tailwind Class Mapping과 Event Handler의 Type 안정성을 검증한다.
- [ ] `cd frontend && npm run build` 후 생성 CSS에 실제 사용한 Calendar 역할 기반 Tailwind Utility가 포함되고 제거 대상 BEM 규칙과 중복 Hex가 남지 않는지 확인한다.
- [ ] Calendar 및 Modal TSX에서 Layout·Spacing·Color를 담당하는 Class가 Tailwind Utility로 표현되고 `index.css`에 해당 Component 전용 선택자가 남지 않았는지 확인한다.
- [ ] Task 1에서 노출한 역할 기반 Theme Utility와 Calendar·Modal Class가 동일한 Token 의미를 사용하며 전역 Layout Utility와 충돌하지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 인증 화면 Style 전환
- Calendar 정보 구조, URL 상태 또는 API 계약 변경
- 전역 Palette, Typography, Icon System 재설계
- Tailwind Plugin 추가 또는 외부 UI Library 도입

#### 작업 결과

`none`

#### 남은 문제

- 인증 화면의 기존 CSS 전환은 Calendar와 Global Layout 전환 완료 후 별도 범위로 남긴다.

---

### Task 3. 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`

#### 작업 목적

Global Layout과 Calendar·Modal의 Tailwind Utility 전환 결과를 통합해 Theme Token, Responsive Variant, 접근성 Selector와 잔여 CSS가 충돌하지 않는 상태를 완성한다.

#### 수정 가능 경로

- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/features/schedule-calendar`
- `frontend/src/features/schedule-create`
- `frontend/cypress/e2e`

#### 수정 금지 경로

- `backend`
- `docs`
- `.agents`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/src/features/auth`

#### 구현 항목

- [ ] Red: Global Layout에서 Calendar를 열고 Desktop·390px Mobile에서 Header, Sidebar, Calendar Grid와 Modal을 연속 사용했을 때 역할 기반 Theme Utility, Responsive Layout과 Focus 흐름이 함께 유지된다는 실패 Cypress Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: 통합 시나리오에서 발견된 Theme Token, Responsive Class, Stacking Context 또는 Overflow 충돌을 허용 경로 안에서 최소 수정한다.
- [ ] Refactor: 전환 대상 BEM 선택자, 중복 역할 색상, Component 전용 Media Query가 `index.css`에 남지 않도록 정리하고 정적 Tailwind Class 탐지가 가능한 형태를 유지한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 재검증을 반복하고, 이후에도 실패하면 기존 CSS 병행이나 단언 약화로 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/App.test.tsx src/features/schedule-calendar/ScheduleCalendar.test.tsx src/features/schedule-create/ScheduleCreateModal.test.tsx`로 Layout과 Calendar·Modal의 통합 Component 회귀를 검증한다.
- [ ] `cd frontend && npm run test:e2e`로 Global Layout, Calendar Visual, Modal Dismissal과 Schedule Management 전체 사용자 흐름을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 통합 Class Mapping과 Component Type 안정성을 검증한다.
- [ ] `cd frontend && npm run build`로 Tailwind Utility 생성과 Production Bundle 생성을 검증한다.
- [ ] `frontend/src/index.css`에는 Tailwind Import, Theme Token, 전역 Base와 인증 화면의 승인된 잔여 CSS만 있고 Global Layout·Calendar·Modal 전용 BEM 선택자가 남지 않았는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 인증 화면 Style 전환
- API·상태 관리·업무 동작 변경
- Tailwind 또는 Build Tool 설정 교체

#### 작업 결과

`none`

#### 남은 문제

- 인증 화면의 기존 CSS 전환은 별도 후속 Plan 대상으로 유지한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- Harness 실행기가 Frontend 전체 Type Check, Lint, Format, Unit Test 및 Build를 통과해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
