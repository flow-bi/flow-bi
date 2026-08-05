# 작업 계획: dashboard-01

## 1. 기본 정보

### 사용자 요청

대시보드의 1차 구현으로 로그인한 사용자가 오늘과 앞으로 7일의 일정을 읽기 전용으로 확인할 수 있는 일정 중심 화면을 구현한다.

### 작업 목적

대시보드 Product Spec 전체를 한 번에 구현하기 전에, 이미 존재하는 인증 사용자 기준 일정 조회 API 계약을 사용해 반복 조회 빈도가 높은 오늘 일정과 단기 일정 요약 화면을 먼저 제공한다. 미확정인 AI 생성 방식, 팀원 근무 상태 데이터 계약, 달력상 주 시작일과 인증 Token 저장 방식을 임의로 확정하지 않으면서도 이후 대시보드 영역을 확장할 수 있는 프런트엔드 경계를 만든다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/dashboard.md`, `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/core-beliefs.md`, `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `frontend/AGENTS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/API.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 일정 중심 대시보드 1차 화면 구현

#### 선행 Task

- `없음`

#### 작업 목적

기존 일정 조회 계약을 통해 오늘과 오늘부터 7일 범위의 접근 가능한 일정을 조회하고, 로딩·빈 상태·오류·인증 만료를 포함한 읽기 전용 대시보드 화면을 접근 가능하고 반응형인 형태로 제공한다.

#### 수정 가능 경로

- `frontend/src`
- `frontend/cypress`

#### 수정 금지 경로

- `backend`
- `.agents`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress.config.ts`

#### 구현 항목

