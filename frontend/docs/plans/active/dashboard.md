# 작업 계획: 대시보드

## 상태

- Status: Done
- Priority: High
- Owner: Codex
- Started At: 2026-07-03
- Completed At: 2026-07-03

---

## 목적

로그인 이후 사용자가 가장 먼저 확인하는 `/dashboard` 화면을 구현한다.

대시보드는 사용자가 오늘의 업무 상황을 빠르게 파악할 수 있도록 AI 오늘 일정 요약, 오늘의 일정, 주간 일정, 팀원 상태를 한 화면에 제공한다.

---

## 작업 범위

### 포함

- `/dashboard` 라우팅 연결 확인 및 대시보드 화면 표시
- 로그인 이후 공통 레이아웃 내부에서 대시보드 렌더링
- AI 오늘 일정 요약 카드
- 오늘의 일정 목록
- 주간 일정 요약
- 팀원 상태 영역
- mock 데이터 기반 화면 구성
- Loading, Empty, Error, Success 상태 표시
- 주요 사용자 상호작용
  - AI 추천 액션 선택
  - 주간 일정 날짜 선택
  - 상태별 화면 확인
- 작업 완료 후 `progress.md` 요약 기록

### 제외

- 실제 AI 모델 연동
- 실시간 팀원 상태 연동
- 실제 일정 조회 API 연동
- 실제 팀원 상태 API 연동
- 일정 등록/수정/삭제 기능
- 회의실 예약 상세 기능
- 캘린더 화면 상세 구현
- backend 수정

---

## 관련 문서

- `AGENTS.md`
- `frontend/AGENTS.md`
- `docs/PRODUCT.md`
- `docs/FRONTEND.md`
- `docs/DESIGN.md`
- `docs/API.md`
- `docs/STATE.md`
- `docs/ARCHITECTURE.md`
- `docs/plans/active/phase-1-core-features.md`
- `progress.md`

---

## 화면 요구사항

- `/dashboard` 경로에서 대시보드 화면이 표시되어야 한다.
- `/` 접근 시 대시보드로 이동하는 기존 라우팅 기준을 따른다.
- 로그인 이후 화면 구조인 좌측 사이드바, 상단 헤더, 메인 콘텐츠 영역 안에서 표시되어야 한다.
- 업무용 서비스답게 정보 확인이 쉬운 카드/목록 중심 레이아웃을 사용한다.
- 디자인 문서의 Light Blue 배경 계열과 Purple 강조 컬러를 따른다.
- AI 기능은 자연스럽게 포함하되 실제 AI 연동처럼 오해되지 않도록 mock 응답 기준으로 관리한다.
- 맨 위에 오늘일정, 주간일정, 팀원 상태 요약을 숫자로 카드형식으로 나타내지 않는다.
- 대시보드 화면은 다음 영역만을 포함한다.
  - AI 오늘 일정 요약
  - 오늘의 일정 목록
  - 주간 일정 요약
  - 팀원 상태
- 데이터 없음 상태가 명확히 표시되어야 한다.
- 로딩 및 오류 상태 표시하지 않는다.

---

## 필요한 데이터

### User

대시보드 사용자 맥락 및 팀원 상태 표시 기준으로 사용한다.

- userId
- employeeNumber
- name
- email
- phoneNumber
- status
- profileImageUrl
- team
- position
- roles

### Team

대시보드 팀원 상태 영역에 사용한다.

- teamId
- teamName
- parentTeamId
- members

### Schedule

오늘의 일정과 주간 일정 요약에 사용한다.

- scheduleId
- title
- scheduleType
- visibility
- startAt
- endAt
- creatorId
- location
- content
- targets
- attendees
- colorLabel

일정 유형은 다음 값을 사용한다.

- PERSONAL
- TEAM
- PROJECT

### AI Chat Summary

AI 오늘 일정 요약 카드에 사용한다.

- message
- intent
- response
- suggestedActions
- confirmationRequired

### UI State

API 요청 상태 기준과 화면 상태 표시 기준을 맞춘다.

- idle
- loading
- success
- error
- empty

---

## UI 상태

- Loading
  - 일정/팀원/AI 요약 데이터를 불러오는 중인 상태를 표시한다.
- Empty
  - 오늘 일정 또는 주간 일정이 없을 때 빈 상태 메시지를 표시한다.
  - 팀원 상태 데이터가 없을 때 빈 상태 메시지를 표시한다.
- Error
  - 대시보드 데이터를 불러오지 못했을 때 오류 메시지를 표시한다.
- Success
  - mock 데이터 기반으로 AI 요약, 오늘 일정, 주간 일정, 팀원 상태를 표시한다.
- Disabled
  - 데이터 변경 액션이 아닌 단순 추천 액션은 disabled가 필요하지 않다.
  - 추후 데이터 변경 액션이 추가될 경우 확인 UI를 거친 뒤 활성화한다.

---

## 구현 단계

1. 현재 대시보드 관련 기존 파일과 라우팅 연결 상태를 확인한다.
2. 대시보드 페이지 폴더 구조를 `frontend/AGENTS.md` 기준에 맞춘다.
   - `src/pages/dashboard/DashboardPage.tsx`
   - `src/pages/dashboard/components/*.tsx`
   - `src/pages/dashboard/mock/*.ts`
   - `src/pages/dashboard/types/*.ts`
   - `src/pages/dashboard/lib/*.ts`
