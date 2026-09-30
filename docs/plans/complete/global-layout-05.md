# 작업 계획: global-layout-05

## 1. 기본 정보

### 사용자 요청

GitHub 71번 이슈의 공용 App Shell 뷰포트 초과 문제를 마저 해결한다.

### 작업 목적

공용 헤더, 사이드바와 본문이 브라우저 뷰포트 안에서 배치되도록 하고, 짧은 콘텐츠의 불필요한 문서 스크롤을 제거하면서 긴 콘텐츠는 본문에서 탐색 가능하게 유지한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/global-layout.md`
- Design Doc: `frontend/DESIGN.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: GitHub Issue `#71`, `frontend/FRONTEND.md`

---

## 2. 실행 Task

### Task 1. App Shell 뷰포트 경계 회귀 테스트와 수정

#### 선행 Task

- 없음

#### 작업 목적

데스크톱과 모바일에서 App Shell이 문서 너비·높이를 불필요하게 늘리지 않고, 긴 콘텐츠를 본문 내부에서 세로 탐색할 수 있도록 한다.

#### 수정 가능 경로

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/index.css`

#### 수정 금지 경로

- `backend/**`
- `frontend/src/features/**`
- `frontend/package.json`
- `frontend/package-lock.json`

#### 구현 항목

- [ ] App Shell의 높이, 본문 축소 및 overflow 경계를 재현하는 실패 컴포넌트 테스트를 먼저 작성한다.
- [ ] App Shell과 전역 루트의 크기 및 overflow 제약을 최소 범위로 수정한다.
- [ ] 긴 콘텐츠는 본문 내부에서 세로 탐색 가능하고 문서 가로 overflow가 생기지 않도록 한다.
- [ ] 기존 데스크톱·모바일 사이드바와 포커스 복귀 동작을 회귀 테스트로 유지한다.

#### TDD 정책

- REQUIRED

버그를 재현하는 컴포넌트 테스트를 먼저 실패시키고, 최소 구현으로 통과시킨 뒤 중복 없이 정리한다. 구현 문제로 검증이 실패하면 최대 3회 수정하며, 이후에도 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/App.test.tsx`
- [ ] `cd frontend && npm run typecheck`
- [ ] `cd frontend && npx eslint src/App.tsx src/App.test.tsx`
- [ ] `cd frontend && npx prettier --check src/App.tsx src/App.test.tsx src/index.css`
- [ ] `cd frontend && npm run build`
- [ ] App Shell의 높이와 overflow 계약 및 모바일 사이드바 포커스 복귀 테스트가 통과한다.

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

- 개별 기능 화면의 고유 레이아웃 변경
- 시각 디자인, 탐색 구조 또는 breakpoint 변경
- 백엔드와 인증·권한 변경
- 신규 프런트엔드 의존성 도입
- Cypress E2E 테스트 작성·수정·실행

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
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