- [ ] Red 단계에서 브라우저의 현재 로컬 날짜를 시작으로 7개 달력 날짜의 조회 범위를 계산하는 순수 함수, 일정 API 응답 검증·변환, 오늘 일정 분류, 정렬 규칙과 대시보드의 로딩·성공·빈 상태·오류·인증 만료·재시도 동작을 표현하는 Vitest 및 React Testing Library 실패 테스트를 먼저 작성하고 의도한 이유로 실패함을 기록한다.
- [ ] Red 단계에서 실제 일정 API 응답 계약과 동일한 Cypress intercept를 사용해 오늘 일정과 앞으로 7일 일정이 표시되고, 빈 응답과 서버 오류에서 적절한 안내 및 재시도 수단이 제공되는 핵심 사용자 흐름의 실패 E2E 테스트를 `frontend/cypress/e2e/dashboard/**`에 먼저 작성한다.
- [ ] 새 날짜 처리 의존성을 추가하지 않고 브라우저 로컬 날짜를 기준으로 오늘 00:00 이상부터 7일 뒤 00:00 미만까지의 반열린 조회 구간을 계산하며, API에는 ISO 8601 Instant 형식의 `from`과 `to`만 전달한다.
- [ ] `GET /api/schedules?from=&to=` 호출, 응답 DTO 검증과 화면 모델 변환을 대시보드 기능의 API 경계에 두고 UI 컴포넌트가 원시 HTTP 세부사항에 직접 의존하지 않도록 한다.
- [ ] 일정 응답은 `scheduleId`, `title`, `type`, `colorLabel`, `isAllDay`, `startAt`, `endAt` 계약만 사용하고, 잘못된 DTO·잘못된 날짜·비정상 구간은 성공 데이터나 빈 상태로 위장하지 않고 안전한 오류 상태로 전환한다.
- [ ] TanStack Query를 앱 경계에 연결하여 일정 서버 상태를 소유하게 하고, 조회 범위가 Query Key에 포함되며 재시도 동작이 동일한 Query를 다시 요청하도록 한다. 별도 Zustand 저장소나 중복 일정 캐시는 만들지 않는다.
- [ ] 대시보드에 페이지 제목, 오늘 일정 영역과 `오늘부터 7일` 일정 영역을 시맨틱 Heading과 목록 구조로 제공하고, 일정 제목·날짜·시간·종일 여부·일정 유형을 색상에만 의존하지 않고 텍스트로 표시한다.
- [ ] 오늘 일정은 현재 로컬 날짜와 시간이 겹치는 일정을 포함하고, 7일 영역은 조회 구간과 겹치는 모든 일정을 시작 시각과 종료 시각 및 안정적인 식별자 순으로 일관되게 표시한다.
- [ ] 초기 로딩, 오늘 일정 없음, 7일 일정 없음, 일반 조회 오류, `401 Unauthorized` 인증 만료를 서로 구분해 표시하고, 일반 오류에는 키보드로 사용할 수 있는 재시도 버튼을 제공한다. 인증 처리 방식이나 Token 저장 방식은 새로 구현하지 않는다.
- [ ] 데스크톱에서는 오늘 일정과 7일 일정의 정보 위계가 한눈에 보이고 작은 화면에서는 단일 열로 읽을 수 있도록 기존 Tailwind CSS와 역할 기반 CSS 변수만 사용한다. 새 UI 패키지, 아이콘 패키지와 임의의 전역 테마 시스템은 추가하지 않는다.
- [ ] 일정 생성·수정·삭제, 일정 상세 모달, 임의 링크와 동작하지 않는 버튼은 추가하지 않고 이번 읽기 전용 범위를 유지한다.
- [ ] Green 단계에서 단위·컴포넌트 테스트와 Cypress 흐름을 통과시키고, Refactor 단계에서 API·날짜·표시 책임을 기능 경계 안에서 정리한 뒤 같은 검증과 전체 Frontend Check를 다시 실행한다.
- [ ] 구현 문제로 검증이 실패하면 변경 범위 안에서 최대 3회 수정·재검증하고, 계속 실패하면 API 계약·접근성·오류 처리 또는 검증 규칙을 우회하지 않고 Task를 실패 처리하여 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/frontend_verifier.py run test:unit`으로 날짜 범위, API DTO 검증·변환, 일정 분류·정렬과 로딩·성공·빈 상태·오류·인증 만료·재시도 컴포넌트 동작을 검증한다.
- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/frontend_verifier.py run typecheck`로 대시보드 API DTO, 화면 모델과 TanStack Query 사용의 Type 오류가 없는지 검증한다.
- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/run-browser-verifier.py cypress`로 오늘 일정과 7일 일정 표시, 빈 상태, 오류와 재시도 흐름을 실제 브라우저에서 검증한다.
- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/frontend_verifier.py run check`로 단위 테스트, Type Check, Lint, Formatting과 Production Build를 포함한 전체 Frontend 품질 검사를 통과한다.
- [ ] Cypress fixture와 intercept가 기존 `GET /api/schedules?from=&to=` 응답 필드 및 오류 상태와 일치하고 실제 Token, 비밀번호, 운영 개인정보나 인증 우회 값을 포함하지 않는지 확인한다.
- [ ] `git diff --check -- frontend/src frontend/cypress`로 변경 범위에 후행 공백이나 patch 형식 오류가 없는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 사용자는 오늘 일정과 오늘부터 7일 일정의 로딩·성공·빈 상태·오류·인증 만료를 화면에서 구분할 수 있어야 한다.
- API가 반환한 접근 가능한 일정만 표시하고 사용자 ID, 인증정보나 일정 상세 개인정보를 새로 요청하거나 노출하지 않아야 한다.
- 날짜 범위, 일정 분류·정렬과 응답 검증이 단위 테스트로, 사용자 관찰 동작이 React Testing Library와 Cypress로 검증되어야 한다.
- Red → Green → Refactor 증거와 현재 전체 Frontend 회귀 검증 결과가 실행 기록에 있어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 단위·컴포넌트 테스트, Cypress, Type Check 또는 전체 Frontend Check 실패
- API 응답 오류·인증 만료를 빈 일정 또는 성공 상태로 표시함
- 일정 API에 인증 사용자 대신 클라이언트가 정한 사용자 ID를 전달하거나 권한 검사를 우회함
- 잘못된 API 응답 또는 날짜를 검증 없이 화면에 표시함
- 색상만으로 일정 유형·상태를 전달하거나 시맨틱 Heading·목록·재시도 접근성이 누락됨
- 새 날짜·UI·상태관리 패키지, Router 또는 인증 Token 저장 방식을 임의로 도입함
- 일정 CRUD, 상세 모달, AI 요약, 팀원 상태 또는 공통 헤더를 이번 범위에 추가함
- 테스트 삭제, 단언 약화 또는 API Mock을 실제 계약과 다르게 만들어 검증을 우회함
- 3회 수정 후에도 필수 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- AI가 생성하는 오늘 일정 자연어 요약과 외부 AI 서비스 연동
- 주 소속 팀 구성원 및 근무 상태 조회·표시
- 달력상 주 시작 요일을 기준으로 하는 `이번 주` 정책; 이번 1차 구현은 오늘부터 시작하는 7일 조회만 제공
- 로그인·로그아웃, 인증 Token 저장·갱신과 권한 모델 구현
- 기업명·사용자 이름·관리자 테마를 포함한 공통 헤더와 전역 레이아웃
- 일정 생성·수정·삭제, 일정 상세 모달과 캘린더 화면
- Backend API, DB 스키마, 마이그레이션과 일정 공개 범위 정책 변경
- Router, 날짜 라이브러리, 새 UI 패키지와 전역 상태 저장소 도입

#### 작업 결과

`none`

#### 남은 문제

- AI 요약은 생성 기준과 AI 공급자·데이터 전송 범위가 승인된 뒤 별도 Plan에서 구현한다.
- 팀원 상태는 주 소속 팀 조회 및 근무 상태 저장·응답 계약이 승인된 뒤 별도 Plan에서 구현한다.
- 달력상 이번 주의 시작 요일과 사용자 시간대 정책이 확정되면 7일 조회 범위를 해당 정책으로 전환한다.
- 실제 인증 사용자와의 End-to-End 통합은 인증 Token 전달·저장 방식과 운영용 인증 사용자 공급자가 구현된 뒤 검증한다. 이번 Cypress 검증은 승인된 일정 API 계약과 동일한 intercept를 사용한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 일정 API 계약을 사용하는 오늘 및 오늘부터 7일의 읽기 전용 대시보드가 로딩·빈 상태·오류·인증 만료와 함께 동작해야 한다.
- AI 요약, 팀원 상태, 인증 구현과 일정 CRUD가 이번 1차 범위에 포함되지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 일정 API 오류·인증 만료·잘못된 응답을 성공 또는 빈 상태로 위장함
- 접근성, 데이터 최소화 또는 인증 사용자 기준 조회 원칙을 위반함
- 미확정 AI·팀원 상태·주 경계·인증 정책을 임의로 구현함
- 남은 문제가 사용자 확인 없이 방치됨
