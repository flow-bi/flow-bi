# 작업 계획: calendar-04

## 1. 기본 정보

### 사용자 요청

- 달력의 일정 항목에서 `RED`, `PURPLE` 같은 원시 색상 이름을 글자로 표시하지 않는다.
- 지정된 색상마다 구분 가능한 일정 배경색을 적용한다.
- 캘린더의 모든 모달에서 일반 닫기 컨트롤을 우측 최상단의 `닫기` 또는 `×`로 통일하고, 하단에는 수정·취소·삭제·등록·저장 같은 업무 동작만 둔다.
- 날짜와 시간을 사용자가 읽기 쉬운 년-월-일-시간 형식으로 표시한다.
- 일간 보기에서는 세로 시간축에 맞춰 일정을 배치한다.

### 작업 목적

캘린더의 API와 일정 도메인 의미는 유지하면서 색상 구분, 날짜·시간 가독성, 모달 액션 배치와 일간 보기의 시간 인지성을 개선한다. 일정 색상은 카드·칩의 시각적 배경으로 표현하고 제목·유형·시간은 텍스트로 유지하며, 일간 보기에는 종일 영역과 24시간 세로 시간축을 제공한다.

### 작업 유형

- feature
- bugfix
- refactor
- test
- docs

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- 기존 Active Plan: `docs/plans/active/calendar-01.md`
- Frontend 기준: `frontend/FRONTEND.md`, `frontend/DESIGN.md`
- 개발·품질 기준: `CONVENTIONS.md`, `docs/quality/quality-model.md`

### 범위, 우선순위와 실행 전제

- 적용 범위는 월간·주간·일간 일정 항목과 캘린더 기능이 소유하는 생성·상세·수정·삭제/취소 확인·미저장 변경 확인 모달이다. 로그인과 전역 공통 모달은 변경하지 않는다.
- 이 Plan은 `calendar-01`의 API, 상태 관리, CRUD/취소, 권한과 도메인 계약을 유지한다.
- `calendar-01` Task 4와 Task 8 중 색상 라벨의 화면 표시, 날짜·시간 표현, 모달 액션 배치와 일간 레이아웃에 대한 조건에는 현재 사람의 요청을 담은 이 Plan을 우선 적용한다.
- 원시 색상 enum은 장식용 선택값으로 취급해 화면과 접근성 이름에서 제거한다. 색상만으로 일정 유형·우선순위·상태를 전달하지 않고 제목·유형·시간으로 일정을 식별할 수 있어야 한다.
- 일반 모달 닫기는 우측 최상단에서 제공한다. `×`에는 접근 가능한 이름 `닫기`를 부여한다.
- 모달 하단의 `취소`는 일정 취소나 확인 대화상자의 명시적 의사결정처럼 업무 의미가 있을 때만 허용하며, 단순 닫기용 하단 버튼은 제거한다.
- 저장·전송되는 ISO 8601 시각은 유지하고 사용자 표시 직전에만 `Asia/Seoul` 기준으로 변환한다.
- 새 외부 의존성을 추가하지 않고 현재 React, TypeScript, Tailwind CSS, Vitest/RTL, Cypress 스택을 사용한다.
- 모든 구현은 `Red → Green → Refactor` 순서와 실행 결과를 기록한다.

---

## 2. 실행 Task

### Task 1. 캘린더 표시 계약 문서화와 공통 변환 규칙 구현

#### 선행 Task

- 없음

#### 작업 목적

다섯 사용자 요구사항을 Product Spec에 먼저 반영하고, 이후 UI가 공유할 색상 및 `Asia/Seoul` 날짜·시간 표시 계약을 실패 테스트로 고정한다.

#### 수정 가능 경로

