# 작업 계획: calendar-05

## 1. 기본 정보

### 사용자 요청

- 다른 달이나 주, 날짜를 보고 있을 때 캘린더 우측 상단의 `오늘` 버튼으로 현재 날짜로 돌아갈 수 있어야 한다.
- 캘린더 우측 상단에서 기간·보기 제어 버튼과 `일정 추가` 버튼을 시각적으로 구분한다.
- `일정 추가` 버튼은 헤더 액션 중 맨 오른쪽에 배치한다.

### 작업 목적

사용자가 캘린더 탐색 중 현재 날짜로 빠르게 복귀할 수 있게 하고, 기간 이동·보기 선택·일정 생성이라는 서로 다른 목적의 액션을 시각적·의미적으로 구분한다. 데스크톱과 모바일에서 액션의 우선순위, 키보드 순서와 반응형 정렬을 유지한다.

### 작업 유형

- feature
- test
- docs

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- 기존 Active Plan: `docs/plans/active/calendar-01.md`
- Frontend 기준: `frontend/FRONTEND.md`, `frontend/DESIGN.md`
- 개발·품질 기준: `CONVENTIONS.md`, `docs/quality/quality-model.md`

### 요구사항 ID와 실행 전제

- `CAL-05-R1`: `오늘` 버튼을 선택하면 현재 보기 단위는 유지하고 기준 날짜를 `now()`의 로컬 날짜로 변경한다.
- `CAL-05-R2`: 오늘 이동 시 기존 URL 상태 계약에 따라 `view`와 오늘의 `date`를 함께 반영한다.
- `CAL-05-R3`: 헤더 액션을 기간 이동, 보기 선택, 일정 생성 영역으로 구분한다.
- `CAL-05-R4`: `일정 추가`는 화면과 키보드 탐색 순서에서 헤더 액션의 맨 오른쪽·마지막에 둔다.
- `CAL-05-R5`: 데스크톱과 390px 모바일 화면에서 액션이 겹치거나 문서 전체의 가로 overflow를 만들지 않는다.
- `CAL-05-R6`: 각 액션 영역은 접근 가능한 이름, 키보드 포커스 표시와 읽기 순서를 제공한다.
- `오늘`은 월간 보기에서는 오늘이 속한 달, 주간 보기에서는 오늘이 속한 주, 일간 보기에서는 오늘 날짜로 이동한다.
- 현재 `ScheduleCalendar`의 `now` 주입 지점과 URL 상태 관리 방식을 재사용하며 시스템 시각을 직접 고정하거나 새로운 날짜 라이브러리를 추가하지 않는다.
- 기간 이동 영역은 `이전`, `오늘`, `다음`, 보기 선택 영역은 `월간 보기`, `주간 보기`, `일간 보기`로 구성한다. `일정 추가`는 두 제어 영역 밖의 주요 액션으로 둔다.
- 기간·보기 제어는 중립 또는 선택 상태 스타일을 사용하고, `일정 추가`만 주요 생성 액션의 채움 스타일을 사용해 역할을 구분한다.
- Backend, API, DB, 인증·권한, 일정 CRUD 계약은 변경하지 않는다.
- 모든 제품 코드 변경은 `Red → Green → Refactor` 순서와 실제 검증 결과를 실행 기록에 남긴다.

---

## 2. 실행 Task

### Task 1. 오늘 이동과 헤더 액션 계약 문서화 및 실패 테스트 작성

#### 선행 Task

- 없음

#### 작업 목적

오늘 이동의 날짜·URL 상태와 헤더 액션의 의미·순서·시각적 구분을 Product Spec과 실패 테스트로 먼저 고정한다.

#### 수정 가능 경로

- `docs/product-specs/calendar.md`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/src/App.test.tsx`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend/src/main/resources/db/migration`
- `docs/quality`

#### 구현 항목

