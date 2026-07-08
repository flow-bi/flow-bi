# Progress

## Current Status

active 계획 문서, 프롬프트 기록, 진행 로그, 결정 기록의 문서 역할을 분리했다.

---

## Done

- 프론트엔드 문서 구조와 작업 규칙 정리
- 로그인 및 공통 Layout 1차 구현
- Phase 1 대시보드 화면 구현 및 후속 UX 정리
- Phase 1 회의실 예약 화면 구현 및 후속 UX 정리
- Phase 1 캘린더 일정 등록 화면 구현 및 후속 UX 정리
- Phase 2 조직도 화면 구현 및 후속 UX 정리
- active 계획 문서와 프롬프트/진행 로그 문서 분리
- 프론트엔드 문서 구조 분리와 프롬프트 기록 분리 결정을 `DECISIONS.md`에 기록

---

## In Progress

- 실제 API 연동 준비

---

## Next

- 마이페이지 Phase 2 상세 구현
- 테마 설정 Phase 2 상세 구현
- 관리자 기본 화면 Phase 2 상세 구현
- 실제 로그인 API 연동
- 인증 사용자 전역 상태 연결

## 2026-07-07 - 조직도 화면 구현

### 작업한 기능

- Phase 2 조직도 화면

### 변경한 파일

- `src/pages/organization/OrganizationPage.tsx`
- `src/pages/organization/components/EmployeeDetailPanel.tsx`
- `src/pages/organization/components/EmployeeList.tsx`
- `src/pages/organization/components/OrganizationStatePanel.tsx`
- `src/pages/organization/components/OrganizationToolbar.tsx`
- `src/pages/organization/components/OrganizationTree.tsx`
- `src/pages/organization/lib/organizationUtils.ts`
- `src/pages/organization/mock/organizationMock.ts`
- `src/pages/organization/types/organization.ts`
- `src/index.css`
- `progress.md`

### 구현 내용

- `/organization` 기존 라우트와 공통 Layout 연결을 유지했다.
- 조직도 페이지 전용 타입, mock 데이터, 유틸, 컴포넌트를 페이지 폴더 내부로 분리했다.
- 부서/팀 트리와 팀별 직원 수 표시를 구현했다.
- 직원 목록, 직원 검색, 상태 필터, 팀/부서별 필터링을 구현했다.
- 직원 클릭 시 우측 상세 패널에 사번, 소속, 직책/직무, 이메일, 연락처, 권한을 표시하도록 구현했다.
- 검색 결과 없음 Empty 상태를 구현했다.
- mock Loading/Error 상태를 확인할 수 있는 상태 탭과 패널을 구현했다.
- 조직도 전용 반응형 레이아웃과 선택/포커스 스타일을 추가했다.
- backend 파일은 수정하지 않았다.

### 확인한 동작

- `/organization`에서 조직도 화면이 공통 Layout 안에 표시된다.
- 팀/부서 선택 시 직원 목록이 필터링된다.
- 직원 검색과 상태 필터가 동작한다.
- 직원 클릭 시 상세 패널이 표시된다.
- 검색 결과가 없을 때 Empty 상태가 표시된다.
- Loading/Error 상태 패널을 확인할 수 있다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

## 2026-07-08 - 조직도 상태 노출 제거 및 레이아웃 보정

### 작업한 기능

- 조직도 화면 수정

### 변경한 파일

- `src/pages/organization/OrganizationPage.tsx`
- `src/pages/organization/components/EmployeeList.tsx`
- `src/pages/organization/components/OrganizationToolbar.tsx`
- `src/pages/organization/components/OrganizationStatePanel.tsx`
- `src/pages/organization/types/organization.ts`
- `src/index.css`
- `progress.md`

### 구현 내용

- 화면에서 Loading/Error 상태 전환 탭과 상태 패널 렌더링을 제거했다.
- 직원 검색 결과가 없을 때 Empty 상태 문구를 화면에 표시하지 않도록 수정했다.
- 직원 카드 내부를 5열 고정 구조에서 더 좁은 4열 구조로 바꿔 텍스트와 배지가 겹치지 않도록 조정했다.
- 1080px 이하에서는 상세 패널이 하단으로 내려가도록 조직도 그리드 구조를 보정했다.
- 모바일에서는 직원 카드 내부 정보가 한 열로 정리되도록 보정했다.

### 확인한 동작

- `/organization`에서 Loading/Empty/Error 상태 UI가 노출되지 않는다.
- 직원 목록, 검색, 상태 필터, 팀 필터가 유지된다.
- 직원 카드와 상세 패널이 서로 겹치지 않는다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

## 2026-07-08 - 조직도 포함 관계 토글 트리 적용

### 작업한 기능

- 조직도 부서/팀 트리 수정

### 변경한 파일

- `src/pages/organization/components/OrganizationTree.tsx`
- `src/index.css`
- `progress.md`

### 구현 내용

- 기존 단순 나열형 부서/팀 목록을 상위 조직과 하위 팀의 포함 관계가 보이는 재귀 트리로 변경했다.
- 상위 조직 클릭 시 선택과 함께 하위 조직을 펼치거나 접을 수 있도록 구현했다.
- 하위 조직 영역에 들여쓰기와 연결선을 추가해 계층 구조가 드러나도록 보정했다.
- 전체/상위 조직/하위 팀 선택에 따른 직원 목록 필터링은 기존 동작을 유지했다.

### 확인한 동작

- `/organization`에서 Flow BI 아래 제품본부/비즈니스본부가 포함 관계로 표시된다.
- 상위 조직을 클릭하면 하위 팀이 접히거나 펼쳐진다.
- 상위 조직 또는 하위 팀 선택 시 직원 목록 필터링이 유지된다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

## 2026-07-08 - 조직도 토글 클릭 영역 분리