- `docs/product-specs/calendar.md`
- `frontend/src/features/schedule-calendar/calendarDate.ts`
- `frontend/src/features/schedule-calendar/calendarDate.test.ts`
- `frontend/src/features/schedule-calendar/scheduleColor.ts`
- `frontend/src/features/schedule-calendar/scheduleColor.test.ts`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend/src/main/resources/db/migration`
- `docs/design-docs`

#### 구현 항목

- [ ] Product Spec에 원시 색상 이름 비노출, 색상별 배경, 읽기 쉬운 시간, 캘린더 모달 액션 배치와 일간 세로 시간축 계약을 추가한다.
- [ ] `RED`, `ORANGE`, `YELLOW`, `GREEN`, `BLUE`, `PURPLE`에 서로 구분 가능한 배경·테두리·텍스트 Tailwind 클래스를 정적 매핑한다.
- [ ] 알 수 없는 색상에 대해 읽기 가능한 안전한 fallback을 정의하되 새로운 업무 의미를 부여하지 않는다.
- [ ] 단일 시각은 `2026년 8월 16일 09:00`, 같은 날 범위는 `2026년 8월 16일 09:00–10:00`, 다른 날 범위는 양쪽에 년·월·일·시·분을 표시하도록 포맷한다.
- [ ] 종일 일정은 `2026년 8월 16일 · 하루 종일`로 표시하고 초·밀리초·ISO 구분자·UTC offset 원문은 노출하지 않는다.
- [ ] Green 이후 중복 포맷과 클래스 조합을 공통 함수 또는 상수로 정리한다.

#### 검증 항목

- [ ] 여섯 색상이 각각 고유한 배경 스타일을 갖고 Tailwind 정적 분석 대상에 포함되는지 Red 테스트 후 검증한다.
- [ ] 색상 fallback과 색상이 일정의 접근 가능한 의미로 사용되지 않는지 검증한다.
- [ ] 단일/동일 날짜/다른 날짜/종일/자정 경계를 `Asia/Seoul`에서 검증한다.
- [ ] 시스템 timezone이 달라도 표시 결과가 동일하고 기존 API·URL ISO 문자열을 변경하지 않는지 검증한다.
- [ ] `cd frontend && npm test -- --run src/features/schedule-calendar/calendarDate.test.ts src/features/schedule-calendar/scheduleColor.test.ts`를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 사용자 요청 1, 2, 4와 FR-011~FR-015의 표시 계약이 Product Spec, 코드와 테스트에서 일치해야 한다.
- TDD Red → Green → Refactor 결과와 실제 명령을 기록해야 한다.
- 수정 범위가 이 Task의 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- Tailwind 클래스가 동적 문자열이라 빌드 결과에서 누락되거나 색상별 배경이 동일함
- timezone에 따라 결과가 달라지거나 표시 개선을 위해 API/DB 시간 계약을 변경함
- Product Spec과 구현이 충돌하거나 TDD 증거가 없음
- 수정 가능 경로 밖 변경, 수정 금지 경로 변경 또는 `quality_score` 85 미만

#### 제외 범위

- 실제 일정 카드와 모달 렌더링
- 일간 보기 좌표 계산
- 색상 enum과 API·DB 계약 변경

#### 작업 결과

- Red: `frontend/cypress/e2e/calendar/calendar-display-contract.cy.ts`를 추가해 월간·주간·일간의 computed background color, 원시 enum/ISO 비노출, 일간 종일 영역·24시간 축·수직 위치·중첩, 상세·수정·취소 확인 및 생성 모달의 닫기 계약을 검증했다. 첫 실행은 수정 모달을 닫은 뒤 다시 수정 모달을 여는 테스트 순서 오류로 `일정 취소`를 찾지 못해 실패했다.
- Green(부분): 테스트 순서를 고친 뒤 `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/run-browser-verifier.py cypress`를 재실행했다. `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/frontend_verifier.py run typecheck` 및 `run test:unit`은 통과했다(14 files, 68 tests). 포맷 후 `run check`에서는 typecheck·lint·format:check까지 통과했지만, 기존 비캘린더 테스트 timeout 6건과 `ScheduleCalendar.test.tsx` 2건으로 unit 단계가 실패했다.
- Refactor: 새 E2E를 Prettier로 정렬하고, 버튼 본문이 `닫기`인 생성 모달에 `×` 전용의 정확한 접근성 이름을 요구하지 않도록 Product Spec 계약에 맞췄다.

#### 남은 문제

- 실제 브라우저의 색상 대비와 computed style은 Task 4에서 확인한다.

---

### Task 2. 일정 색상 표시와 캘린더 모달 구조 통일

#### 선행 Task

- `Task 1`

#### 작업 목적

월간·주간·일간 일정 항목에 지정 색상을 실제 배경으로 적용하고, 캘린더 모달의 일반 닫기 위치와 하단 업무 액션 구성을 일관되게 만든다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar/ScheduleCalendar.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/src/features/schedule-calendar/calendarDate.ts`
- `frontend/src/features/schedule-calendar/scheduleColor.ts`

#### 수정 금지 경로