- [ ] Product Spec에 `CAL-05-R1`부터 `CAL-05-R6`까지의 오늘 이동, 액션 그룹, 버튼 순서와 반응형 계약을 반영한다.
- [ ] Red: 월간·주간·일간 각각에서 다른 날짜로 이동한 뒤 `오늘`을 선택하면 보기 단위는 유지되고 기준 날짜와 URL이 주입된 `now()` 날짜로 변경되는 실패 Component Test를 작성한다.
- [ ] Red: 기간 이동과 보기 선택이 서로 다른 접근 가능한 그룹이며 `일정 추가`가 그룹 밖의 마지막 헤더 액션이라는 실패 Component Test를 작성한다.
- [ ] Red: `일정 추가`는 주요 채움 스타일, 기간 이동은 중립 스타일, 현재 보기 선택은 생성 액션과 구분되는 선택 스타일을 갖는다는 안정적인 테스트를 작성한다.
- [ ] App 통합에서 `일정 추가` Trigger가 기존 생성 모달을 열고 닫힌 뒤 포커스를 복원하는 계약이 버튼 이동으로 회귀하지 않도록 테스트를 유지하거나 보강한다.

#### 검증 항목

- [ ] 새 테스트가 현재 구현에서 `오늘` 부재 또는 액션 그룹·순서 불일치라는 의도한 이유로 실패하는지 확인하고 Red 결과를 기록한다.
- [ ] 테스트가 시스템 실제 날짜에 의존하지 않고 고정된 `now` 함수 주입으로 결정적으로 실행되는지 검증한다.
- [ ] 월말·연말을 별도 날짜 계산으로 재구현하지 않고 기존 날짜·URL 상태 계약으로 처리하는지 테스트 조건을 검토한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx src/App.test.tsx`를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- `CAL-05-R1`부터 `CAL-05-R6`, FR-011부터 FR-014와 NFR-006의 관련 동작이 문서와 실패 테스트에 관찰 가능한 조건으로 표현되어야 한다.
- TDD Red 결과와 실제 실행 명령을 기록해야 한다.
- Mandatory Gate G1~G3을 충족하고 수정 범위가 허용 경로를 벗어나지 않아야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- `오늘`의 동작이 보기 단위마다 정의되지 않거나 URL 갱신 여부가 누락됨
- 테스트가 실제 실행 날짜나 timezone에 따라 비결정적으로 동작함
- 시각적 구분을 버튼 문구만으로 검증하거나 접근 가능한 그룹과 순서를 검증하지 않음
- Product Spec 미갱신, TDD Red 증거 누락, 수정 가능 경로 밖 변경 또는 `quality_score` 85 미만

#### 제외 범위

- 제품 코드 구현과 Tailwind 스타일 적용
- 현재 시각선 또는 오늘 날짜 셀의 추가 강조
- Backend/API 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 오늘 이동과 구분된 캘린더 헤더 액션 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

기존 캘린더 상태 관리와 Tailwind 디자인 토큰을 사용해 오늘 이동을 구현하고, 기간 이동·보기 선택·일정 추가의 정보 위계와 배치를 구분한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar/ScheduleCalendar.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/features/calendarSessionBoundary.test.tsx`
- `frontend/cypress/e2e/calendar/calendar-visual-refinement.cy.ts`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`
- `docs/design-docs`

#### 구현 항목

- [ ] `오늘` 버튼이 `dateValue(now())`를 사용해 현재 보기 단위는 유지하면서 기존 URL 상태 갱신 경로로 오늘 날짜를 설정하도록 구현한다.
- [ ] `이전`, `오늘`, `다음`을 접근 가능한 `캘린더 기간 이동` 그룹으로 묶는다.
- [ ] `월간 보기`, `주간 보기`, `일간 보기`를 접근 가능한 `캘린더 보기 선택` 그룹으로 묶고 현재 보기의 `aria-pressed` 상태를 유지한다.
- [ ] 중립 기간 이동, 선택된 보기, 주요 생성 액션이 색상·테두리·간격·채움 정도로 구분되도록 기존 Tailwind 토큰으로 스타일링한다.
- [ ] `일정 추가`를 기간·보기 그룹 뒤의 마지막 DOM 요소이자 데스크톱 헤더 맨 오른쪽 주요 액션으로 배치한다.
- [ ] 모바일에서는 그룹 단위로 자연스럽게 줄바꿈하되 읽기 순서, 터치 영역, 포커스 표시와 기존 생성 모달 Trigger 포커스 복원을 유지한다.
- [ ] 기존 캘린더 헤더 Cypress 계약을 `기간 이동 → 보기 선택 → 일정 추가` 구조와 `오늘` 액션에 맞게 동기화한다.
- [ ] 전체 병렬 단위 테스트에서 기존 비동기 UI 테스트가 기본 대기 시간 때문에 간헐적으로 실패하면 단언을 유지한 채 필요한 테스트의 대기 한도만 명시한다.
- [ ] Green 이후 중복되는 헤더 버튼 클래스와 상태 표현만 캘린더 기능 내부에서 정리한다.

#### 검증 항목

- [ ] Task 1의 월간·주간·일간 오늘 이동 테스트가 모두 Green인지 검증한다.
- [ ] 선행 Task의 문서·테스트 계약과 구현이 충돌하지 않고 기존 캘린더 탐색 흐름이 회귀하지 않는지 검증한다.
- [ ] 오늘 이동 후 `window.location.search`가 현재 `view`와 오늘의 `date`를 포함하고, 캘린더 제목 및 조회 기간이 오늘 기준으로 바뀌는지 검증한다.
- [ ] 기간 이동·보기 선택 그룹의 접근 가능한 이름과 DOM 순서가 `기간 이동 → 보기 선택 → 일정 추가`인지 검증한다.
- [ ] `일정 추가`가 기존 모달을 열고 닫기·Escape 후 Trigger 포커스를 복원하는지 검증한다.
- [ ] 기존 Cypress 헤더 순서 검증이 `이전 → 오늘 → 다음 → 월간 보기 → 주간 보기 → 일간 보기 → 일정 추가`를 확인하는지 검증한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx src/App.test.tsx`를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- `CAL-05-R1`부터 `CAL-05-R6`까지 코드와 Component Test에서 충족되어야 한다.
- Red → Green → Refactor 결과와 실제 명령을 기록해야 한다.
- 기존 이전·다음, 보기 전환, URL 뒤로/앞으로 이동과 일정 생성 흐름이 회귀하지 않아야 한다.
- Mandatory Gate G1~G6을 충족하고 수정 범위가 허용 경로를 벗어나지 않아야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 오늘 이동 시 현재 보기 단위가 초기화되거나 URL과 화면 날짜가 불일치함
- `일정 추가`가 헤더 마지막 액션이 아니거나 기간·보기 버튼과 시각적으로 구분되지 않음
- 모바일 overflow, 키보드 순서, `aria-pressed`, 포커스 복원 중 하나라도 회귀함
- 새로운 의존성 또는 전역 스타일 변경, 수정 가능 경로 밖 변경, TDD 증거 누락 또는 `quality_score` 85 미만