### 작업한 기능

- 조직도 트리 토글 동작 수정

### 변경한 파일

- `src/pages/organization/components/OrganizationTree.tsx`
- `src/index.css`
- `progress.md`

### 구현 내용

- 상위 조직 행 전체 클릭이 펼침/접힘을 실행하던 동작을 제거했다.
- 토글 버튼을 별도 클릭 영역으로 분리해 토글 버튼 클릭 시에만 하위 조직이 열리고 닫히도록 수정했다.
- 조직명 영역 클릭은 조직 선택과 직원 목록 필터링만 수행하도록 수정했다.
- 토글 버튼 크기를 키우고 hover/focus 상태를 보강했다.

### 확인한 동작

- 토글 버튼 클릭 시 하위 조직이 열리고 닫힌다.
- 조직명 클릭 시 직원 목록 필터링만 동작하고 토글 상태는 유지된다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

## 2026-07-03

### 작업한 기능

- Phase 1 대시보드
- 로그인 화면
- 클라이언트 라우팅
- 로그인 이후 공통 레이아웃
- 대시보드 화면
- AI 채팅 화면
- 캘린더 화면
- 조직도 화면
- 회의실 화면
- 마이페이지 화면
- 테마 설정 화면
- 관리자 홈, 직원 관리, 팀 관리 화면

### 변경한 파일

- `src/App.tsx`
- `src/app/routes.ts`
- `src/components/layout/AppLayout.tsx`
- `src/index.css`
- `src/pages/admin/AdminHomePage.tsx`
- `src/pages/admin/AdminTeamsPage.tsx`
- `src/pages/admin/AdminUsersPage.tsx`
- `src/pages/aiChat/AiChatPage.tsx`
- `src/pages/calendar/CalendarPage.tsx`
- `src/pages/changePassword/ChangePasswordPage.tsx`
- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/dashboard/components/AiDailySummaryPanel.tsx`
- `src/pages/dashboard/components/DashboardStateControls.tsx`
- `src/pages/dashboard/components/DashboardStatusPanel.tsx`
- `src/pages/dashboard/components/DashboardSummaryCards.tsx`
- `src/pages/dashboard/components/TeamStatusPanel.tsx`
- `src/pages/dashboard/components/TodaySchedulePanel.tsx`
- `src/pages/dashboard/components/WeeklySchedulePanel.tsx`
- `src/pages/dashboard/lib/formatDashboard.ts`
- `src/pages/dashboard/mock/dashboardMock.ts`
- `src/pages/dashboard/types/dashboard.ts`
- `src/pages/login/LoginPage.tsx`
- `src/pages/login/components/LoginForm.tsx`
- `src/pages/login/components/LoginStatusPanel.tsx`
- `src/pages/login/mock/authMock.ts`
- `src/pages/login/types/auth.ts`
- `src/pages/mypage/MyPage.tsx`
- `src/pages/organization/OrganizationPage.tsx`
- `src/pages/rooms/RoomsPage.tsx`
- `src/pages/theme/ThemePage.tsx`
- `progress.md`

### 구현 내용

- Phase 1 계획 문서 기준에 맞춰 대시보드를 우선 보강했다.
- 대시보드에 AI 오늘 일정 요약, 오늘 일정 목록, 주간 일정 요약, 팀원 상태 영역을 분리 구현했다.
- 대시보드 mock 데이터에 주간 일정 요약 데이터를 추가했다.
- 대시보드에서 Success, Loading, Empty, Error 상태를 전환해 확인할 수 있도록 상태 컨트롤을 추가했다.
- 주간 일정 날짜 선택과 AI 추천 액션 선택 상호작용을 추가했다.
- 대시보드 페이지 전용 컴포넌트, lib, mock, type을 `src/pages/dashboard` 내부로 분리했다.
- 로그인 화면의 좌측 설명 패널을 제거하고 로그인 카드만 중앙에 표시하도록 수정했다.
- 로그인 성공 시 `/dashboard`로 이동하도록 클라이언트 라우팅을 추가했다.
- `/`, `/dashboard`, `/ai-chat`, `/calendar`, `/organization`, `/rooms`, `/mypage`, `/settings/theme`, `/admin`, `/admin/users`, `/admin/teams`, `/change-password` 화면을 연결했다.
- 로그인 이후 화면에 좌측 사이드바, 상단 헤더, 메인 콘텐츠 구조를 적용했다.
- 관리자 권한 사용자에게 관리자 메뉴를 노출하도록 mock 사용자 역할을 활용했다.
- 대시보드는 일정, 팀원 상태, 회의실 예약, AI 요약 mock 데이터를 페이지 폴더 내부에 분리했다.
- AI 채팅은 단축어, 메시지 입력, mock 응답 표시를 구현했다.
- 캘린더, 회의실, 조직도, 마이페이지, 테마, 관리자 화면은 1차 화면 구조를 구현했다.
- 사번, 비밀번호 필수 입력 검증과 disabled 상태를 적용했다.
- mock 로그인 응답을 `API.md`의 Auth 응답 구조에 맞춰 분리했다.
- idle, loading, error, success 상태 표시를 추가했다.
- 디자인 문서의 Light Blue, Purple 기준으로 반응형 로그인 UI를 구성했다.

### 확인한 동작

- `/dashboard`에서 mock 데이터 기반 오늘 일정, 주간 일정, 팀원 상태가 표시된다.
- 대시보드의 Loading, Empty, Error 상태가 표시된다.
- 주간 일정 날짜 선택과 AI 추천 액션 선택 상태가 화면에 반영된다.
- mock 계정 `A1001 / demo1234` 입력 시 `/dashboard`로 이동한다.
- 잘못된 계정 정보 입력 시 오류 상태가 표시된다.
- 사번 또는 비밀번호가 비어 있으면 로그인 버튼이 비활성화된다.
- 사이드바 메뉴 클릭 시 각 화면으로 이동한다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

### 남은 작업

- Phase 1 회의실 상세 완료 기준 구현
- Phase 1 일정관리/캘린더 상세 완료 기준 구현
- 실제 로그인 API 연동
- 인증 사용자 전역 상태 연결
- 서버 상태 관리 도입
- 각 화면별 상세 모달, 드로어, API 성공/실패 UI 고도화

## 2026-07-03 - 대시보드 계획 기준 구현

### 작업한 기능

- 대시보드 화면

### 변경한 파일

- `docs/plans/active/dashboard.md`
- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/dashboard/types/dashboard.ts`
- `src/index.css`
- `progress.md`

