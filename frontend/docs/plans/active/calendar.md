# 작업 계획: 캘린더 일정 등록

## 상태

- Status: Done
- Priority: High
- Owner: Codex
- Started At: 2026-07-06
- Completed At: 2026-07-06

---

## 목적

로그인 이후 사용자가 `/calendar` 화면에서 개인 일정, 팀 일정, 프로젝트 일정을 조회하고 등록할 수 있도록 캘린더 화면을 구현한다.

캘린더는 1차 핵심 기능 중 대시보드와 회의실 다음 작업이며, 사용자가 월간/주간/일간 보기를 전환하고 날짜 또는 일정을 선택해 상세 정보를 확인하며, 일정 등록 모달에서 필요한 정보를 입력할 수 있도록 한다.

---

## 작업 범위

### 포함

- `/calendar` 라우팅 연결 상태 확인 및 캘린더 화면 정리
- 로그인 이후 공통 레이아웃 내부에서 캘린더 화면 렌더링
- 월간 캘린더 표시
- 주간 캘린더 표시
- 일간 캘린더 표시
- 월간/주간/일간 보기 전환
- 날짜 클릭 시 해당 날짜 일정 목록 표시
- 일정 클릭 시 일정 상세 모달 표시
- 일정 추가 버튼 클릭 시 일정 등록 모달 표시
- 일정 등록 폼 구성
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
- 개인/팀/프로젝트 일정 유형 선택
- 팀 일정 선택 시 팀 선택 UI
- 프로젝트 일정 선택 시 프로젝트 선택 UI
- 참석자 검색 및 선택 UI
- mock 데이터 기반 일정 목록 표시
- 회의실 예약에서 생성된 일정 표시
- 회의실 예약 일정과 일반 일정의 시각적 구분
- 프론트엔드 1차 검증
  - 일정 제목 필수값
  - 날짜 필수값
  - 시작 시간/종료 시간 필수값
  - 시작 시간이 종료 시간보다 빠른지 여부
  - 팀 일정의 팀 선택 여부
  - 프로젝트 일정의 프로젝트 선택 여부
- Loading, Empty, Error, Success, Disabled 상태 고려
- 작업 완료 후 `progress.md` 요약 기록

### 제외

- 실제 일정 등록 API 연동
- 실제 일정 수정 API 연동
- 실제 일정 삭제 API 연동
- 반복 일정
- 외부 캘린더 연동
- 실시간 일정 동기화
- 실제 회의실 예약 API 연동
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
- `docs/DECISIONS.md`
- `docs/plans/active/phase-1-core-features.md`
- `progress.md`

---

## 화면 요구사항

- `/calendar` 경로에서 캘린더 화면이 표시되어야 한다.
- 로그인 이후 공통 레이아웃 안에서 표시되어야 한다.
- 기본 화면은 월간 캘린더로 표시한다.
- 월간/주간/일간 보기를 전환할 수 있어야 한다.
- 선택한 날짜가 화면에 명확히 표시되어야 한다.
- 날짜 클릭 시 해당 날짜의 일정 목록이 표시되어야 한다.
- 일정 클릭 시 일정 상세 모달이 열려야 한다.
- 일정 추가 버튼 클릭 시 일정 등록 모달이 열려야 한다.
- 일정 등록 모달에서는 개인/팀/프로젝트 일정 유형을 선택할 수 있어야 한다.
- 일정 등록 모달에서는 private/public/team으로 자신의 일정이 보여질 범위를 지정할 수 있어야 한다.
- 개인 일정은 본인 기준 일정으로 등록한다.
- 팀 일정은 팀 선택이 필요하다.
- 일정 추가 시 시작시간/종료시간 등록이 가능하고 하루종일 옵션도 선택 가능하다.
- 프로젝트 일정은 프로젝트 선택이 필요하다.
- 일정 등록 폼에는 `PRODUCT.md`와 `frontend/AGENTS.md`의 캘린더 규칙에 명시된 필드를 포함해야 한다.
- 일정 유형, 공개 범위, 색상 라벨은 업무용 서비스답게 빠르게 구분 가능해야 한다.
- 일정 목록에는 제목, 시간, 일정 유형, 참석자 또는 대상 정보가 표시되어야 한다.
- 회의실 예약이 일정으로 생성된 경우 캘린더에 표시되어야 한다.
- 회의실 예약 일정은 회의실명, 예약 시간, 참석자 정보를 확인할 수 있어야 한다.
- 회의실 예약 일정은 일반 일정과 구분 가능해야 한다.
- 일정 데이터가 없을 때 Empty 상태가 표시되어야 한다.
- API 연동 전에는 mock 데이터를 사용하되 실제 API 응답 구조로 교체 가능한 형태를 유지한다.
- 디자인은 `DESIGN.md`의 Light Blue 배경 계열, Purple 강조 색상, Pretendard Typography 기준을 따른다.

