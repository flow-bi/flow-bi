# 작업 계획: 조직도

## 상태

- Status: Planned
- Priority: Medium
- Owner: Codex
- Started At: 2026-07-07
- Completed At:

---

## 목적

Phase 2 작업으로 `/organization` 조직도 화면을 구현한다.

사용자가 공통 Layout 안에서 부서/팀 구조와 직원 목록을 조회하고, 직원 검색 및 팀/부서 필터링을 통해 조직 구성원을 빠르게 찾을 수 있도록 한다. 직원 클릭 시 상세 정보 패널 또는 모달을 통해 기본 인사 정보를 확인할 수 있게 한다.

---

## 작업 범위

### 포함

- `/organization` 라우트 연결 확인
- 로그인 이후 공통 Layout 안에서 조직도 화면 표시
- 부서/팀 구조 표시
- 직원 목록 표시
- 직원 검색
- 팀 또는 부서별 필터링
- 직원 클릭 시 상세 정보 패널 또는 모달 표시
- mock 데이터 기반 화면 구성
- 주요 사용자 상호작용 구현
- 조직도 페이지 전용 타입, mock, 유틸, 컴포넌트 정리

### 제외

- 실제 직원 API 연동
- 조직 변경/수정 기능
- 권한별 조직도 노출 제어
- 실시간 상태 연동
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
- `progress.md`

---

## 화면 요구사항

- `/organization` 경로에서 조직도 화면이 표시되어야 한다.
- 로그인 이후 공통 Layout의 좌측 사이드바, 상단 헤더, 메인 콘텐츠 영역 안에서 표시되어야 한다.
- 부서/팀 구조를 사용자가 스캔하기 쉬운 형태로 표시해야 한다.
- 팀 선택 시 해당 팀 또는 하위 조직 기준 직원 목록이 필터링되어야 한다.
- 검색어 입력 시 이름, 사번, 이메일, 직무/직책 등 주요 직원 정보 기준으로 목록이 필터링되어야 한다.
- 직원 목록에는 이름, 팀, 직책/직무, 이메일, 연락처, 상태 등 핵심 정보를 표시해야 한다.
- 직원 클릭 시 상세 정보 패널 또는 모달이 표시되어야 한다.
- 선택된 팀/직원 상태가 화면에서 명확히 구분되어야 한다.
- 검색 결과가 없을 때 Empty 상태가 표시되어야 한다.
- mock 로딩/에러 상태를 확인할 수 있는 구조를 고려해야 한다.
- 업무용 서비스답게 과한 장식보다 정보 밀도와 가독성을 우선한다.
- 디자인 문서의 Light Blue 배경 계열, Purple 선택/강조 컬러, Pretendard 기본 폰트를 따른다.

---

## 필요한 데이터

### Team

`API.md`의 Team 기준을 따른다.

- teamId
- teamName
- parentTeamId
- members

### User

`API.md`의 User 기준을 따른다.

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

### UI State

- selectedTeamId
- selectedUserId 또는 selectedUser
- searchQuery
- statusFilter 또는 teamFilter
- viewState
  - idle
  - loading
  - success
  - error
  - empty

---

## UI 상태

- Loading
  - 조직/직원 데이터를 불러오는 중인 상태를 표시한다.
- Empty
  - 검색어 또는 팀 필터 조건에 맞는 직원이 없을 때 표시한다.
- Error
  - 조직도 데이터를 불러오지 못한 상태를 표시한다.
- Success
  - mock 조직/직원 데이터가 정상 표시되는 상태다.
- Disabled
  - 실제 수정 기능이 없으므로 조직 변경/수정 관련 액션은 제공하지 않는다.

---

## 구현 단계

1. 현재 `/organization` 라우트와 `OrganizationPage` 구현 상태를 확인한다.
2. 기존 공통 Layout 연결 상태와 사이드바 메뉴 동작을 확인한다.
3. 조직도 페이지 폴더 구조를 `frontend/AGENTS.md` 기준에 맞춘다.
   - `src/pages/organization/OrganizationPage.tsx`
   - `src/pages/organization/components/*.tsx`
   - `src/pages/organization/mock/*.ts`
   - `src/pages/organization/types/*.ts`
   - `src/pages/organization/lib/*.ts`
4. `API.md`의 User, Team 기준에 맞춰 조직도 mock 데이터와 타입을 정리한다.
5. 부서/팀 구조 표시 컴포넌트를 구현한다.
6. 직원 목록 컴포넌트를 구현한다.
7. 검색어 입력과 팀/부서 필터링 상태를 구현한다.
8. 직원 클릭 시 상세 정보 패널 또는 모달을 표시한다.
9. Loading, Empty, Error 상태 UI를 구현 또는 확인 가능한 구조로 반영한다.
10. `DESIGN.md` 기준에 맞춰 화면 레이아웃과 반응형 스타일을 정리한다.
11. `npm run lint`, `npm run typecheck`, `npm run build`로 검증한다.
12. 구현 완료 기록, 변경 내역, 확인 결과는 `frontend/progress.md`에만 기록한다.

---

## 완료 기준

- `/organization` 경로에서 조직도 화면이 표시된다.
- 공통 Layout 안에서 화면이 표시된다.
- 부서/팀 구조가 표시된다.
- 직원 목록이 표시된다.
- 직원 검색이 동작한다.
- 팀 또는 부서별 필터링이 동작한다.
- 직원 클릭 시 상세 정보 패널 또는 모달이 표시된다.
- mock 데이터 기반으로 화면이 구성된다.
- Loading, Empty, Error 상태를 확인할 수 있다.
- 주요 사용자 상호작용이 동작한다.
- 조직도 관련 mock 데이터가 페이지 폴더 내부에 분리되어 있다.
- `npm run lint`가 통과한다.
- `npm run typecheck`가 통과한다.
- `npm run build`가 통과한다.
- 구현 완료 기록, 변경 내역, 확인 결과가 `frontend/progress.md`에 기록된다.
- `rooms.md`, `calendar.md`, `dashboard.md` 등 다른 active 계획 문서에는 진행 기록을 추가하지 않는다.
- backend 파일을 수정하지 않는다.

---

## 기록 규칙

- `organization.md`는 작업 계획 문서로만 사용한다.
- 구현 완료 기록, 변경 내역, 확인 결과는 반드시 `frontend/progress.md`에 기록한다.
- `rooms.md`, `calendar.md`, `dashboard.md` 같은 다른 active 계획 문서에는 조직도 진행 기록을 추가하지 않는다.
- 작업 중 계획이 변경될 경우에만 `organization.md`를 수정한다.

---