### 구현 내용

- `dashboard.md`의 최신 화면 요구사항에 맞춰 대시보드 상단 숫자 요약 카드 영역을 제거했다.
- 대시보드 화면을 AI 오늘 일정 요약, 오늘의 일정 목록, 주간 일정 요약, 팀원 상태 네 영역만 표시하도록 정리했다.
- Loading/Error 상태 전환 UI와 관련 컴포넌트를 제거했다.
- 데이터 없음 메시지는 각 영역 내부에서 유지했다.
- AI 추천 액션 선택과 주간 일정 날짜 선택 상호작용을 유지했다.

### 확인한 동작

- `/dashboard`에서 네 개 대시보드 영역이 표시된다.
- 주간 일정 날짜 선택 상태가 화면에 반영된다.
- AI 추천 액션 선택 상태가 화면에 반영된다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

### 남은 작업

- Phase 1 회의실 상세 완료 기준 구현
- Phase 1 일정관리/캘린더 상세 완료 기준 구현

## 2026-07-05 - 회의실 예약 화면 구현

### 작업한 기능

- 회의실 예약 화면

### 변경한 파일

- `docs/plans/active/rooms.md`
- `src/pages/rooms/RoomsPage.tsx`
- `src/pages/rooms/components/ReservationDrawer.tsx`
- `src/pages/rooms/components/ReservationOverview.tsx`
- `src/pages/rooms/components/RoomList.tsx`
- `src/pages/rooms/components/RoomSearchPanel.tsx`
- `src/pages/rooms/components/RoomsStatePanel.tsx`
- `src/pages/rooms/constants/roomOptions.ts`
- `src/pages/rooms/lib/roomUtils.ts`
- `src/pages/rooms/mock/roomsMock.ts`
- `src/pages/rooms/types/rooms.ts`
- `src/index.css`
- `progress.md`

### 구현 내용

- 회의실 목록과 예약 현황을 분리해 표시했다.
- 날짜, 시간, 인원, 상태 검색 조건과 mock 데이터 필터링을 구현했다.
- 예약 가능 회의실의 예약 버튼 클릭 시 우측 예약 드로어를 표시했다.
- 예약 폼의 필수값, 시간 범위, 인원 수 기본 검증을 구현했다.
- Loading, Empty, Error, Success, Disabled 상태를 구현했다.

### 확인한 동작

- `/rooms`에서 회의실 목록과 예약 현황이 표시된다.
- 검색 조건 변경 시 목록과 예약 현황이 갱신된다.
- 예약 버튼 클릭 시 예약 드로어가 열린다.
- 유효하지 않은 예약 폼 입력 시 검증 메시지가 표시된다.
- `npm run lint`, `npm run typecheck`, `npm run build`가 통과한다.

### 남은 작업

- Phase 1 일정관리/캘린더 상세 완료 기준 구현
- 실제 회의실 API 연동

---

## Log Template

```md
## YYYY-MM-DD

### 작업한 기능

-

### 변경한 파일

-

### 구현 내용

-

### 확인한 동작

-

### 남은 작업

-
```

---

## 2026-07-08 - active 계획 문서 결과 기록 이관

### 작업한 기능

- active 계획 문서의 작업 결과 기록, 추가 작업 결과 기록, 확인 방법, 회고를 `progress.md`로 통합

### 변경한 파일

- `docs/plans/active/dashboard.md`
- `docs/plans/active/rooms.md`
- `docs/plans/active/calendar.md`
- `docs/plans/active/organization.md`
- `docs/plans/prompts/dashboard-prompts.md`
- `docs/plans/prompts/rooms-prompts.md`
- `docs/plans/prompts/calendar-prompts.md`
- `docs/plans/prompts/organization-prompts.md`
- `docs/DECISIONS.md`
- `progress.md`

### 구현 내용

- active 계획 문서는 목적, 범위, 제외 범위, 필요한 데이터, 구현 단계, 완료 기준 중심으로 정리했다.
- Codex 프롬프트 원문은 화면별 prompts 문서로 분리했다.
- 작업 결과와 확인 방법은 아래 이관 로그로 통합했다.
- 프롬프트 원문은 `progress.md`에 남기지 않았다.
- 프론트엔드 문서 역할 분리와 프롬프트 기록 분리 결정은 `docs/DECISIONS.md`에 기록했다.

### 이관 로그

#### `dashboard.md`에서 이관

##### 작업 결과 기록

- `/dashboard` 화면을 계획 기준에 맞춰 정리했다.
- 맨 위 숫자 요약 카드 영역을 제거했다.
- 대시보드 화면을 다음 네 영역만 표시하도록 구성했다.
  - AI 오늘 일정 요약
  - 오늘의 일정 목록
  - 주간 일정 요약
  - 팀원 상태
