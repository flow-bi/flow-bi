# 작업 계획: calendar-08

## 1. 기본 정보

### 사용자 요청

- 일정 추가 중 모달 바깥을 클릭했을 때 표시되는 `입력한 내용을 버릴까요?` 확인 모달의 비정상 레이아웃을 수정한다.
- 일정 추가·수정·취소처럼 유사한 확인 상황에 같은 모달 구조와 스타일을 전체적으로 적용한다.

### 작업 목적

캘린더 기능이 소유한 확인형 `alertdialog`를 하나의 재사용 가능한 레이아웃으로 통일한다. 일정 추가 입력 폐기, 일정 수정 내용 폐기, 일정 취소 확인에서 제목·설명·우측 상단 닫기·업무 액션 footer가 같은 카드 경계와 반응형 규칙을 사용하도록 하며, 각 흐름의 기존 상태와 API 동작은 유지한다.

### 작업 유형

- bugfix
- refactor
- test

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `frontend/DESIGN.md`
- Architecture: `frontend/FRONTEND.md`
- 선행 작업: `docs/plans/complete/calendar-06.md`, `docs/plans/complete/calendar-07.md`
- 기타 참고 문서: `CONVENTIONS.md`

### 확인 결과

- 캘린더 기능의 확인형 `alertdialog`는 일정 추가 입력 폐기, 일정 수정 내용 폐기, 일정 취소 확인의 세 곳이다.
- 일정 추가 입력 폐기 모달은 일정 수정에서 발견된 결함과 동일한 `fixed inset-1/2`를 사용해 카드 높이가 내용을 정상적으로 감싸지 못한다.
- 일정 추가 확인 모달은 버튼 스타일, 우측 상단 일반 닫기, 반응형 footer도 다른 두 확인 모달과 일치하지 않는다.
- `calendar-06`과 `calendar-07`은 `frontend/src/features/schedule-create`를 제외 범위로 두었기 때문에 일정 추가 모달에는 수정이 적용되지 않았다.
- Product Spec은 생성·상세·수정·취소·미저장 변경 확인 모달의 일반 닫기를 우측 최상단에 두고 footer에는 업무 동작만 배치하도록 이미 규정한다.

### 설계 방향

- `frontend/src/shared/ui`에 도메인 문구나 API 상태를 소유하지 않는 재사용 가능한 확인 모달 레이아웃을 둔다.
- 각 캘린더 기능은 제목, 설명, 안전 액션, 파괴 액션, pending 상태와 실제 이벤트 처리만 전달한다.
- 새 패키지나 전역 CSS 없이 기존 Tailwind 역할 토큰과 의미별 버튼 스타일을 사용한다.

---

## 2. 실행 Task

### Task 1. 캘린더 확인형 모달 공통화 및 전체 적용

#### 선행 Task

- `없음`

#### 작업 목적

세 확인형 모달이 동일한 overlay, 카드, 우측 상단 닫기와 반응형 footer를 사용하게 하고 모든 콘텐츠와 버튼이 카드 경계 안에 표시되도록 한다.

#### 수정 가능 경로

- `frontend/src/shared/ui`
- `frontend/src/features/schedule-create`
- `frontend/src/features/schedule-calendar`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/auth`
- `frontend/src/index.css`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress.config.ts`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 일정 추가 폼을 변경하고 바깥 영역을 클릭했을 때 `입력한 내용을 버릴까요?` alertdialog의 제목, 설명, 닫기, `계속 입력`, `입력 취소하고 닫기`가 카드 경계 안에 포함되는지 실패 Component Test와 Cypress 테스트를 먼저 작성한다.
- [ ] Red: 일정 추가·수정·취소 확인 모달이 동일한 overlay·카드·header·footer 계약과 Secondary/Danger 액션 위계를 사용하는지 관찰 가능한 실패 테스트로 표현한다.
- [ ] 기존 Frontend 구조 규칙에 맞춰 `frontend/src/shared/ui`에 범용 확인 모달 컴포넌트를 추가한다. 컴포넌트는 `alertdialog` 의미, `aria-labelledby`, overlay와 카드, 우측 상단 접근 가능한 `닫기`, 설명 영역과 업무 액션 footer의 레이아웃만 담당한다.
- [ ] 공통 확인 모달 카드는 콘텐츠 높이를 유지하고 화면 중앙에 배치되며 `fixed inset-1/2`처럼 상·하·좌·우를 동시에 50%로 제한하는 방식을 사용하지 않는다.
- [ ] 일정 추가 입력 폐기 확인에 공통 모달을 적용하고 `계속 입력`을 Secondary 안전 액션, `입력 취소하고 닫기`를 Danger 파괴 액션으로 표시한다.
- [ ] 일정 수정 내용 폐기 확인에 공통 모달을 적용하고 `계속 수정`과 `수정 취소하고 닫기`의 기존 의미별 스타일과 동작을 유지한다.
- [ ] 일정 취소 확인에 공통 모달을 적용하고 `계속 일정 보기`와 `일정 취소 확정`의 기존 의미별 스타일, pending 비활성화와 중복 요청 방지를 유지한다.
- [ ] 세 확인 모달의 일반 닫기를 우측 최상단 `×`로 통일하고 접근 가능한 이름 `닫기`, 보이는 focus 스타일, 열릴 때의 초기 포커스와 닫힌 뒤 이전 작업 화면의 상태·포커스 복귀를 유지한다.
- [ ] 확인 모달 overlay 바깥 클릭과 Escape는 파괴 동작을 실행하지 않고 확인 모달만 닫아 기존 입력·수정·상세 상태를 보존한다.
- [ ] 데스크톱에서는 footer 액션을 우측 정렬하고 390px 모바일에서는 전체 너비의 세로 버튼으로 겹침 없이 배치하며 카드와 문서 전체의 가로 overflow를 방지한다.
- [ ] Green 이후 중복된 확인 모달 overlay·카드·닫기·footer Tailwind 클래스만 공통 컴포넌트로 제거하고, 생성·수정·취소의 폼 상태와 API mutation 책임은 각 기능에 남긴다.

