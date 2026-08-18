# 작업 계획: global-layout-02

## 1. 기본 정보

### 사용자 요청

캘린더 페이지로 이동할 수 있도록 사이드바에 캘린더 탭을 추가하고 기존 캘린더 화면에 연결한다.

### 작업 목적

로그인한 사용자가 주소를 직접 입력하지 않아도 데스크톱과 모바일의 공통 사이드바에서 캘린더 화면으로 진입하고 현재 위치를 인지할 수 있게 한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/global-layout.md`, `docs/product-specs/calendar.md`
- Design Doc: `없음`
- Architecture: `frontend/FRONTEND.md`
- 기타 참고 문서: `frontend/DESIGN.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 사이드바 캘린더 탐색 연결

#### 선행 Task

- `없음`

#### 작업 목적

인증된 사용자가 공통 사이드바의 캘린더 탭을 선택해 기존 월간 캘린더 화면으로 이동하고, 데스크톱과 모바일에서 동일한 탐색 결과를 얻도록 한다.

#### 수정 가능 경로

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e/global-layout`

#### 수정 금지 경로

- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red: 로그인 완료 상태의 사이드바에 접근 가능한 이름이 `캘린더`인 탐색 탭이 표시되고, 선택 시 기존 월간 캘린더 URL 및 화면으로 연결되며 현재 탭임을 식별할 수 있다는 실패 Component Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Red: 데스크톱과 모바일 사이드바에서 캘린더 탭을 선택하면 `view=month`인 Calendar 화면이 표시되고, 모바일에서는 탐색 후 Overlay가 닫히는 사용자 흐름의 실패 Cypress Test를 `frontend/cypress/e2e/global-layout/`에 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: 기존 URL 기반 Calendar 진입 계약과 `CalendarStarter`를 재사용해 공통 사이드바에 캘린더 탐색 탭을 추가하고, 선택 상태를 `aria-current` 등 접근 가능한 방식으로 제공하며 모바일 탐색 완료 시 사이드바를 닫는 최소 구현을 한다.
- [ ] Refactor: 데스크톱과 모바일이 동일한 탐색 항목과 이동 동작을 공유하도록 중복을 정리하되 새 Router 또는 UI 의존성을 추가하지 않고 관련 테스트를 다시 통과시킨 결과를 기록한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 재검증을 반복하고, 이후에도 실패하면 우회하거나 단언을 약화하지 않은 채 Task 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/App.test.tsx`로 캘린더 탭 표시, 월간 Calendar 연결, 현재 위치 표현과 모바일 탐색 동작을 검증한다.
- [ ] `cd frontend && npm run typecheck`로 탐색 상태 및 콜백 변경의 Type 안정성을 검증한다.
- [ ] `cd frontend && npx cypress run --spec cypress/e2e/global-layout/global-layout.cy.ts`로 로그인 완료 상태에서 데스크톱·모바일 사이드바를 통한 Calendar 진입과 모바일 Overlay 종료를 검증한다.
- [ ] 키보드만으로 사이드바의 캘린더 탭에 접근·실행할 수 있고, 선택 상태가 색상에만 의존하지 않으며, Calendar 화면의 기존 월간·주간·일간 전환 동작을 가리지 않는지 확인한다.

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

- 새 Router 또는 탐색 관련 외부 의존성 도입
- Calendar 조회·생성·수정·취소 기능과 Backend API 계약 변경
- 사이드바의 캘린더 외 다른 메뉴 추가 및 전역 레이아웃 재설계
- 인증 방식, Session 정책, 사용자·기업명 데이터 연결 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- Harness 실행기가 수행하는 Frontend 전체 lint, test, build 검증이 통과해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