3. `API.md`의 User, Team, Schedule, AI Chat 기준에 맞춰 mock 데이터와 타입을 정리한다.
4. 대시보드 주요 영역을 컴포넌트로 분리한다.
   - AI 오늘 일정 요약
   - 오늘의 일정 목록
   - 주간 일정 요약
   - 팀원 상태
5. Loading, Empty, Error, Success 상태 UI를 구현한다.
6. 주요 사용자 상호작용을 구현한다.
   - 주간 일정 날짜 선택
   - AI 추천 액션 선택
   - 상태별 화면 확인
7. `DESIGN.md` 기준에 맞춰 화면 레이아웃과 반응형 스타일을 정리한다.
8. `npm run lint`, `npm run typecheck`, `npm run build`로 검증한다.
9. 작업 결과와 검증 결과를 `progress.md`에 요약 기록한다.
10. 완료 기준을 만족하면 이 계획 파일의 상태를 `Done`으로 변경한다.

---

## 완료 기준

- `/dashboard` 경로에서 대시보드 화면이 표시된다.
- 로그인 이후 공통 레이아웃 안에서 대시보드가 표시된다.
- mock 데이터 기반으로 AI 오늘 일정 요약이 표시된다.
- mock 데이터 기반으로 오늘 일정 목록이 표시된다.
- mock 데이터 기반으로 주간 일정 요약이 표시된다.
- mock 데이터 기반으로 팀원 상태가 표시된다.
- 데이터 없음 상태가 표시된다.
- Loading 상태가 표시된다.
- Error 상태가 표시된다.
- 주간 일정 날짜 선택 상호작용이 동작한다.
- AI 추천 액션 선택 상호작용이 동작한다.
- 대시보드 관련 mock 데이터가 페이지 폴더 내부에 분리되어 있다.
- `npm run lint`가 통과한다.
- `npm run typecheck`가 통과한다.
- `npm run build`가 통과한다.
- 작업 결과가 `progress.md`에 요약 기록된다.
- backend 파일을 수정하지 않는다.

---

## Codex 프롬프트 기록

### Prompt 1 - 작업 계획 작성

```txt
루트 AGENTS.md와 frontend/AGENTS.md를 읽고, frontend/docs 문서와 frontend/progress.md를 확인해줘.

이제 대시보드 화면 작업을 시작할 거야.

먼저 frontend/docs/plans/_template.md를 기준으로 frontend/docs/plans/active/dashboard.md 작업 계획 파일을 만들어줘.

계획 파일에는 작업 목적, 범위, 필요한 데이터, 구현 단계, 완료 기준, Codex 프롬프트 기록 영역을 포함해줘.

아직 코드는 수정하지 말고, 계획 파일만 작성해줘.
backend는 수정하지 마.
```

### Prompt 2 - 대시보드 구현

```txt
dashboard.md 파일 조금 수정했어. 이제frontend/docs/plans/active/dashboard.md 계획을 기준으로 대시보드 화면을 구현해줘.  작업 범위는 frontend 내부로 제한하고 backend는 수정하지 마.

작업 후 다음을 기록해줘.
1. frontend/docs/plans/active/dashboard.md의 작업 결과 기록
2. frontend/progress.md의 현재 진행 상황 요약

사용한 프롬프트도 dashboard.md의 Codex 프롬프트 기록 섹션에 남겨줘.
```

### Prompt 3 - AI 업무 비서 상단 배치

```txt
대시보드의 AI 업무 비서 부분을 젤 위에 가로로 길게 배치하고 그 밑으로 지금처럼 오늘의 일정목록, 팀원 상태 넣어주는데
화면 구조는 유지하고, backend는 수정하지 마.

수정 후 변경 파일과 확인 방법을 frontend/docs/plans/active/dashboard.md에 기록하고,
frontend/progress.md에는 한 줄 요약만 남겨줘.
```

---

## 작업 결과 기록

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

### 2026-07-05 - AI 업무 비서 상단 배치

#### 변경 내용

- AI 오늘 일정 요약 패널을 대시보드 그리드 최상단에서 전체 폭으로 표시하도록 조정했다.
- AI 패널 아래에 오늘의 일정 목록, 팀원 상태, 주간 일정 요약이 이어지도록 렌더링 순서를 조정했다.
- 기존 대시보드 네 영역 구조는 유지했다.
- backend 파일은 수정하지 않았다.

#### 변경 파일

- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/dashboard/components/AiDailySummaryPanel.tsx`
- `src/pages/dashboard/components/WeeklySchedulePanel.tsx`
- `src/index.css`
- `docs/plans/active/dashboard.md`
- `progress.md`

#### 확인 방법

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. 개발 서버에서 `/dashboard` 접속 후 AI 오늘 일정 요약 패널이 최상단 전체 폭으로 표시되는지 확인한다.
5. AI 패널 아래에 오늘의 일정 목록과 팀원 상태가 표시되는지 확인한다.

---

## 회고

- 계획 파일 안에서 UI 상태/완료 기준에는 Loading/Error가 남아 있으나, 화면 요구사항에는 “로딩 및 오류 상태 표시하지 않는다”가 명시되어 있었다.
- 이번 구현에서는 더 구체적인 화면 요구사항을 우선 적용했다.
- 추후 계획 문서 정리 시 UI 상태와 완료 기준의 Loading/Error 항목을 대시보드 요구사항에 맞게 정리할 필요가 있다.
