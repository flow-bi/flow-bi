# 작업 계획: 회의실 예약

## 상태

- Status: Done
- Priority: High
- Owner: Codex
- Started At: 2026-07-05
- Completed At: 2026-07-05

---

## 목적

로그인 이후 사용자가 회의실 목록과 예약 현황을 확인하고, 조건에 맞는 회의실을 찾아 예약할 수 있는 `/rooms` 화면을 구현한다.

회의실 화면은 1차 핵심 기능 중 대시보드 다음 순서이며, 사용자가 날짜, 시간, 인원, 상태 기준으로 회의실을 검색하고 예약 패널 또는 모달을 통해 예약 정보를 입력할 수 있도록 한다.

---

## 작업 범위

### 포함

- `/rooms` 라우팅 연결 확인 및 회의실 화면 표시
- 로그인 이후 공통 레이아웃 내부에서 회의실 화면 렌더링
- 회의실 목록 표시
- 회의실 예약 현황 표시
- 날짜, 시간, 인원, 상태 검색 조건 UI
- 검색 조건에 따른 mock 데이터 필터링
- 예약 버튼 클릭 시 우측 드로어 또는 모달 표시
- 예약 폼 입력 UI
- 예약 완료 시 캘린더에 표시될 Schedule 생성 흐름 고려
- 캘린더에서 회의실 예약 일정을 표시할 수 있도록 Schedule과 Room Reservation 연결 기준 정리
- 프론트엔드 1차 검증
  - 필수값 누락 여부
  - 시작 시간이 종료 시간보다 빠른지 여부
  - 예약 인원이 1명 이상인지 여부
- Loading, Empty, Error, Success 상태 표시
- mock 데이터 기반 화면 구성
- 작업 완료 후 `progress.md` 요약 기록

### 제외

- 실제 회의실 목록 API 연동
- 실제 회의실 예약 확정 API 연동
- 예약 시간 중복 여부의 최종 검증
- 실제 일정 생성 API 연동
- 외부 캘린더 연동
- 실시간 예약 현황 갱신
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

- `/rooms` 경로에서 회의실 화면이 표시되어야 한다.
- 로그인 이후 화면 구조인 좌측 사이드바, 상단 헤더, 메인 콘텐츠 영역 안에서 표시되어야 한다.
- 회의실 목록과 예약 현황은 분리해서 표현한다.
- 날짜, 시간대, 수용 인원, 상태 기준으로 회의실을 검색할 수 있어야 한다.
- 회의실 목록에는 회의실명, 위치, 수용 인원, 장비, 상태가 표시되어야 한다.
- 예약 현황에는 예약 제목, 회의실명, 시작 시간, 종료 시간, 인원, 상태가 표시되어야 한다.
- 예약 현황은 모든 회의실에 대한 예약현황이 한눈에 확인 가능하도록 해야 한다.
- 예약 버튼 클릭 시 우측 드로어 또는 모달로 예약 폼이 열려야 한다.
- 예약 폼에는 최소한 제목, 날짜, 시작 시간, 종료 시간, 인원, 선택 회의실을 포함한다.
- 예약 완료 후 해당 예약은 캘린더에서 일정처럼 확인될 수 있어야 한다.
- 회의실 예약으로 생성되는 일정은 `Schedule`의 `location`, `attendees`, `startAt`, `endAt`과 연결되어야 한다.
- 필수값, 시간 범위, 인원 수는 프론트엔드에서 1차 검증한다.
- 예약 시간 중복 여부는 실제 백엔드 검증 결과를 우선해야 하므로 mock 단계에서는 최종 확정처럼 처리하지 않는다.
- 업무용 서비스답게 정보 확인이 쉬운 정돈된 레이아웃을 사용한다.
- 디자인 문서의 Light Blue 배경 계열과 Purple 강조 컬러를 따른다.

---

## 필요한 데이터

### Room

회의실 목록과 예약 대상 선택에 사용한다.

- roomId
- roomName
- capacity
- location
- equipment
- reservations

### Room Reservation

회의실 예약 현황과 예약 폼 결과 표시에 사용한다.

- reservationId
- roomId
- scheduleId
- title
- startAt
- endAt
- status
- count

### Schedule

회의실 예약이 일정과 연결될 때 필요한 데이터 기준이다.

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

### Calendar Integration

회의실 예약 완료 후 캘린더 표시를 위해 필요한 연결 기준이다.

- 회의실 예약은 `Room Reservation`으로 관리한다.
- 캘린더 표시는 `Schedule` 기준으로 처리한다.
- `Room Reservation.scheduleId`는 캘린더에 표시되는 `Schedule.scheduleId`와 연결된다.
- 회의실명과 위치는 `Schedule.location` 또는 연결된 `Room` 정보로 표시한다.
- 참석자는 예약 폼에서 선택한 참석자 목록을 `Schedule.attendees`로 반영한다.