---

## 필요한 데이터

### Schedule

캘린더 표시, 일정 상세, 일정 등록 결과 표시에 사용한다.

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

### User

참석자 선택과 일정 생성자 표시 기준으로 사용한다.

- userId
- employeeNumber
- name
- email
- team
- position
- roles

### Team

팀 일정 등록과 팀 일정 표시 기준으로 사용한다.

- teamId
- teamName
- parentTeamId
- members

### Project

프로젝트 일정 등록과 프로젝트 일정 표시 기준으로 사용한다.

- projectId
- projectName
- description
- status
- members

### Room

일정 등록 시 위치 또는 회의실 선택 확장, 회의실 예약 일정 표시를 고려한 데이터 기준이다.

- roomId
- roomName
- capacity
- location

### Room Reservation

회의실 예약에서 생성된 일정을 캘린더에 표시할 때 사용한다.

- reservationId
- roomId
- scheduleId
- title
- startAt
- endAt
- status
- count

### UI State

화면 상태 표시 기준으로 사용한다.

- idle
- loading
- success
- error
- empty
- disabled

### Local State

캘린더 화면 내부에서 관리한다.

- 현재 보기 방식
- 기준 월/주/일
- 선택한 날짜
- 선택한 일정
- 일정 등록 모달 열림 여부
- 일정 상세 모달 열림 여부
- 일정 등록 폼 입력값
- 일정 유형
- 선택한 팀
- 선택한 프로젝트
- 선택한 참석자
- 폼 검증 오류 메시지

---

## UI 상태

- Loading
  - 일정 목록 또는 상세 데이터를 불러오는 중인 상태를 고려한다.
- Empty
  - 선택한 날짜 또는 기간에 일정이 없을 때 빈 상태 메시지를 표시한다.
- Error
  - 일정 데이터를 불러오지 못했을 때 오류 메시지를 표시한다.
- Success
  - mock 데이터 기반 일정 목록과 상세 정보를 표시한다.
- Disabled
  - 필수값이 부족하거나 일정 유형별 조건이 충족되지 않았을 때 제출 버튼 또는 관련 컨트롤을 비활성화한다.

---

## 구현 단계

1. 현재 `/calendar` 라우팅과 `CalendarPage.tsx` 구현 상태를 확인한다.
2. 캘린더 페이지 폴더 구조를 `frontend/AGENTS.md` 기준에 맞춘다.
   - `src/pages/calendar/CalendarPage.tsx`
   - `src/pages/calendar/components/*.tsx`
   - `src/pages/calendar/mock/*.ts`
   - `src/pages/calendar/types/*.ts`
   - `src/pages/calendar/lib/*.ts`
   - `src/pages/calendar/constants/*.ts`
3. `API.md`의 Schedule, User, Team, Project 기준에 맞춰 타입과 mock 데이터를 정리한다.
   - 회의실 예약에서 생성된 일정은 `Schedule`을 기준으로 표시하고, `Room Reservation`은 연결 정보로만 다룬다.
4. 캘린더 주요 영역을 컴포넌트로 분리한다.
   - 보기 전환 헤더
   - 월간 캘린더
   - 주간 캘린더
   - 일간 캘린더
   - 선택 날짜 일정 목록
   - 일정 상세 모달
   - 일정 등록 모달
5. 월간/주간/일간 보기 전환 상태를 구현한다.
6. 날짜 선택과 선택 날짜 일정 목록 표시를 구현한다.
7. 일정 클릭 시 일정 상세 모달이 열리도록 구현한다.
8. 일정 추가 버튼 클릭 시 일정 등록 모달이 열리도록 구현한다.
9. 일정 등록 폼 입력 상태와 기본 검증을 구현한다.
10. 개인/팀/프로젝트 일정 유형별 조건부 필드를 구현한다.
11. 참석자 검색 및 선택 UI를 구현한다.
12. 회의실 예약에서 생성된 일정 mock 데이터를 캘린더에 표시한다.
13. 회의실 예약 일정과 일반 일정을 구분하는 표시 방식을 구현한다.
14. Loading, Empty, Error, Success, Disabled 상태를 반영한다.
15. `DESIGN.md` 기준에 맞춰 화면 레이아웃과 반응형 스타일을 정리한다.
16. `npm run lint`, `npm run typecheck`, `npm run build`로 검증한다.
17. 작업 결과와 검증 결과를 `progress.md`에 요약 기록한다.
18. 완료 기준을 만족하면 이 계획 파일의 상태를 `Done`으로 변경한다.