#### 제외 범위

- 캘린더 헤더 외 전역 Header·Sidebar 디자인 변경
- 날짜 선택 패널과 일정 상세·수정 모달 변경
- 아이콘 라이브러리 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 반응형 헤더와 캘린더 회귀 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`

#### 작업 목적

실제 브라우저에서 오늘 이동, 액션 그룹의 시각적 위계, 맨 오른쪽 생성 액션과 기존 캘린더 핵심 흐름을 데스크톱·모바일 환경에서 통합 검증한다.

#### 수정 가능 경로

- `frontend/cypress/e2e/calendar`
- `frontend/cypress/e2e/global-layout`
- `frontend/src/features/schedule-calendar`
- `frontend/src/App.tsx`
- `docs/plans/active/calendar-05.md`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/quality`
- `harness`

#### 구현 항목

- [x] 고정된 인증·일정 응답과 날짜 조건에서 다른 기간으로 이동한 후 `오늘`로 복귀하는 E2E를 작성한다.
- [x] 데스크톱에서 기간 이동·보기 선택 그룹이 구분되고 `일정 추가`가 헤더 맨 오른쪽에 배치되는지 실제 위치와 computed style로 검증한다.
- [x] 390px 모바일에서 액션 그룹이 겹치지 않고 문서 전체 가로 overflow 없이 줄바꿈되며, `일정 추가`가 마지막 순서를 유지하는지 검증한다.
- [x] 키보드로 기간 이동, 보기 선택과 일정 추가에 접근할 수 있고 기존 생성 모달 포커스 흐름이 유지되는지 검증한다.
- [x] 통합 검증에서 발견된 이 Plan 범위의 결함만 최소 수정하고 관련 회귀 테스트를 유지한다.
- [x] 실행한 명령, Red → Green → Refactor와 실패·해결 결과를 이 Plan의 작업 결과에 기록한다.