#### 검증 항목

- [ ] Component Test에서 일정 추가 입력 폐기 확인 모달의 `계속 입력`, `입력 취소하고 닫기`, 우측 상단 닫기와 설명이 공통 카드 내부에 표시되고 Secondary·Danger 스타일과 반응형 footer를 사용하는지 검증한다.
- [ ] Component Test에서 일정 수정 폐기와 일정 취소 확인 모달도 같은 공통 구조를 사용하면서 기존 문구, 포커스, pending, 입력·수정 상태 보존과 파괴 동작을 유지하는지 검증한다.
- [ ] Cypress 데스크톱 1280×800에서 세 alertdialog 각각의 제목, 설명, 닫기와 모든 footer 버튼의 bounding rectangle이 해당 카드 경계 안에 포함되는지 검증한다.
- [ ] Cypress 모바일 390×844에서 세 alertdialog의 footer 버튼이 카드 내부에서 겹치지 않고 모두 보이며 카드와 문서 전체에 가로 overflow가 없는지 검증한다.
- [ ] 일정 추가·수정 모달의 바깥 클릭으로 확인 모달이 열리고, 확인 모달의 바깥 클릭·Escape·우측 상단 닫기·안전 액션 후 작성 중인 값과 기존 작업 모달이 유지되는지 검증한다.
- [ ] 각 파괴 액션은 해당 생성 또는 수정 모달만 닫고, 일정 취소 확정은 pending 중 한 번만 요청되는지 기존 회귀 테스트로 검증한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-create src/features/schedule-calendar src/shared/ui` 또는 Harness가 허용하는 동등한 전체 단위 테스트 명령을 실행한다.
- [ ] `cd frontend && npm run check`를 실행한다.
- [ ] 부모 브라우저 검증기를 통해 전체 Cypress 회귀 시나리오를 실행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 일정 추가 입력 폐기, 일정 수정 내용 폐기, 일정 취소 확인의 세 alertdialog가 동일한 공통 overlay·카드·닫기·footer 구조를 사용해야 한다.
- 세 alertdialog의 제목, 설명, 닫기와 업무 버튼이 데스크톱과 390px 모바일에서 카드 경계 안에 표시되어야 한다.
- 안전 액션과 파괴 액션이 시각적으로 구분되고 footer에는 단순 닫기 액션이 없어야 한다.
- 바깥 클릭·Escape·닫기·안전 액션은 작업 상태를 보존하고 파괴 액션만 명시된 폐기 또는 취소를 수행해야 한다.
- 기존 일정 생성·수정·취소 API 계약, pending 중 중복 요청 방지와 오류 처리가 회귀하지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- Red → Green → Refactor의 실제 명령과 결과가 작업 결과에 기록되어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 하나 이상의 확인 모달이 공통 구조를 사용하지 않거나 `fixed inset-1/2` 결함을 유지함
- 제목, 설명, 닫기 또는 footer 버튼이 카드 경계 밖에 표시됨
- 데스크톱 또는 390px 모바일에서 버튼 겹침이나 카드·문서 전체 가로 overflow가 발생함
- 일반 닫기가 footer에 있거나 접근 가능한 이름·포커스 표시가 없음
- 바깥 클릭·Escape·안전 액션이 입력 또는 수정 상태를 폐기함
- 파괴 액션, pending 또는 기존 API 호출 동작이 회귀함
- 테스트, 정적 분석 또는 빌드 실패
- 수정 가능 경로 밖 또는 수정 금지 경로 변경
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 일정 추가·수정 폼의 필드 구성과 유효성 규칙 변경
- 일정 상세와 날짜별 패널의 정보 구조 변경
- 캘린더 외 인증·사이드바 모달의 공통화
- 일정 생성·수정·취소 API, Backend 또는 DB 변경
- 전역 CSS와 디자인 토큰 변경
- 새로운 UI 또는 아이콘 의존성 도입

#### 작업 결과

`none`

#### 남은 문제

- 인앱 브라우저 연결이 없어 계획 작성 시 실제 화면 스크린샷은 확보하지 못했다. 구현 시 부모 Cypress 검증기로 세 확인 모달의 실제 카드 경계를 검증한다.

---

## 3. 전체 완료 조건

- Task 1의 모든 구현·검증 항목이 완료되어야 한다.
- 캘린더의 세 확인형 alertdialog가 같은 공통 레이아웃과 상호작용 계약을 사용해야 한다.
- 데스크톱·모바일 카드 경계, 반응형, 접근성과 상태 보존 검증이 모두 통과해야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- Task 1이 실패하거나 필수 검증을 실행할 수 없음
- 하나 이상의 캘린더 확인형 alertdialog에 비정상 카드 경계 또는 별도 구현이 남음
- 기존 사용자 동작, API 또는 접근성 계약이 회귀함
- Task 수정 범위를 벗어난 변경이 발생함
- 전체 `quality_score`가 기준 미달