- AI 추천 액션 선택 상호작용을 유지했다.
- 주간 일정 날짜 선택 상호작용을 유지했다.
- 오늘 일정, 주간 일정, 팀원 상태의 데이터 없음 메시지를 각 영역 내부에 유지했다.
- 화면 요구사항의 “로딩 및 오류 상태 표시하지 않는다”를 우선 적용하여 Loading/Error 전환 UI와 관련 컴포넌트를 제거했다.
- 대시보드 관련 mock 데이터, 타입, 유틸, 컴포넌트는 `src/pages/dashboard/` 내부에 유지했다.
- backend 파일은 수정하지 않았다.
- 검증 결과:
  - `npm run lint` 통과
  - `npm run typecheck` 통과
  - `npm run build` 통과

##### 2026-07-05 - AI 업무 비서 상단 배치

##### 변경 내용

- AI 오늘 일정 요약 패널을 대시보드 그리드 최상단에서 전체 폭으로 표시하도록 조정했다.
- AI 패널 아래에 오늘의 일정 목록, 팀원 상태, 주간 일정 요약이 이어지도록 렌더링 순서를 조정했다.
- 기존 대시보드 네 영역 구조는 유지했다.
- backend 파일은 수정하지 않았다.

##### 변경 파일

- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/dashboard/components/AiDailySummaryPanel.tsx`
- `src/pages/dashboard/components/WeeklySchedulePanel.tsx`
- `src/index.css`
- `docs/plans/active/dashboard.md`
- `progress.md`

##### 확인 방법

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. 개발 서버에서 `/dashboard` 접속 후 AI 오늘 일정 요약 패널이 최상단 전체 폭으로 표시되는지 확인한다.
5. AI 패널 아래에 오늘의 일정 목록과 팀원 상태가 표시되는지 확인한다.

---

##### 회고

- 계획 파일 안에서 UI 상태/완료 기준에는 Loading/Error가 남아 있으나, 화면 요구사항에는 “로딩 및 오류 상태 표시하지 않는다”가 명시되어 있었다.
- 이번 구현에서는 더 구체적인 화면 요구사항을 우선 적용했다.
- 추후 계획 문서 정리 시 UI 상태와 완료 기준의 Loading/Error 항목을 대시보드 요구사항에 맞게 정리할 필요가 있다.

#### `rooms.md`에서 이관

##### 작업 결과 기록

- `/rooms` 화면을 계획 기준에 맞춰 구현했다.
- 회의실 페이지 전용 타입, mock 데이터, 상수, 유틸, 컴포넌트를 `src/pages/rooms/` 내부로 분리했다.
- 회의실 검색 조건을 구현했다.
  - 날짜
  - 시작 시간
  - 종료 시간
  - 인원
  - 상태
- mock 데이터 기반 회의실 목록을 표시했다.
- 선택한 회의실의 예약 현황을 시간대 타임라인으로 확인할 수 있도록 구현했다.
- 검색 조건에 따라 회의실 목록과 선택 회의실 예약 현황이 갱신되도록 구현했다.
- 예약 가능 회의실의 예약 버튼 클릭 시 우측 예약 드로어가 열리도록 구현했다.
- 예약 폼에 제목, 날짜, 시작 시간, 종료 시간, 인원, 선택 회의실 정보를 포함했다.
- 예약 폼의 필수값, 시간 범위, 인원 수 기본 검증을 구현했다.
- 실제 예약 확정처럼 처리하지 않고, 백엔드 검증 전 검토 완료 메시지만 표시하도록 구현했다.
- Loading, Empty, Error, Success, Disabled 상태를 화면에서 확인할 수 있도록 구현했다.
- backend 파일은 수정하지 않았다.
- 검증 결과:
  - `npm run lint` 통과
  - `npm run typecheck` 통과
  - `npm run build` 통과

##### 2026-07-05 - 검색 시간대 반영 및 예약 현황 시각화

- 검색 시작/종료 시간과 기존 예약 시간이 겹치는지 계산해 회의실 목록의 예약 가능/사용 중 상태가 바뀌도록 수정했다.
- 최초 `/rooms` 화면에서는 회의실 목록만 표시하고, 회의실 카드를 클릭하면 해당 회의실의 예약 현황이 표시되도록 수정했다.
- 예약 현황을 표 형태에서 시간대 타임라인 형태로 변경했다.
- 선택한 검색 시간대는 타임라인 위에 별도 영역으로 표시하고, 예약된 시간은 블록으로 표시했다.
- 예약 버튼은 시간대 기준으로 예약 가능한 회의실에서만 활성화되도록 유지했다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/pages/rooms/components/RoomList.tsx`
  - `src/pages/rooms/lib/roomUtils.ts`
  - `src/pages/rooms/mock/roomsMock.ts`
  - `src/index.css`
- 확인 방법:
  - `/rooms`에서 시작/종료 시간을 바꾸면 회의실 목록의 상태가 변경되는지 확인한다.
  - 회의실 카드를 클릭하면 해당 회의실의 예약 현황 타임라인이 표시되는지 확인한다.
  - 타임라인에서 검색 시간대와 예약 블록이 시각적으로 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 전체 현황 타임라인 및 검색 버튼 반영

- 검색 조건 입력값을 바로 적용하지 않고, 검색 버튼을 눌렀을 때 회의실 목록 필터가 반영되도록 수정했다.
- 최초 `/rooms` 화면은 검색 창과 회의실 목록만 표시하도록 유지했다.
- 회의실 목록 영역을 클릭하면 단일 회의실이 아니라 현재 목록 기준의 전체 회의실 예약 현황이 표시되도록 수정했다.
- 전체 예약 현황은 회의실별 행과 예약 시간 블록으로 표시한다.
- 예약 버튼 클릭은 목록 영역 클릭과 분리해 기존 예약 드로어 흐름을 유지했다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/RoomSearchPanel.tsx`
  - `src/pages/rooms/components/RoomList.tsx`
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms` 최초 진입 시 검색 창과 회의실 목록만 표시되는지 확인한다.
  - 검색 조건을 바꾼 뒤 검색 버튼을 누르기 전까지 목록이 유지되는지 확인한다.
  - 검색 버튼 클릭 후 목록이 조건에 맞게 갱신되는지 확인한다.
  - 회의실 목록 영역 클릭 시 전체 회의실 예약 현황 타임라인이 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 예약 현황 블록 정보 표시 및 디자인 개선