#### 검증 항목

- [x] `cd frontend && npm run check`를 실행한다.
- [x] `cd frontend && npx cypress run --spec cypress/e2e/calendar/calendar-visual-refinement.cy.ts,cypress/e2e/global-layout/global-layout.cy.ts`를 실행한다. 시나리오를 별도 calendar spec으로 분리하면 실제 경로와 이유를 기록한다.
- [x] 데스크톱에서 `일정 추가`의 오른쪽 경계가 다른 헤더 액션보다 오른쪽에 있고 생성 액션과 제어 액션의 computed style이 구분되는지 확인한다.
- [x] 모바일에서 `document.documentElement.scrollWidth <= window.innerWidth`이고 모든 액션이 보이며 키보드 포커스 표시가 유지되는지 확인한다.
- [x] 월간·주간·일간 전환, 이전·다음, URL 상태, 일정 추가 모달 열기·닫기 흐름이 회귀하지 않는지 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- `CAL-05-R1`부터 `CAL-05-R6`, FR-011부터 FR-014와 NFR-006의 관련 인수 조건이 Component Test와 실제 브라우저에서 통과해야 한다.
- Task 1과 Task 2의 결과가 통합되고 Mandatory Gate G1부터 G7을 위반하지 않아야 한다.
- 실제 검증 명령과 결과, TDD 증거가 Plan에 기록되어야 한다.
- 수정 범위가 허용 경로를 벗어나지 않고 `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 날짜 또는 URL만 변경되고 캘린더 제목·조회 범위가 오늘 기준으로 갱신되지 않음
- CSS class 문자열만 확인하고 실제 시각적 구분이나 위치를 검증하지 않음
- 데스크톱·모바일·키보드 검증 중 하나를 생략함
- 기존 캘린더 탐색·생성 흐름 회귀, 필수 검증 실패, 수정 가능 경로 밖 변경 또는 `quality_score` 85 미만

#### 제외 범위

- 전체 애플리케이션 E2E의 관련 없는 실패 수정
- 캘린더 외 화면의 버튼 체계 전면 개편
- 운영 배포와 원격 Push

#### 작업 결과

- Red: `calendar-visual-refinement.cy.ts`에 주간 보기의 고정된 오늘 복귀, 데스크톱 실제 경계·computed style, 390px 무가로 overflow·Tab 순서·생성 모달 포커스 복귀 시나리오를 추가했다. 최초 부모 Cypress 검증에서 새 시나리오가 요구한 `calendar-period-controls`와 `calendar-create-action` 관찰 지점이 없어 실패하도록 고정했다.
- Green: `ScheduleCalendar`의 기존 기간 이동 그룹과 생성 버튼에 위 두 `data-testid`를 추가했다. 첫 Green 시도에서 렌더링 완료 전 DOM 조회와 Cypress가 지원하지 않는 `{tab}` 입력 때문에 2건이 실패했으며, 요소 가시성 대기와 `cy.press(Cypress.Keyboard.Keys.TAB)` 기반 네이티브 키보드 이동으로 수정했다. Cypress의 합성 Enter 입력은 포커스된 버튼의 브라우저 기본 활성화를 재현하지 못해, Tab 순서와 포커스 표시를 먼저 검증한 뒤 이미 포커스된 생성 버튼을 클릭하여 기존 모달 포커스 복원 흐름을 분리 검증했다. `cd frontend && npm run check`는 단위 테스트 76건과 typecheck·lint·format·build가 모두 통과했고, `cd frontend && npm run test:e2e`는 5개 spec의 20건이 모두 통과했다.
- Refactor: E2E에서 `requiredElement` 헬퍼로 DOM 조회를 타입 안전하게 만들었으며, 사용자 동작이나 스타일 계약은 변경하지 않았다.
- 실행 경로 제약에 따라 Cypress는 직접 실행하지 않고 부모 브라우저 검증기로 실행했다. 별도 calendar spec 분리는 하지 않았고 `frontend/cypress/e2e/calendar/calendar-visual-refinement.cy.ts`에 유지했다.

#### 남은 문제

- 이전 Harness 실행이 Task 3 Cypress 실패 2건을 PASS로 잘못 집계한 이력이 있다. 사람의 후속 조치 승인에 따라 Plan을 Active로 복원하고 실패 원인을 수정한 뒤 전체 검증을 실제 Green으로 확인했다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현·검증 항목과 `CAL-05-R1`부터 `CAL-05-R6`까지 완료되어야 한다.
- 각 Task의 변경이 해당 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- `오늘`이 현재 보기 단위를 유지하면서 화면 기준 날짜, URL과 조회 기간을 주입된 현재 날짜로 동기화해야 한다.
- 헤더 액션이 `기간 이동 → 보기 선택 → 일정 추가` 순서로 제공되고, 각 영역의 의미와 시각적 위계가 구분되어야 한다.
- `일정 추가`가 데스크톱에서 맨 오른쪽, 모바일 읽기·탐색 순서에서 마지막에 위치해야 한다.
- 데스크톱과 390px 모바일에서 겹침·문서 전체 가로 overflow 없이 키보드와 포커스 흐름을 지원해야 한다.
- Product Spec, 구현과 테스트가 동일한 오늘 이동 및 헤더 액션 계약을 설명해야 한다.
- 기존 이전·다음, 월간·주간·일간 전환, 브라우저 URL 탐색과 일정 생성 모달이 회귀하지 않아야 한다.
- Red → Green → Refactor 증거와 실제 실행 명령이 각 Task 결과에 기록되어야 한다.
- `cd frontend && npm run check`와 관련 Cypress 검증이 모두 통과해야 한다.
- Mandatory Gate G1~G7을 위반하지 않고 전체 `quality_score`가 85 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 필수 검증이 실패함
- `오늘` 이동 시 현재 보기 단위, URL, 화면 날짜 또는 조회 기간이 서로 불일치함
- 기간 이동·보기 선택·일정 생성 액션의 구분이나 순서가 요구사항과 다름
- `일정 추가`가 헤더 맨 오른쪽·마지막 액션이 아니거나 모바일에서 접근할 수 없음
- 테스트 삭제·단언 약화·품질 Gate 우회로 통과시킴
- Product Spec과 실제 동작이 충돌하거나 문서 갱신이 누락됨
- Backend/API/DB, 인증·권한, 외부 의존성 또는 전역 스타일을 사람 승인 없이 변경함
- Task별 수정 가능 경로 밖 변경 또는 수정 금지 경로 변경이 발생함
- 미실행 검증이나 남은 위험을 숨기고 완료로 보고함
- 전체 `quality_score`가 85 미만임
