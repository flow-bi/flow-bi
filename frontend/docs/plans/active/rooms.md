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

## Codex 프롬프트 기록

### Prompt 1 - 작업 계획 작성

```txt
루트 AGENTS.md와 frontend/AGENTS.md를 읽고, frontend/docs 문서와 frontend/progress.md를 확인해줘.

로그인 화면은 구현 완료되어 있고, 대시보드는 현재 보류한다.
이제 1차 핵심 기능 중 회의실 예약 화면 작업을 시작할 거야.

먼저 frontend/docs/plans/_template.md를 기준으로 frontend/docs/plans/active/rooms.md 작업 계획 파일을 만들어줘.

코드 수정하지 말고 일단 문서 작성부터 해줘
```

### Prompt 2 - 회의실 예약 화면 구현

```txt
루트 AGENTS.md와 frontend/AGENTS.md를 읽고, frontend/docs 문서와 frontend/progress.md를 확인해줘.

frontend/docs/plans/active/rooms.md 작업 계획을 기준으로 회의실 예약 화면을 구현해줘.
```

### Prompt 3 - 시간대 검색 및 예약 현황 시각화 개선

```txt
일단 회의실 검색에 따라서 시작, 종료 시간을 달리했을때 밑에 회의실 목록도 그 상태에 맞게 바뀌어야 하는데 지금 그런게 되지 않고 있거든? 두번째로, 예약 현황은 저렇게 줄글로 보여주지 말고 그래프처럼 시각적인 효과로 쓰고 있는 시간에 해당 회의실 블록을 설정한다던가? 시작적인 효과로 나타냈으면 좋겠어. 세번째로, 처음 메인 화면에서는 회의실 목록만 보여주고 회의실을 누르면 예약 현황이 뜨게 하는건 어때?
frontend/AGETNS.md는 항상 참고해야돼
```

### Prompt 4 - 전체 예약 현황 및 검색 버튼 흐름 조정

```txt
자 좋은데,
1. 회의실 메인 화면에 들어갔을때 지금처럼 떠 있다가 회의실 목록 박스? 를 눌렀을때 전에처럼 전체 회의실에 대한 현황이 나와야돼. 지금은 해당 회의실을 누르면 그거에 대한 현황이 나오잖아. 근데 전체 현황에 대해 지금처럼 이미지로 뜨면 좋겠어.

2. 회의실 검색은 검색 버튼을 눌렀을 때 지금처럼 결과에 맞는 회의실을 보여주면 돼. 즉, 처음 접속 하면 회의실 목록과 검색 창이 있는거고, 목록 영역을 누르면 전체 회의실에 대한 현황이 뜨는거야. 지금처럼 시각적으로. 그리고 검색을 누르면 지금처럼 해당 검색 결과에 대한게 뜨면 돼.

일단 이렇게 말한것까지만 수정해보자
```

### Prompt 5 - 예약 현황 블록 상세 정보 및 디자인 개선

```txt
예약 현황 부분 수정:
1. 현재 블록안에 글자가 이상하게 잘림 -> 자연스럽게 변경
2. 블록 위에 마우스를 올린다거나 클릭시 정보가 뜰 수 있어야함 (어떤팀, 누가 예약 등등)
3. 전반적인 디자인이 좋지 않음. 조금 더 오피스스럽게

frontend/FRONTEND.md 내의 폰트 확인 후 알맞게 수정
```

### Prompt 6 - 현황 토글, 현황 날짜 변경, 상태 전환 UI 제거

```txt
수정사항:
1. 회의실 목록을 다시 누르면 첫 메인 화면처럼 목록만 뜰 수 있게 함
2. 회의실 현황이 뜬 상태에서 상단에 예약하기 옆에 날짜를 변경할 수 있는 컴포넌트를 둔다 -> 날짜 변경 시 회의실 예약 현황도 변경 될 수 있게하여 사용자 편의성을 높인다.
3. success/loading/error는 화면상에서 제거한다.
```

### Prompt 7 - Time Slot Carousel 적용

```txt
예약 현황에 있는 날짜는 좌우 화살표로 시간대를 이동할 수 있는 Time Slot Carousel 형태로 구성해줘.
사용자는 이전/다음 화살표 버튼으로 시간대 또는 날짜를 넘길 수 있어야 해.
```

### Prompt 8 - 하루 전체 타임라인 유지 및 날짜 이동만 적용

```txt
아니 하루를 3시간 단위로 나눌필요까진 없어. 이전처럼 하루가 다 보이고 날짜만 넘길 수 있게 수정하면 돼.
```

### Prompt 9 - Carousel 시간 문구 제거 및 Pretendard 전역 폰트 적용