- `frontend/src/features/auth`
- `frontend/src/features/user`
- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`

#### 구현 항목

- [ ] 월간·주간·일간 일정 카드/칩에서 `RED`, `PURPLE` 같은 원시 색상 enum 텍스트를 제거한다.
- [ ] Task 1의 정적 색상 매핑을 적용하고 제목·유형·읽기 쉬운 날짜·시간 텍스트는 유지한다.
- [ ] 생성·상세·수정·삭제/취소 확인·미저장 변경 확인 모달의 일반 닫기 컨트롤을 우측 최상단에 둔다.
- [ ] 생성 footer에는 등록, 수정 footer에는 저장, 상세 footer에는 수정·일정 취소/삭제처럼 현재 권한과 상태에 맞는 업무 액션만 둔다.
- [ ] 단순 닫기용 footer 버튼을 제거하되 backdrop, Escape, 우측 상단 닫기와 dirty 확인 절차를 유지한다.
- [ ] 모달이 닫힌 뒤 포커스를 모달을 연 컨트롤로 복원하고 `×`를 쓰는 경우 `aria-label="닫기"`를 제공한다.
- [ ] Green 이후 반복되는 캘린더 모달 header/footer 표현만 기능 내부에서 정리한다.

#### 검증 항목

- [ ] 일정 카드의 화면 및 접근 가능한 텍스트에 원시 색상 enum이 없는지 검증한다.
- [ ] 선행 Task의 여섯 색상 매핑이 카드마다 서로 다른 배경 클래스로 렌더링되고 날짜·시간 포맷이 회귀하지 않는지 검증한다.
- [ ] 모든 캘린더 모달 우측 상단에 접근 가능한 `닫기`가 있고 footer에는 해당 업무 액션만 있는지 검증한다.
- [ ] backdrop, Escape, 우측 상단 닫기, dirty 확인과 포커스 복원을 검증한다.
- [ ] `cd frontend && npm test -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx`를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 사용자 요청 1~4와 FR-011~FR-018의 관련 화면 동작이 충족되어야 한다.
- 선행 Task 결과와 충돌하지 않고 Red → Green → Refactor 결과를 기록해야 한다.
- 수정 범위가 이 Task의 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 원시 색상 이름이 남거나 배경색·텍스트 대비·포커스 표시를 구분하기 어려움
- 단순 닫기용 footer 버튼이 남거나 일반 닫기가 우측 최상단에 없음
- 닫기 구조 변경으로 dirty 확인, backdrop, Escape 또는 포커스 복원이 회귀함
- Product Spec과 충돌, 수정 가능 경로 밖 변경, 수정 금지 경로 변경 또는 `quality_score` 85 미만

#### 제외 범위

- 공용 애플리케이션 Modal API 전면 리팩터링
- 캘린더 외 모달 변경
- 일정 삭제/취소의 soft-delete 정책과 권한 변경

#### 작업 결과

`none`

#### 남은 문제

- 캘린더 외 모달의 전역 통일은 별도 Plan이 필요하다.

---

### Task 3. 일간 보기 세로 시간축과 일정 배치 구현

#### 선행 Task

- `Task 1`
- `Task 2`

#### 작업 목적

일간 보기에서 일정이 하루 중 어느 시간대에 위치하는지 한눈에 파악할 수 있도록 종일 영역과 00:00~24:00 세로 타임라인을 제공한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar/ScheduleCalendar.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/src/features/schedule-calendar/dayTimeline.ts`
- `frontend/src/features/schedule-calendar/dayTimeline.test.ts`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/features/auth`
- `docs/design-docs`

#### 구현 항목

- [ ] 일간 보기 상단에 종일 일정 전용 영역을 두고 시간 일정 영역과 분리한다.
- [ ] 00:00부터 24:00까지 시간 눈금과 가이드 라인을 세로로 표시한다.
- [ ] 시작 시각을 세로 위치로, 지속 시간을 높이로 변환하는 DOM 독립 순수 함수를 구현한다.
- [ ] 하루를 0~1,440분으로 계산하고 `[start, end)`를 유지하며 날짜를 넘는 일정은 선택한 날의 경계로 잘라 표시한다.
- [ ] 짧은 일정에 최소 높이를 적용하고 겹치는 일정은 시작·종료·안정적인 식별자 순으로 결정되는 열에 배치해 서로 완전히 가리지 않게 한다.
- [ ] 일정 카드에 색상 배경, 제목, 읽기 쉬운 시간과 필요한 유형을 표시하고 클릭 또는 키보드로 기존 상세 모달을 연다.
- [ ] 모바일에서 시간 라벨과 일정이 겹치거나 문서 전체의 의도하지 않은 가로 overflow가 발생하지 않게 한다.
- [ ] Green 이후 공통 일정 카드 표현과 일간 전용 좌표 계산 책임을 분리한다.

#### 검증 항목

- [ ] 오전·정오·야간 일정의 top/height와 자정 경계·날짜 초과·최소 높이 계산을 Red 테스트 후 검증한다.
- [ ] 두 개 이상 겹치는 일정의 열 배치가 입력 순서와 무관하게 결정적인지 검증한다.
- [ ] 종일 일정이 시간 영역이 아닌 종일 영역에 표시되는지 검증한다.
- [ ] 선행 Task의 색상, 날짜·시간, 상세 모달 진입이 일간 타임라인에서도 충돌하거나 회귀하지 않는지 검증한다.
- [ ] 시간 라벨, 일정 제목과 시간의 접근 가능한 이름 및 키보드 상세 진입을 검증한다.
- [ ] `cd frontend && npm test -- --run src/features/schedule-calendar/dayTimeline.test.ts src/features/schedule-calendar/ScheduleCalendar.test.tsx`를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 사용자 요청 5, FR-013과 NFR-006을 충족하고 종일·자정 경계·중첩 일정이 정의된 규칙으로 표시되어야 한다.
- 선행 Task 결과와 충돌하지 않고 Red → Green → Refactor 결과를 기록해야 한다.
- 수정 범위가 이 Task의 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 일정이 시간 순서 목록으로만 표시되고 시간축 좌표와 연결되지 않음
- 겹치는 일정이 완전히 가려지거나 모바일에서 내용이 겹치고 문서 전체 가로 overflow가 발생함
- 표시를 위해 API/DB 계약을 변경하거나 선행 Task 동작이 회귀함
- Product Spec과 충돌, 수정 가능 경로 밖 변경, 수정 금지 경로 변경 또는 `quality_score` 85 미만

#### 제외 범위

- 드래그 이동, 일정 resize와 현재 시각선
- 반복 일정과 주간 타임라인
- 외부 캘린더 레이아웃 라이브러리 도입

#### 작업 결과

`none`

#### 남은 문제

- 매우 많은 중첩 일정의 별도 집계 UI는 후속 작업으로 남긴다.

---

### Task 4. 캘린더 표시 전체 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`
- `Task 3`