- `docs/FRONTEND.md`를 확인했고, 별도 폰트 토큰은 없어 기존 전역 폰트 체계인 `Inter`, `ui-sans-serif`, `system-ui` 기준을 유지했다.
- 예약 블록 내부 텍스트를 긴 제목 대신 시간과 상태 중심으로 줄여 잘림이 덜 어색하게 보이도록 수정했다.
- 예약 블록을 클릭 가능한 버튼으로 변경해 hover, focus, click 시 예약 상세 정보 팝오버가 표시되도록 구현했다.
- 팝오버에는 회의실, 시간, 팀, 예약자, 인원, 상태 정보를 표시한다.
- 예약자와 팀 정보 표시를 위해 회의실 예약 mock/type에 `teamName`, `organizerName`을 추가했다.
- 전체 예약 현황 타임라인을 흰색/라이트 블루 기반의 업무용 일정표 톤으로 정리하고, 블록 색상과 그림자를 낮춰 오피스 서비스 느낌으로 수정했다.
- 변경 파일:
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/pages/rooms/mock/roomsMock.ts`
  - `src/pages/rooms/types/rooms.ts`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 회의실 목록 영역 클릭 후 전체 예약 현황 타임라인을 연다.
  - 예약 블록 내부 텍스트가 자연스럽게 보이는지 확인한다.
  - 예약 블록에 마우스를 올리거나 클릭해 상세 정보 팝오버가 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 현황 토글 및 날짜 변경 개선

- 회의실 목록 영역을 다시 클릭하면 전체 예약 현황을 닫고 최초 화면처럼 목록만 보이도록 수정했다.
- 전체 예약 현황 상단에 현황 날짜 입력 컴포넌트를 추가했다.
- 현황 날짜 변경 시 적용 검색 조건과 검색 입력 날짜가 함께 변경되어 회의실 목록 상태와 예약 현황이 같은 날짜 기준으로 갱신되도록 연결했다.
- 화면에서 `Success`, `Loading`, `Error` 상태 전환 탭을 제거했다.
- 더 이상 쓰지 않는 상태 전환 옵션, 타입, `RoomsStatePanel` 컴포넌트를 정리했다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/RoomSearchPanel.tsx`
  - `src/pages/rooms/components/RoomList.tsx`
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/pages/rooms/components/RoomsStatePanel.tsx`
  - `src/pages/rooms/constants/roomOptions.ts`
  - `src/pages/rooms/types/rooms.ts`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 회의실 목록 영역 클릭 시 전체 예약 현황이 열리는지 확인한다.
  - 열린 상태에서 회의실 목록 영역을 다시 클릭하면 현황이 닫히고 목록만 남는지 확인한다.
  - 전체 예약 현황 상단 날짜를 바꾸면 타임라인이 해당 날짜 기준으로 갱신되는지 확인한다.
  - 화면에 `Success`, `Loading`, `Error` 전환 탭이 노출되지 않는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 예약 현황 Time Slot Carousel 적용

- 전체 예약 현황 상단의 날짜 입력을 좌우 화살표 기반 Time Slot Carousel로 변경했다.
- 타임라인을 3시간 단위 슬롯으로 표시하고, 이전/다음 버튼으로 시간대를 이동하도록 구현했다.
- 업무 시간 경계에서 이동하면 날짜도 함께 변경되도록 구현했다.
  - 09:00-12:00에서 이전: 전날 15:00-18:00
  - 15:00-18:00에서 다음: 다음날 09:00-12:00
- 표시 중인 슬롯과 겹치는 예약만 타임라인에 표시되도록 필터링했다.
- 타임라인 시간 눈금과 예약 블록 위치 계산을 현재 슬롯 기준으로 동작하도록 수정했다.
- 변경 파일:
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 회의실 목록 영역을 클릭해 전체 예약 현황을 연다.
  - 예약 현황 상단의 좌우 화살표로 시간대가 3시간 단위로 이동하는지 확인한다.
  - 업무 시간 경계에서 날짜가 이전/다음 날짜로 넘어가는지 확인한다.
  - 이동한 시간대와 겹치는 예약만 타임라인에 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 하루 전체 타임라인 및 날짜 Carousel 조정

- 3시간 단위 슬롯 표시를 제거하고, 예약 현황 타임라인을 다시 09:00-18:00 하루 전체 기준으로 표시하도록 수정했다.
- 좌우 화살표는 시간대가 아니라 이전 날짜/다음 날짜만 이동하도록 변경했다.
- 날짜 변경 시 기존처럼 회의실 목록 상태와 전체 예약 현황이 해당 날짜 기준으로 갱신된다.
- 변경 파일:
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 회의실 목록 영역을 클릭해 전체 예약 현황을 연다.
  - 타임라인이 09:00-18:00 전체 시간대로 표시되는지 확인한다.
  - 좌우 화살표 클릭 시 날짜만 이전/다음으로 이동하는지 확인한다.
  - 날짜 이동 후 예약 현황이 해당 날짜 기준으로 갱신되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - Carousel 시간 문구 제거 및 Pretendard 적용

- 예약 현황 Carousel의 날짜 아래 시간 문구를 제거했다.
- `docs/DESIGN.md`의 Typography 기준을 확인하고 전역 CSS의 `body` 폰트를 `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif`로 변경했다.
- 전역 CSS에서 Pretendard 웹폰트를 import해 브라우저에서 실제 Pretendard가 로드되도록 적용했다.
- 컴포넌트별 `font-family` 반복 지정 없이 전역 한 곳에서만 기본 폰트를 적용했다.
- 기존 기능과 레이아웃은 변경하지 않았다.
- 변경 파일:
  - `src/pages/rooms/components/ReservationOverview.tsx`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 전체 예약 현황 Carousel의 날짜 아래 시간 문구가 없는지 확인한다.
  - 전체 프론트엔드 기본 폰트가 Pretendard 스택으로 적용되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 예약 참석자 검색 및 선택 추가

- 회의실 예약 드로어에 참석자 검색 필드를 추가했다.
- 이름 prefix 검색으로 참석자 후보가 표시되도록 구현했다.
  - 예: `김` 입력 시 `김`으로 시작하는 mock 참석자 목록 표시
- 후보를 클릭하면 참석자가 선택 목록에 추가되도록 구현했다.
- 선택된 참석자는 칩 형태로 표시하고, 클릭 시 제거할 수 있도록 구현했다.
- 참석자 mock 데이터를 회의실 페이지 내부 `mock/attendeesMock.ts`로 분리했다.
- 예약 폼 상태 타입에 선택 참석자 목록을 추가했다.
- backend 파일은 수정하지 않았다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/ReservationDrawer.tsx`
  - `src/pages/rooms/mock/attendeesMock.ts`
  - `src/pages/rooms/types/rooms.ts`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 예약 가능한 회의실의 예약 버튼을 클릭한다.
  - 예약 드로어의 참석자 입력에 `김`을 입력한다.
  - `김`으로 시작하는 참석자 후보가 표시되는지 확인한다.
  - 후보 클릭 시 참석자 칩이 추가되는지 확인한다.
  - 참석자 칩 클릭 시 선택 목록에서 제거되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-05 - 참석자 수 기반 예약 인원 자동 계산