```txt
날짜 밑에 시간은 없애도 돼.

추가적으로  frontend/docs/DESIGN.md의 Typography 기준에 따라 전체 프론트엔드 기본 폰트를 Pretendard로 적용해줘.

전역 CSS 또는 theme 설정 한 곳에서 적용하고, 컴포넌트마다 font-family를 반복해서 지정하지 마.
기존 기능과 레이아웃은 변경하지 말고 폰트 적용만 처리해줘.
작업 범위는 frontend 내부로 제한하고 backend는 수정하지 마.
기록 규칙은 frontend/AGENTS.md를 따라줘.
```

### Prompt 10 - 회의실 예약 참석자 검색 추가

```txt
회의실 예약 수정사항:
1. 예약 시 참석자를 추가할 수 있어야한다.
2. 참석자 추가는 이름을 검색하면 해당 이름이 있는 사람이 뜨고 선택으로 할 수 있음 ex)김 입력시 -> 김으로 시작하는 사람들이 밑에 리스트로 뜨고 클릭 시 추가 가능
```

### Prompt 11 - 참석자 수 기반 예약 인원 자동 설정

```txt
추가 수정사항:
예약인원을 설정하기보다는 참석자를 추가하면 해당 참석자 수만큼 예약 인원이 자동으로 설정되게 변경.
```

### Prompt 12 - 회의실 예약 일정 캘린더 표시 범위 반영

```txt
수정사항 확인하고 캘린더에서는 일정 추가도 되지만 회의실 예약된 것을 캘린더에서 보고 싶을 수 있잖아. 그래서 회의실 예약하면 캘린더에 뜨는 기능도 추가하고 싶거든? 이거는 rooms.md에 들어가야 할지, canlender.md에 들어가야 할지, 두개 다 들어가야 할지 작성해줘.
```

### Prompt 13 - 예약 완료 복귀, 검색 초기화, 캘린더 등록 확인

```txt
이제 calendar는 어느정도 기능 구현을 완료한거같아. 이제 다시 rooms.md로 가서 rooms 수정을 할거야
수정사항:
1. 예약하기를 누르면 메인 rooms로 돌아오기
2. 회의실 검색에서 초기화 버튼을 도입하기
3. 회의실 예약이 잘 되었는지 확인할 수 있게 하기 + 일정에 등록하는것까지 테스트하기
```

### Prompt 14 - 첫 진입 예약 현황 기본 표시

```txt
회의실 예약 (rooms/md) 수정 사항:
현재 진입 화면에서 회의실 예약현황은 뜨고 있지 않은데, 처음 진입 화면부터 목록과 함께 당일 회의실 예약 현황이 지금 처럼 뜨게 변
```

### Prompt 15 - 목록 토글 제거 및 드로어 외부 클릭 닫기

```txt
회의실 목록 눌렀을떄 회의실 목록만 뜨게 할 필요 없어. 진입 화면 그대로 유지.
예약 눌렀을 때 옆에 뜨는 배너 외에 다른 화면 클릭시 닫힐수 있게 하기
```

---

## 작업 결과 기록

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

### 2026-07-05 - 검색 시간대 반영 및 예약 현황 시각화

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

### 2026-07-05 - 전체 현황 타임라인 및 검색 버튼 반영

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

### 2026-07-05 - 예약 현황 블록 정보 표시 및 디자인 개선

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

### 2026-07-05 - 현황 토글 및 날짜 변경 개선

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

### 2026-07-05 - 예약 현황 Time Slot Carousel 적용

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

### 2026-07-05 - 하루 전체 타임라인 및 날짜 Carousel 조정

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

### 2026-07-05 - Carousel 시간 문구 제거 및 Pretendard 적용

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

### 2026-07-05 - 예약 참석자 검색 및 선택 추가

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

### 2026-07-05 - 참석자 수 기반 예약 인원 자동 계산

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

### 2026-07-06 - 회의실 예약 일정 캘린더 표시 범위 정리

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

### 2026-07-06 - 예약 완료 복귀 및 캘린더 등록 확인 흐름

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

### 2026-07-07 - 첫 진입 예약 현황 기본 표시

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

### 2026-07-07 - 목록 토글 제거 및 예약 드로어 외부 클릭 닫기

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

## 회고

- 회의실 예약 확정과 시간 중복 최종 검증은 backend 책임이므로 프론트엔드는 기본 입력 검증과 검토 메시지만 처리했다.
- 실제 API 연동 시 mock 데이터와 필터 유틸을 서비스 호출 및 서버 상태 관리로 교체해야 한다.
- 회의실 예약이 캘린더에 표시되는 기능은 예약 생성 화면과 캘린더 표시 화면의 공동 책임이므로 두 계획 파일에 모두 남긴다.