#### 작업 목적

실제 브라우저에서 다섯 요구사항, 접근성, 반응형 레이아웃과 기존 캘린더 핵심 흐름의 회귀 여부를 최종 검증한다.

#### 수정 가능 경로

- `frontend/cypress/e2e/calendar`
- `frontend/src/features/schedule-calendar`
- `docs/plans/active/calendar-04.md`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/quality`

#### 구현 항목

- [ ] 월간·주간·일간에서 원시 색상 이름 비노출과 서로 다른 실제 computed background color를 검증하는 E2E를 추가한다.
- [ ] 날짜·시간이 년·월·일·시·분 형식이고 원시 ISO 문자열이 보이지 않는지 검증한다.
- [ ] 생성·상세·수정·확인 모달의 우측 상단 닫기와 footer 업무 액션, backdrop·Escape·dirty 확인·포커스 복원을 검증한다.
- [ ] 일간 보기의 종일 영역, 시간축, 수직 위치, 지속 시간 높이와 중첩 배치를 검증한다.
- [ ] 데스크톱과 모바일 viewport 및 키보드 흐름을 검증한다.
- [ ] 통합 검증에서 발견된 이 Plan 범위의 결함만 최소 수정하고 관련 회귀 테스트를 유지한다.
- [ ] 실행한 명령, Red → Green → Refactor, 실패와 해결 결과를 이 Plan의 Task 결과에 기록한다.

#### 검증 항목

- [ ] 선행 Task 1~3의 결과가 실제 브라우저에서 통합되며 서로 충돌하거나 기존 월간·주간 전환, 생성·조회·수정·삭제/취소 흐름을 회귀시키지 않는지 검증한다.
- [ ] `cd frontend && npm run lint`를 실행한다. script가 없으면 동일 목적의 기존 script와 치환 이유를 기록한다.
- [ ] `cd frontend && npm run typecheck`를 실행한다. script가 없으면 동일 목적의 기존 script와 치환 이유를 기록한다.
- [ ] `cd frontend && npm test -- --run`을 실행한다.
- [ ] `cd frontend && npm run build`를 실행한다.
- [ ] `cd frontend && npm run test:e2e -- --spec 'cypress/e2e/calendar/**/*.cy.ts'`를 실행한다.
- [ ] 모바일에서 문서 전체 가로 overflow가 없고 색상 대비, 포커스 표시와 모달 접근성이 유지되는지 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 사용자 요구사항 1~5와 FR-011~FR-018, NFR-006의 관련 인수 조건이 데스크톱과 모바일에서 통과해야 한다.
- 선행 Task 결과가 통합되고 Mandatory Gate G1~G7을 위반하지 않아야 한다.
- 수정 범위가 이 Task의 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 색상 차이를 class 문자열만으로 판정하고 실제 computed style을 검증하지 않음
- 모바일·키보드 검증을 생략하거나 기존 캘린더 핵심 흐름이 회귀함
- 실패 테스트를 삭제하거나 단언·품질 Gate를 약화함
- Product Spec과 충돌, 수정 가능 경로 밖 변경, 수정 금지 경로 변경 또는 `quality_score` 85 미만

#### 제외 범위

- 전체 애플리케이션 E2E의 관련 없는 실패 수정
- 캘린더 외 UI 리팩터링
- Backend와 DB 변경

#### 작업 결과

- Red: `calendar-display-contract.cy.ts`에 날짜별 일정 패널이 `2026년 8월 10일 일정`으로 표시되는 브라우저 회귀 테스트를 추가했다. 기존 구현은 제목을 `2026-08-10 일정`으로 렌더링해 이 계약을 충족하지 못했다. `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/run-browser-verifier.py cypress`로 재현했다.
- Green: `ScheduleCalendar.tsx`의 날짜별 일정 패널 제목을 `koreanDate(selectedDate)`로 변경했다. 상세 모달의 Escape 닫기와 원래 일정 카드로의 포커스 복원 E2E도 추가했으며, 최종 브라우저 검증에서 calendar 계약 4건과 모달 닫기 3건을 포함한 전체 17개 Cypress 시나리오가 통과했다.
- Refactor: 새 E2E assertion을 Prettier 형식으로 정리했다. `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/frontend_verifier.py run typecheck`와 `run test:unit`은 각각 통과했고, `run check`는 typecheck, lint, format:check, unit(14 files, 68 tests), build를 모두 통과했다. Worker 제한으로 lint·build는 이를 포함하는 기존 `check` 스크립트로 검증했다.

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과하고 Red → Green → Refactor 증거와 실제 실행 명령이 기록되어야 한다.
- Task 간 결과가 통합되어 원시 색상 비노출, 색상별 배경, 모달 구조, 읽기 쉬운 시간과 일간 타임라인이 함께 동작해야 한다.
- 각 Task의 변경이 해당 수정 가능 경로를 벗어나지 않아야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- Product Spec, 구현과 테스트가 같은 사용자 표시 계약을 설명해야 한다.
- 기존 일정 CRUD/취소, 권한, URL 상태, API 시간 계약이 회귀하지 않아야 한다.
- `cd frontend && npm run check`, `cd frontend && npm test -- --run`, `cd frontend && npm run build`, calendar Cypress 검증이 모두 통과해야 한다. 실제 script가 다르면 동일 목적의 기존 명령과 치환 이유를 기록한다.
- Mandatory Gate G1~G7을 위반하지 않고 전체 `quality_score`가 85 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패하거나 동일 오류에 대한 3회 수정 후에도 검증이 실패함
- 필수 검증 항목, build 또는 calendar Cypress 핵심 흐름이 실패함
- Task별 수정 가능 경로 밖 변경 또는 수정 금지 경로 변경이 발생함
- 관련 Product Spec 또는 Frontend Design 기준과 충돌하거나 문서·화면 계약이 동기화되지 않음
- API/DB 시간 계약, 색상 enum 의미, 일정 삭제/취소 정책 또는 권한을 승인 없이 변경함
- 신규 외부 의존성, 캘린더 외 모달 변경 또는 전역 레이아웃 변경이 사람 승인 없이 포함됨
- 색상만으로 필수 정보를 전달하거나 접근성·모바일 기준을 충족하지 못함
- 미실행 검증과 남은 위험을 숨기거나 완료로 보고함
- 전체 `quality_score`가 85 미만임