- 예약 인원 직접 입력 필드를 제거했다.
- 예약 드로어에서 선택된 참석자 수를 읽기 전용 예약 인원으로 표시하도록 수정했다.
- 참석자 추가/제거 시 예약 인원 값이 자동으로 갱신되도록 연결했다.
- 예약 검증도 숫자 입력값 대신 참석자 선택 수를 기준으로 동작하도록 수정했다.
- 참석자가 0명일 때는 `참석자를 1명 이상 추가하세요.` 검증 메시지가 표시되도록 변경했다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/ReservationDrawer.tsx`
  - `src/pages/rooms/lib/roomUtils.ts`
  - `src/index.css`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 예약 드로어를 열고 참석자를 추가한다.
  - 선택한 참석자 수와 예약 인원 표시가 동일하게 바뀌는지 확인한다.
  - 참석자를 제거하면 예약 인원도 같이 감소하는지 확인한다.
  - 참석자가 없을 때 예약 검토 시 검증 메시지가 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-06 - 회의실 예약 일정 캘린더 표시 범위 정리

- 회의실 예약이 캘린더에 표시되는 기능은 `rooms.md`와 `calendar.md` 양쪽에 모두 기록해야 한다고 정리했다.
- `rooms.md`에는 회의실 예약이 캘린더 표시용 `Schedule`과 연결될 수 있어야 한다는 생성/연결 책임을 기록했다.
- `calendar.md`에는 회의실 예약에서 생성된 일정을 캘린더에 표시하고 일반 일정과 구분해야 한다는 표시 책임을 기록했다.
- 실제 일정 생성 API 연동은 여전히 제외 범위이며, 프론트엔드 mock 단계에서는 `Schedule`과 `Room Reservation` 연결 기준만 맞춘다.
- 변경 파일:
  - `docs/plans/active/rooms.md`
  - `docs/plans/active/calendar.md`
- 확인 방법:
  - `rooms.md`에 캘린더 표시용 Schedule 연결 기준이 기록되어 있는지 확인한다.
  - `calendar.md`에 회의실 예약 일정 표시 요구사항이 기록되어 있는지 확인한다.

##### 2026-07-06 - 예약 완료 복귀 및 캘린더 등록 확인 흐름

- 예약 드로어의 제출 버튼 문구를 `예약하기`로 변경했다.
- 예약하기 성공 시 예약 드로어를 닫고 전체 현황을 접어 `/rooms` 메인 목록 상태로 복귀하도록 수정했다.
- 예약 성공 시 화면 하단 성공 패널에 회의실, 날짜, 시간, 캘린더 일정 등록 결과를 표시하도록 수정했다.
- 회의실 검색 영역에 `초기화` 버튼을 추가했다.
- 초기화 클릭 시 검색 입력값, 적용 검색 조건, 전체 예약 현황 열림 상태, 성공 메시지가 초기 상태로 복귀하도록 구현했다.
- 예약 성공 시 현재 rooms 화면 상태의 해당 회의실 예약 목록에 예약 데이터를 추가하도록 구현했다.
- 예약 성공 시 캘린더 표시용 Schedule 데이터를 `localStorage` mock 저장소에 기록하도록 구현했다.
- 캘린더 화면은 `localStorage`에 저장된 회의실 예약 일정을 초기 mock 일정과 함께 읽어 표시하도록 연결했다.
- backend 파일은 수정하지 않았다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/ReservationDrawer.tsx`
  - `src/pages/rooms/components/RoomSearchPanel.tsx`
  - `src/pages/calendar/CalendarPage.tsx`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 검색 조건을 변경한 뒤 `초기화` 버튼을 클릭하면 기본 검색 조건으로 돌아오는지 확인한다.
  - 예약 가능한 회의실의 `예약` 버튼을 클릭해 드로어를 연다.
  - 제목, 날짜, 시작/종료 시간, 참석자를 입력하고 `예약하기`를 클릭한다.
  - 드로어가 닫히고 `/rooms` 메인 목록 상태로 돌아오는지 확인한다.
  - 성공 패널에 예약 완료 및 캘린더 등록 문구가 표시되는지 확인한다.
  - 회의실 목록 영역을 클릭해 전체 예약 현황을 열고 방금 예약한 시간 블록이 표시되는지 확인한다.
  - `/calendar`로 이동해 예약 날짜를 클릭하면 `회의실 예약` 일정이 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-07 - 첫 진입 예약 현황 기본 표시