### UI State

API 요청 상태 기준과 화면 상태 표시 기준을 맞춘다.

- idle
- loading
- success
- error
- empty

### Local State

회의실 화면에서만 사용하는 상태로 관리한다.

- 선택한 날짜
- 선택한 시작 시간
- 선택한 종료 시간
- 검색 인원
- 검색 상태
- 선택한 회의실
- 예약 패널 또는 모달 열림 여부
- 예약 폼 입력값
- 예약 폼 검증 오류 메시지

---

## UI 상태

- Loading
  - 회의실 목록 또는 예약 현황을 불러오는 중인 상태를 표시한다.
- Empty
  - 검색 조건에 맞는 회의실 또는 예약 현황이 없을 때 빈 상태 메시지를 표시한다.
- Error
  - 회의실 데이터 또는 예약 현황을 불러오지 못했을 때 오류 메시지를 표시한다.
- Success
  - mock 데이터 기반으로 회의실 목록과 예약 현황을 표시한다.
- Disabled
  - 예약 불가 상태인 회의실의 예약 버튼은 비활성화한다.
  - 예약 폼 필수값이 유효하지 않으면 예약 제출 버튼을 비활성화하거나 검증 메시지를 표시한다.

---

## 구현 단계

1. 현재 `/rooms` 라우팅과 기존 회의실 화면 구현 상태를 확인한다.
2. 회의실 페이지 폴더 구조를 `frontend/AGENTS.md` 기준에 맞춘다.
   - `src/pages/rooms/RoomsPage.tsx`
   - `src/pages/rooms/components/*.tsx`
   - `src/pages/rooms/mock/*.ts`
   - `src/pages/rooms/types/*.ts`
   - `src/pages/rooms/lib/*.ts`
   - `src/pages/rooms/constants/*.ts`
3. `API.md`의 Room, Room Reservation, Schedule 기준에 맞춰 타입과 mock 데이터를 정리한다.
4. 회의실 화면 주요 영역을 컴포넌트로 분리한다.
   - 검색 조건 영역
   - 회의실 목록
   - 예약 현황
   - 예약 패널 또는 모달
5. 검색 조건 상태와 mock 데이터 필터링을 구현한다.
6. 예약 버튼 클릭 시 선택 회의실을 기준으로 예약 UI가 열리도록 구현한다.
7. 예약 폼 입력값과 기본 검증을 구현한다.
8. 예약 검토 또는 예약 완료 시 캘린더 표시용 `Schedule` 데이터로 변환 가능한 구조를 정리한다.
9. Loading, Empty, Error, Success, Disabled 상태 UI를 구현한다.
10. `DESIGN.md` 기준에 맞춰 화면 레이아웃과 반응형 스타일을 정리한다.
11. `npm run lint`, `npm run typecheck`, `npm run build`로 검증한다.
12. 작업 결과와 검증 결과를 `progress.md`에 요약 기록한다.
13. 완료 기준을 만족하면 이 계획 파일의 상태를 `Done`으로 변경한다.

---

## 완료 기준

- `/rooms` 경로에서 회의실 화면이 표시된다.
- 로그인 이후 공통 레이아웃 안에서 회의실 화면이 표시된다.
- mock 데이터 기반 회의실 목록이 표시된다.
- mock 데이터 기반 예약 현황이 표시된다.
- 날짜, 시간, 인원, 상태 검색 조건이 표시된다.
- 검색 조건 변경 시 회의실 목록 또는 예약 현황이 갱신된다.
- 검색 결과가 없을 때 Empty 상태가 표시된다.
- Loading 상태가 표시된다.
- Error 상태가 표시된다.
- 예약 불가 회의실의 예약 버튼은 Disabled 상태로 표시된다.
- 예약 버튼 클릭 시 예약 패널 또는 모달이 열린다.
- 예약 폼에서 필수값, 시간 범위, 인원 수 기본 검증이 동작한다.
- 회의실 예약 데이터가 캘린더 표시용 `Schedule`과 연결 가능한 구조를 가진다.
- 캘린더에서 회의실 예약 일정을 표시할 수 있도록 `scheduleId`, 회의실 위치, 참석자, 시간 정보가 정리된다.
- 회의실 관련 mock 데이터가 페이지 폴더 내부에 분리되어 있다.
- `npm run lint`가 통과한다.
- `npm run typecheck`가 통과한다.
- `npm run build`가 통과한다.
- 작업 결과가 `progress.md`에 요약 기록된다.
- backend 파일을 수정하지 않는다.

---
