# Progress

## Current Status

조직도 트리에서 토글 클릭과 조직 선택 클릭 동작을 분리했다.

---

## Done

- 프론트엔드 하네스 문서 구조 정의
- 로그인 화면 1차 구현
- 로그인 후 대시보드 이동 처리
- 대시보드 및 주요 업무 화면 1차 구현
- 로그인 이후 공통 레이아웃 구성
- Phase 1 대시보드 완료 기준 보강
- `docs/plans/active/dashboard.md` 기준 대시보드 화면 정리
- `docs/plans/active/rooms.md` 기준 회의실 예약 화면 구현
- 회의실 검색 시간대별 예약 가능 상태 반영 및 예약 현황 타임라인 개선
- 회의실 목록 영역 클릭 시 전체 예약 현황 타임라인 표시 및 검색 버튼 적용 흐름 구현
- 회의실 예약 현황 블록 상세 정보 팝오버와 업무용 타임라인 디자인 개선
- 회의실 전체 현황 닫기 토글, 현황 날짜 변경, Success/Loading/Error 전환 UI 제거
- 회의실 예약 현황 Time Slot Carousel 적용 및 시간대/날짜 이동 처리
- 회의실 예약 현황 3시간 슬롯 제거 및 하루 전체 타임라인 기준 날짜 이동 Carousel 조정
- 회의실 예약 현황 Carousel 시간 문구 제거 및 전역 Pretendard 폰트 적용
- 회의실 예약 드로어 참석자 이름 검색, 후보 선택, 선택 칩 제거 기능 추가
- 회의실 예약 인원 직접 입력 제거 및 참석자 수 기반 자동 계산 적용
- 회의실 예약 일정 캘린더 표시 책임을 `rooms.md`와 `calendar.md`에 분리 기록
- `docs/plans/active/calendar.md` 기준 캘린더 월간/주간/일간 보기, 일정 등록/상세 모달, 회의실 예약 일정 표시 구현
- 캘린더 첫 진입 시 날짜 목록 패널 숨김 및 일정 등록/상세 모달 외부 클릭 닫기 적용
- 캘린더 날짜 선택 후 바깥 클릭 복귀 및 일정 유형/공개 범위 카드형 선택 UI 적용
- 회의실 예약 완료 후 메인 복귀, 검색 초기화 버튼, 예약 결과 및 캘린더 mock 일정 등록 확인 흐름 적용
- 회의실 첫 진입, 검색, 초기화, 예약 완료 후 목록과 예약 현황을 함께 표시하도록 변경
- 회의실 목록 클릭 시 현황 닫힘 제거 및 예약 드로어 외부 클릭 닫기 적용
- 캘린더 일정 등록에서 하루 종일 선택 시 시작/종료 시간을 09:00~18:00으로 자동 설정
- Phase 2 조직도 화면의 부서/팀 구조, 직원 목록, 검색, 필터, 상세 패널, Loading/Empty/Error 상태 구현
- 조직도 화면의 상태 노출 UI 제거 및 직원 목록/상세 패널 겹침 방지 레이아웃 보정
- 조직도 부서/팀 구조를 상위 조직 아래 하위 팀이 펼쳐지는 토글 트리로 변경
- 조직도 트리 토글 버튼 크기 확대 및 토글/조직 선택 클릭 동작 분리

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