- `/rooms` 첫 진입 시 회의실 목록과 예약 현황이 함께 보이도록 전체 예약 현황 초기 상태를 열림으로 변경했다.
- 검색 실행 후에도 검색 결과 기준 목록과 예약 현황이 함께 보이도록 수정했다.
- 검색 초기화 후에도 기본 검색 조건 기준 목록과 예약 현황이 함께 보이도록 수정했다.
- 예약 성공 후 메인 rooms 화면으로 복귀할 때 목록과 예약 현황이 함께 보이도록 수정했다.
- backend 파일은 수정하지 않았다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms` 첫 진입 시 회의실 목록과 예약 현황이 함께 표시되는지 확인한다.
  - 검색 버튼 클릭 후에도 예약 현황이 함께 유지되는지 확인한다.
  - 초기화 버튼 클릭 후 기본 조건의 예약 현황이 함께 표시되는지 확인한다.
  - 예약 성공 후 드로어가 닫히고 목록과 예약 현황이 함께 보이는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

##### 2026-07-07 - 목록 토글 제거 및 예약 드로어 외부 클릭 닫기

- 회의실 목록 섹션 클릭 시 예약 현황이 닫히는 토글 동작을 제거했다.
- `/rooms` 화면은 목록과 예약 현황이 함께 보이는 진입 화면 구조를 유지하도록 했다.
- 예약 버튼 클릭 시 열리는 우측 예약 드로어는 배경 영역 클릭으로 닫히도록 수정했다.
- 예약 드로어 내부 클릭은 닫힘 이벤트가 전파되지 않도록 처리했다.
- backend 파일은 수정하지 않았다.
- 변경 파일:
  - `src/pages/rooms/RoomsPage.tsx`
  - `src/pages/rooms/components/RoomList.tsx`
  - `src/pages/rooms/components/ReservationDrawer.tsx`
  - `docs/plans/active/rooms.md`
  - `progress.md`
- 확인 방법:
  - `/rooms`에서 회의실 목록을 클릭해도 예약 현황이 닫히지 않는지 확인한다.
  - 예약 가능한 회의실의 `예약` 버튼을 클릭하면 우측 예약 드로어가 열리는지 확인한다.
  - 드로어 바깥 배경 영역을 클릭하면 드로어가 닫히는지 확인한다.
  - 드로어 내부 입력 영역을 클릭해도 드로어가 닫히지 않는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.

---

##### 회고

- 회의실 예약 확정과 시간 중복 최종 검증은 backend 책임이므로 프론트엔드는 기본 입력 검증과 검토 메시지만 처리했다.
- 실제 API 연동 시 mock 데이터와 필터 유틸을 서비스 호출 및 서버 상태 관리로 교체해야 한다.
- 회의실 예약이 캘린더에 표시되는 기능은 예약 생성 화면과 캘린더 표시 화면의 공동 책임이므로 두 계획 파일에 모두 남긴다.

#### `calendar.md`에서 이관

##### 작업 결과 기록

- `/calendar` 화면을 계획 기준에 맞춰 구현했다.
- 캘린더 페이지 전용 타입, mock 데이터, 유틸, 컴포넌트를 `src/pages/calendar/` 내부로 분리했다.
- 월간/주간/일간 보기 전환을 구현했다.
- 기준 기간 이전/다음 이동과 오늘 이동을 구현했다.
- 날짜 클릭 시 선택 날짜 일정 목록이 갱신되도록 구현했다.
- 일정 클릭 시 일정 상세 모달이 열리도록 구현했다.
- 일정 추가 버튼 클릭 시 일정 등록 모달이 열리도록 구현했다.
- 일정 등록 폼에 다음 입력 항목을 포함했다.
  - 제목
  - 날짜
  - 시작 시간
  - 종료 시간
  - 하루 종일 여부
  - 위치
  - 일정 유형
  - 공개 범위
  - 색상 라벨
  - 참석자
  - 설명
- 개인/팀/프로젝트 일정 유형 선택을 구현했다.
- 팀 일정 선택 시 팀 선택 UI가 표시되도록 구현했다.
- 프로젝트 일정 선택 시 프로젝트 선택 UI가 표시되도록 구현했다.
- 참석자 이름 검색 및 선택/제거 UI를 구현했다.
- 일정 제목, 날짜, 시간 범위, 팀/프로젝트 선택 기본 검증을 구현했다.
- mock 데이터 기반 일정과 회의실 예약 연동 일정을 캘린더에 표시했다.
- 회의실 예약에서 생성된 일정은 `회의실 예약`으로 구분되도록 표시했다.
- Empty 상태를 선택 날짜 일정 목록과 일간/주간 보기에서 확인할 수 있도록 구현했다.
- 모바일에서 월간/주간/일간 보기와 일정 패널이 단일 컬럼으로 정리되도록 반응형 스타일을 보강했다.
- backend 파일은 수정하지 않았다.
- 변경 파일:
  - `src/pages/calendar/CalendarPage.tsx`
  - `src/pages/calendar/components/CalendarToolbar.tsx`
  - `src/pages/calendar/components/DayCalendar.tsx`
  - `src/pages/calendar/components/MonthCalendar.tsx`
  - `src/pages/calendar/components/ScheduleDetailModal.tsx`
  - `src/pages/calendar/components/ScheduleFormModal.tsx`
  - `src/pages/calendar/components/ScheduleListPanel.tsx`
  - `src/pages/calendar/components/SchedulePill.tsx`
  - `src/pages/calendar/components/WeekCalendar.tsx`
  - `src/pages/calendar/constants/calendarOptions.ts`
  - `src/pages/calendar/lib/calendarUtils.ts`
  - `src/pages/calendar/mock/calendarMetaMock.ts`
  - `src/pages/calendar/mock/schedulesMock.ts`
  - `src/pages/calendar/types/calendar.ts`
  - `src/index.css`
  - `docs/plans/active/calendar.md`
  - `progress.md`
- 검증 결과:
  - `npm run lint` 통과
  - `npm run typecheck` 통과
  - `npm run build` 통과

---

##### 회고

- 캘린더 화면은 현재 단일 `CalendarPage.tsx`에 1차 정적 구조만 있으므로, 구현 단계에서 페이지 내부 폴더 구조 분리부터 진행해야 한다.
- 실제 API 연동 전까지는 `API.md`의 Schedule, User, Team, Project 기준에 맞춘 mock 데이터를 사용한다.
- 회의실 예약과 캘린더 표시는 두 화면의 경계 기능이다. 회의실 계획에는 예약이 일정으로 이어지는 생성 책임을, 캘린더 계획에는 생성된 회의실 예약 일정을 표시하는 책임을 기록한다.

---

##### 추가 작업 결과 기록 - 2026-07-06

- 첫 진입 시 캘린더 보드만 보이고 선택 날짜 일정 목록은 숨기도록 수정했다.
- 날짜를 클릭하면 해당 날짜의 일정 목록 패널이 표시되도록 유지했다.
- 일정 등록 모달과 일정 상세 모달에서 배경 영역 클릭 시 닫히도록 수정했다.
- 모달 내부 클릭은 닫힘 이벤트가 전파되지 않도록 처리했다.
- 월간/주간 캘린더 셀 내부의 중첩 버튼 구조를 제거해 브라우저 콘솔 경고를 정리했다.
- 변경 파일:
  - `src/pages/calendar/CalendarPage.tsx`
  - `src/pages/calendar/components/MonthCalendar.tsx`
  - `src/pages/calendar/components/ScheduleDetailModal.tsx`
  - `src/pages/calendar/components/ScheduleFormModal.tsx`
  - `src/pages/calendar/components/WeekCalendar.tsx`
  - `src/index.css`
- 확인 방법:
  - `/calendar` 최초 진입 시 월간 캘린더만 표시되는지 확인한다.
  - 날짜 셀을 클릭하면 해당 날짜 일정 목록 패널이 표시되는지 확인한다.
  - 일정 추가 모달을 연 뒤 모달 바깥 영역을 클릭하면 닫히는지 확인한다.
  - 일정 상세 모달을 연 뒤 모달 바깥 영역을 클릭하면 닫히는지 확인한다.
  - 월간/주간 보기에서 날짜 셀 내부 일정을 클릭해 상세 모달이 열리고 콘솔 중첩 버튼 경고가 재발하지 않는지 확인한다.

---

##### 추가 작업 결과 기록 - 2026-07-06 2차

- 캘린더 날짜 선택 후 캘린더 영역 바깥을 클릭하면 선택 날짜를 해제하고 캘린더가 단독 레이아웃으로 복귀하도록 수정했다.
- 모달 영역 클릭은 캘린더 선택 해제 대상에서 제외해 일정 등록/상세 모달 조작과 충돌하지 않도록 했다.
- 일정 등록 모달의 `일정 유형` 선택을 select에서 이모지 포함 카드형 버튼 선택 UI로 변경했다.
- 일정 등록 모달의 `공개 범위` 선택을 select에서 이모지 포함 카드형 버튼 선택 UI로 변경했다.
- 카드형 선택 UI에 hover, focus, selected 상태를 추가했다.
- 변경 파일:
  - `src/pages/calendar/CalendarPage.tsx`
  - `src/pages/calendar/components/ScheduleFormModal.tsx`
  - `src/index.css`
  - `docs/plans/active/calendar.md`
  - `progress.md`
- 확인 방법:
  - `/calendar`에서 날짜 셀을 클릭하면 해당 날짜 일정 목록 패널이 표시되는지 확인한다.
  - 일정 목록 패널이 표시된 상태에서 캘린더 영역 바깥을 클릭하면 목록 패널이 닫히고 캘린더가 넓게 복귀하는지 확인한다.
  - 일정 등록 모달에서 일정 유형과 공개 범위가 카드형 버튼으로 표시되고 선택 상태가 반영되는지 확인한다.
  - 팀 일정 선택 시 팀 선택 UI, 프로젝트 일정 선택 시 프로젝트 선택 UI가 기존처럼 표시되는지 확인한다.

---

##### 추가 작업 결과 기록 - 2026-07-07

- 일정 등록 모달에서 `하루 종일`을 선택하면 시작 시간이 `09:00`, 종료 시간이 `18:00`으로 자동 설정되도록 수정했다.
- `하루 종일` 해제 시에는 현재 입력된 시간 값을 유지하도록 했다.
- backend 파일은 수정하지 않았다.
- 변경 파일:
  - `src/pages/calendar/components/ScheduleFormModal.tsx`
  - `docs/plans/active/calendar.md`
  - `progress.md`
- 확인 방법:
  - `/calendar`에서 일정 등록 모달을 연다.
  - `하루 종일`을 체크하면 시작/종료 시간이 `09:00~18:00`으로 표시되는지 확인한다.
  - `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