---

## 완료 기준

- `/calendar` 경로에서 캘린더 화면이 표시된다.
- 로그인 이후 공통 레이아웃 안에서 캘린더 화면이 표시된다.
- 월간 캘린더가 기본 화면으로 표시된다.
- 월간/주간/일간 보기 전환이 동작한다.
- mock 일정 데이터가 캘린더에 표시된다.
- 날짜 클릭 시 해당 날짜 일정 목록이 표시된다.
- 일정 클릭 시 일정 상세 모달이 열린다.
- 일정 추가 버튼 클릭 시 일정 등록 모달이 열린다.
- 일정 등록 모달에서 개인/팀/프로젝트 일정 유형을 선택할 수 있다.
- 팀 일정 선택 시 팀 선택 UI가 표시된다.
- 프로젝트 일정 선택 시 프로젝트 선택 UI가 표시된다.
- 참석자 검색 및 선택 UI가 동작한다.
- 일정 등록 폼에서 필수값과 시간 범위 기본 검증이 동작한다.
- 회의실 예약에서 생성된 일정이 캘린더에 표시된다.
- 회의실 예약 일정은 회의실명과 예약 시간 정보를 확인할 수 있다.
- 회의실 예약 일정은 일반 일정과 구분된다.
- 검색 또는 선택 조건에 맞는 일정이 없을 때 Empty 상태가 표시된다.
- Loading 상태를 고려한 UI가 있다.
- Error 상태를 고려한 UI가 있다.
- Disabled 상태가 필요한 컨트롤에 적용된다.
- 캘린더 관련 mock 데이터가 페이지 폴더 내부에 분리되어 있다.
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

  회의실은 이제 보류하고
  이제 1차 핵심 기능 중캘린더(일정 등록) 화면 작업을 시작할 거야.

  먼저 frontend/docs/plans/_template.md를 기준으로 frontend/docs/plans/active/calendar.md 작업 계획 파일을 만들어
  줘.

  코드 수정하지 말고 일단 문서 작성부터 해줘
```

### Prompt 2 - 회의실 예약 일정 표시 범위 반영

```txt
수정사항 확인하고 캘린더에서는 일정 추가도 되지만 회의실 예약된 것을 캘린더에서 보고 싶을 수 있잖아. 그래서 회의실 예약하면 캘린더에 뜨는 기능도 추가하고 싶거든? 이거는 rooms.md에 들어가야 할지, canlender.md에 들어가야 할지, 두개 다 들어가야 할지 작성해줘.
```

### Prompt 3 - 캘린더 구현

```txt
이제 calendar구현해줘
```

### Prompt 4 - 첫 진입 목록 숨김 및 모달 외부 클릭 닫기

```txt
수정사항:
첫 진입 화면에는 그냥 캘린더만 보이고 날짜를 클릭하면 지금처럼 해당 날짜의 목록이 보이게 한다.
폼이 떴을때 닫기 버튼 말고도 해당 폼 외의 영역을 클릭하면 닫을 수 있게 한다.
```

### Prompt 5 - 캘린더 바깥 클릭 복귀 및 선택 UI 변경

```txt
추가 수정사항:
회의실처럼 회의실 목록 누르면 옆에 뜨고 다시 목록 누르면 원상태 복구처럼 캘린더 또한 캘린더 날짜 누르면 해당 날짜 일정이 뜨고 다시 캘린더 바깥을 누르면 캘린더가 크게 원 위치 되도록 수정

일정유형/공개범위 같은 경우 모달 말고 작은 이모지와 함께 박스 나열 형태로 해서 박스 선택으로 디자인 변경.
```

### Prompt 6 - 하루 종일 시간 기본값 변경

```txt
calendar에서 일정등록에서 하루종일 선택 시 시간이 9:00~18:00로 변
```

---

## 작업 결과 기록

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

## 회고

- 캘린더 화면은 현재 단일 `CalendarPage.tsx`에 1차 정적 구조만 있으므로, 구현 단계에서 페이지 내부 폴더 구조 분리부터 진행해야 한다.
- 실제 API 연동 전까지는 `API.md`의 Schedule, User, Team, Project 기준에 맞춘 mock 데이터를 사용한다.
- 회의실 예약과 캘린더 표시는 두 화면의 경계 기능이다. 회의실 계획에는 예약이 일정으로 이어지는 생성 책임을, 캘린더 계획에는 생성된 회의실 예약 일정을 표시하는 책임을 기록한다.

---

## 추가 작업 결과 기록 - 2026-07-06

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

## 추가 작업 결과 기록 - 2026-07-06 2차

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

## 추가 작업 결과 기록 - 2026-07-07

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
