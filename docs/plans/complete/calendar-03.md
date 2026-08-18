# 작업 계획: calendar-03

## 1. 기본 정보

### 사용자 요청

달력의 한 주가 일요일부터 시작하도록 변경한다.

### 작업 목적

월간·주간 캘린더의 날짜 표시 순서를 일요일부터 토요일로 통일하고, 월간 그리드의 날짜가 실제 요일 열에 맞게 정렬되도록 한다.

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Frontend: `frontend/FRONTEND.md`, `frontend/DESIGN.md`

## 2. 실행 Task

### Task 1. 일요일 시작 캘린더 적용

#### 수정 가능 경로

- `docs/product-specs/calendar.md`
- `frontend/src/features/schedule-calendar/calendarDate.ts`
- `frontend/src/features/schedule-calendar/calendarDate.test.ts`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/src/index.css`

#### 구현 항목

- [x] Red: 월간 표시 범위와 주간 조회 범위가 일요일부터 시작한다는 실패 테스트를 작성한다.
- [x] Green: 월간 그리드를 일요일부터 토요일까지의 완전한 주 단위로 생성하고 주간 범위와 제목을 일요일 기준으로 변경한다.
- [x] Green: 화면에 일요일부터 토요일 순서의 요일 머리글을 제공한다.
- [x] Refactor: 날짜 계산 중복을 정리하고 관련 회귀 테스트를 통과시킨다.

#### 검증 항목

- [x] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/calendarDate.test.ts src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- [x] `cd frontend && npm run check`

#### 완료 조건

- 월간·주간 표시가 일요일부터 시작한다.
- 월간 날짜가 실제 요일 열에 맞게 정렬된다.
- 기존 월간·주간·일간 전환과 일정 조회 동작에 회귀가 없다.

#### 제외 범위

- API 계약 변경
- 일정 생성·수정·취소 동작 변경
- 캘린더 전반의 추가 디자인 개편

## 3. 전체 완료 조건

- Task 구현 및 검증 항목이 모두 통과한다.
- 관련 Product Spec과 구현이 일치한다.

## 4. 작업 결과

- 월간 그리드를 일요일부터 토요일까지의 완전한 주 단위로 표시한다.
- 조회 월 밖의 인접 날짜는 잘못된 빈 일정으로 오인되지 않도록 정렬용 빈 셀로 표시한다.
- 주간 조회 범위와 주간 제목을 일요일 기준으로 변경했다.
- `일, 월, 화, 수, 목, 금, 토` 순서의 접근 가능한 요일 머리글을 추가했다.
- 집중 테스트 15개, 전체 단위 테스트 52개, Cypress 11개, 타입·린트·포맷·빌드가 모두 통과했다.
