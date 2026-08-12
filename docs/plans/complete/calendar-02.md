# 작업 계획: calendar-02

## 1. 기본 정보

### 사용자 요청

캘린더 화면 상단의 영문 `CALENDAR` 문구를 제거하고 현재 표시 날짜를 더 크고 진하게 강조한다. 일정 추가 및 일정 상세 모달은 모달 외부를 클릭하면 닫히게 하며, 캘린더 내부를 더 부드럽고 정렬된 반응형 디자인으로 개선한다.

### 작업 목적

캘린더의 정보 위계와 정렬을 개선해 현재 조회 기간과 주요 조작을 빠르게 인지하게 하고, 모달의 직관적인 종료 동작을 제공하면서 기존 일정 조회·생성·상세 기능과 접근성을 유지한다.

### 작업 유형

- feature
- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `없음`
- Architecture: `frontend/FRONTEND.md`
- 기타 참고 문서: `frontend/DESIGN.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 캘린더 모달 동작 및 시각 디자인 개선

#### 선행 Task

- `없음`

#### 작업 목적

사용자가 일정 추가 또는 일정 상세 모달의 Backdrop을 클릭해 안전하게 모달을 닫을 수 있게 하고, Calendar Header와 본문의 정보 위계·정렬·반응형 디자인을 개선하되 기존 기능과 접근성을 유지한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-create/ScheduleCreateModal.tsx`
- `frontend/src/features/schedule-create/ScheduleCreateModal.test.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/src/index.css`
- `frontend/cypress/e2e`

#### 수정 금지 경로

- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `.agents`

#### 구현 항목

- [ ] Red: 비어 있는 일정 추가 모달의 Backdrop 클릭은 모달을 닫고, 모달 본문 클릭은 닫지 않으며, 닫힌 뒤 일정 추가 Trigger로 포커스가 복귀한다는 실패 Component Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Red: 작성 내용이 있는 일정 추가 모달의 Backdrop 클릭은 기존 `입력한 내용을 버릴까요?` 확인 절차를 열고 즉시 닫지 않으며, 저장 요청 중에는 작성 내용을 잃지 않는다는 실패 Component Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Red: 일정 상세 모달의 Backdrop 클릭은 모달을 닫고 원래 일정 Trigger로 포커스를 복귀시키며, 상세 본문 클릭은 닫지 않는다는 실패 Component Test와 Cypress Test를 `frontend/cypress/e2e/calendar/`에 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: Backdrop 자체가 클릭된 경우에만 기존 생성 모달의 `requestClose`와 상세 모달의 `onClose`를 호출하는 최소 구현을 하고 내부 클릭의 Event 전파로 모달이 닫히지 않게 한다.
- [ ] Refactor: 생성·상세 모달의 Escape, 닫기 버튼, 외부 클릭이 동일한 종료 및 포커스 복귀 계약을 따르도록 중복과 Event 경계를 정리하고 관련 테스트를 다시 통과시킨 결과를 기록한다.
- [ ] Red: Calendar Header에 영문 `CALENDAR` 문구가 없고 `2026년 8월`, 주간 또는 일간의 현재 기간 Heading이 화면 내 가장 명확한 날짜 제목으로 유지된다는 실패 Component Test를 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Red: 데스크톱에서 날짜 Heading과 기간 이동·보기 전환 Control이 안정적으로 정렬되고, 모바일에서 Control이 읽기 순서대로 Wrapping되며 Calendar 영역에 불필요한 가로 Overflow가 없다는 실패 Cypress Test를 `frontend/cypress/e2e/calendar/`에 먼저 작성하고 의도한 이유로 실패한 결과를 기록한다.
- [ ] Green: 영문 `CALENDAR` 문구를 제거하고 현재 기간 Heading을 반응형으로 더 크고 굵게 표현하며, Header와 Control Group의 간격·정렬·선택 상태를 명확히 하는 최소 구현을 한다.
- [ ] Green: 기존 Tailwind 설정과 역할 기반 색상 Token을 활용해 Calendar Surface, Grid 경계, 날짜 Cell, 일정 Chip, 상태 영역 및 주요 Button의 여백·모서리·Hover·Focus·명암을 일관되게 정리하고 임의의 새 색상 의미를 추가하지 않는다.
- [ ] Green: 월간·주간·일간, 일정이 없는 상태, Loading·Error 상태와 일정 Chip이 데스크톱 및 모바일에서 겹치거나 잘리지 않도록 정렬하되 기존 URL 상태와 Calendar 동작은 변경하지 않는다.
- [ ] Refactor: Calendar 전용 Style을 현재 책임 범위에서 정리하되 전역 Layout, 다른 기능 Style, 외부 의존성을 변경하지 않고 관련 테스트를 다시 통과시킨 결과를 기록한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 재검증을 반복하고, 이후에도 실패하면 우회하거나 단언을 약화하지 않은 채 Task 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-create/ScheduleCreateModal.test.tsx src/features/schedule-calendar/ScheduleCalendar.test.tsx`로 Backdrop과 모달 본문 클릭 구분, 작성 내용 보호, Escape 및 포커스 복귀를 검증한다.
- [ ] `cd frontend && npm run typecheck`로 Modal Event Handler와 종료 Callback의 Type 안정성을 검증한다.
- [ ] `cd frontend && npx cypress run --spec cypress/e2e/calendar/modal-dismissal.cy.ts`로 일정 추가·상세 모달의 외부 클릭 종료와 내부 클릭 유지 흐름을 검증한다.
- [ ] 모달 내부 Form, 수정·취소 Button 및 저장 중 상태가 Backdrop 클릭 처리로 오작동하지 않는지 확인한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx`로 영문 표제 제거, 날짜 Heading 유지와 월간·주간·일간 전환 회귀를 검증한다.
- [ ] `cd frontend && npx cypress run --spec cypress/e2e/calendar/calendar-visual-refinement.cy.ts`로 데스크톱·모바일 Header 정렬, 현재 날짜 강조, Control Wrapping, Grid Overflow 및 일정 Chip 가독성을 검증한다.
- [ ] 키보드 Focus 표시, 색상 외 선택 상태, Heading·Landmark 구조와 390px Mobile Viewport의 핵심 Calendar 흐름이 유지되는지 확인한다.

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

- 일정 수정 Form의 이탈 확인 정책 변경
- 모달 Portal 또는 외부 Modal Library 도입
- 일정 생성·조회·수정·취소 API 계약 변경
- 전역 Theme Palette 확정 또는 Calendar 외 화면의 Style 재설계
- 새 Icon, Typography, Router 또는 UI Component Library 도입
- Calendar 정보 구조와 월간·주간·일간 업무 동작 변경

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
- Harness 실행기가 수행하는 Frontend 전체 typecheck, lint, format, unit test 및 build 검증이 통과해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
