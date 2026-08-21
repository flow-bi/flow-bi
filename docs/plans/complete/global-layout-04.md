# 작업 계획: global-layout-04

## 1. 기본 정보

### 사용자 요청

공용 레이아웃 콘텐츠의 상태 문구를 제거하고 Sidebar 하단에 로그아웃 버튼을 배치하며 기본 색상 스타일을 적용한다.

### 작업 목적

공용 Shell의 시각적 계층을 단순화하면서 Desktop·Mobile Sidebar에서 기존 로그아웃 기능과 접근성을 유지한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/global-layout.md`, `docs/product-specs/auth.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `GL-SHELL-001`: 보호 화면 콘텐츠에 `로그인되었습니다.` 문구가 표시되지 않는다.
- `GL-SHELL-002`: Desktop·Mobile Sidebar 모두 탐색 항목 아래 맨 아래에 로그아웃 버튼을 표시한다.
- `GL-SHELL-003`: 기존 로그아웃 요청, 진행 상태, 오류 및 세션 정리 동작을 유지한다.
- `GL-SHELL-004`: 로그아웃 버튼은 키보드 접근 가능한 이름과 기본 색상·포커스·비활성 스타일을 제공한다.
- `GL-SHELL-005`: Sidebar와 콘텐츠 영역에 장식적으로 표시되던 `주요 탐색` 및 `콘텐츠` 문구를 표시하지 않는다.

---

## 2. 실행 Task

### Task 1. 공용 레이아웃 표시 정리 및 로그아웃 Sidebar 배치

#### 선행 Task

- `없음`

#### 작업 목적

공용 Shell의 불필요한 상태 제목을 제거하고 로그아웃을 Sidebar 하단의 일관된 기본 버튼으로 이동한다.

#### 수정 가능 경로

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/test/App.test.tsx`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth/devEmployeeAccounts.ts`
- `frontend/src/features/auth/EmployeeAccountModal.tsx`
- `frontend/src/index.css`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: `로그인되었습니다.`, `주요 탐색`, `콘텐츠` 표시 제거와 Desktop·Mobile Sidebar 하단 로그아웃 버튼 위치·기본 색상에 대한 실패 Component 테스트를 먼저 작성한다.
- [ ] Red: 기존 로그아웃 성공·실패·진행 상태와 키보드 접근 가능한 이름이 유지되는지 실패 테스트를 작성한다.
- [ ] Green: 공용 콘텐츠의 상태 문구를 제거하고 Sidebar가 탐색 영역과 하단 로그아웃 영역을 분리하도록 구현한다.
- [ ] Green: Desktop·Mobile Sidebar의 로그아웃 버튼에 기본 surface/border/text 색상, hover, focus, disabled 스타일을 적용한다.
- [ ] Green: 기존 로그아웃 핸들러와 Query Cache 정리·세션 전환 동작을 변경하지 않는다.
- [ ] Refactor: 시각 문구는 제거하되 `aria-label`과 landmark 구조는 접근성을 위해 유지하고 중복 마크업을 정리한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 검증을 반복하고 실패를 숨기지 않는다.

#### 검증 항목

- [ ] `frontend`에서 `npm run test:unit -- --run src/App.test.tsx src/test/App.test.tsx`를 실행해 표시 제거, Sidebar 배치, 로그아웃 상태를 검증한다.
- [ ] `frontend`에서 `npm run typecheck`를 실행해 레이아웃 Props와 테스트 타입을 검증한다.
- [ ] `frontend`에서 `npm run format:check`를 실행해 Frontend 형식을 검증한다.
- [ ] 저장소 루트에서 `git diff --check -- frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/test/App.test.tsx`를 실행한다.

#### 완료 조건

- `GL-SHELL-001`부터 `GL-SHELL-005`까지 충족한다.
- 모든 구현·검증 항목이 통과한다.
- Red → Green → Refactor 결과와 검증 근거가 기록된다.
- 수정 가능 경로 밖 변경이 없고 수정 금지 경로가 변경되지 않는다.
- `quality_score`가 `90` 이상이다.

#### 실패 조건

- 콘텐츠 문구가 남거나 로그아웃 버튼이 Sidebar 하단에 표시되지 않음
- 로그아웃 성공·실패·진행 상태 또는 접근성 동작 회귀
- 기본 색상 대신 임의 색상 또는 포커스 제거
- 테스트·typecheck·format 또는 diff 검증 실패
- 수정 범위 밖 변경 또는 `quality_score` 90 미만

#### 제외 범위

- 로그아웃 API·인증 정책·세션 정책 변경
- 전역 색상 토큰·Tailwind 설정 변경
- Sidebar 탐색 항목과 콘텐츠 기능 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- Task 1의 구현·검증 항목이 모두 통과한다.
- Mandatory Gate의 permission_security, scope, requirements, tdd, automated_verification, contract_sync, critical_findings가 모두 `PASS`다.
- `quality_score`가 `90` 이상이다.

## 4. 전체 실패 조건

- 필수 Task 또는 검증 항목 실패
- 로그아웃 동작·접근성·반응형 레이아웃 회귀
- 수정 범위 밖 또는 수정 금지 경로 변경
- 테스트 단언 약화·검증 우회·실패 은폐
