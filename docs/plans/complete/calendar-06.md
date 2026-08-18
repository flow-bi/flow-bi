# 작업 계획: calendar-06

## 1. 기본 정보

### 사용자 요청

- 일정 상세에서 `일정 수정` 또는 `일정 취소`를 선택한 뒤 표시되는 모달의 버튼이 버튼답게 보이도록 스타일을 개선한다.
- 후속 모달의 버튼 위치와 정렬을 일관되게 수정한다.

### 작업 목적

일정 수정 모달과 수정 내용 폐기·일정 취소 확인 모달의 액션을 기존 디자인 체계에 맞춰 구분한다. 일반 닫기는 우측 상단에 유지하고, 업무 액션은 모달 footer에 정렬하여 데스크톱과 모바일에서 의미·위치·키보드 포커스를 명확히 제공한다.

### 작업 유형

- bugfix
- test

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `frontend/DESIGN.md`
- Architecture: `frontend/FRONTEND.md`
- 기타 참고 문서: `CONVENTIONS.md`

---

## 2. 실행 Task

### Task 1. 일정 수정·취소 후속 모달 버튼 스타일과 정렬 개선

#### 선행 Task

- `없음`

#### 작업 목적

일정 수정 진입 후의 저장 액션, 수정 내용 폐기 확인 액션, 일정 취소 확인 액션에 Primary·Secondary·Danger 위계를 적용하고 모든 후속 모달의 닫기 및 footer 배치를 일관되게 만든다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/schedule-create`
- `frontend/src/features/auth`
- `frontend/src/index.css`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 일정 수정 모달, `수정 내용을 버릴까요?` 확인 모달, 일정 취소 확인 모달의 버튼 모양·의미별 스타일·footer 정렬을 관찰하는 실패 Component Test와 Cypress 회귀 테스트를 먼저 작성한다.
- [ ] 일정 수정 모달의 `수정 저장`을 Primary 업무 액션으로 유지하고 footer의 우측 정렬, 버튼 간격과 반응형 배치를 기존 Tailwind 토큰으로 일관되게 정리한다.
- [ ] `수정 내용을 버릴까요?` 확인 모달의 `계속 수정`은 Secondary 안전 액션, `수정 취소하고 닫기`는 Danger 파괴 액션으로 표현하고 별도 footer에서 정렬한다.
- [ ] 일정 취소 확인 모달의 `계속 일정 보기`는 Secondary 안전 액션, `일정 취소 확정`은 Danger 파괴 액션으로 표현하고 별도 footer에서 정렬한다.
- [ ] 각 후속 모달의 일반 `닫기` 버튼을 우측 최상단의 접근 가능한 `×` 컨트롤로 통일하고 hover·disabled·보이는 keyboard focus 상태를 제공한다.
- [ ] 데스크톱에서는 footer 액션을 우측 정렬하고, 390px 모바일에서는 버튼이 겹치거나 가로 overflow를 만들지 않도록 충분한 너비와 간격으로 쌓이거나 줄바꿈되게 한다.
- [ ] 모달의 기존 문구, 수정 저장·일정 취소 API 호출, pending 중 중복 실행 방지, 바깥 클릭·Escape 닫기와 이전 화면 복귀 동작은 변경하지 않는다.
- [ ] Green 이후 반복되는 모달 액션 버튼과 footer Tailwind 클래스만 캘린더 기능 내부에서 최소한으로 정리한다.

#### 검증 항목

- [ ] 수정 폼을 변경한 뒤 닫기를 선택하면 `수정 내용을 버릴까요?` alertdialog가 표시되고, `계속 수정`과 `수정 취소하고 닫기`가 각각 Secondary와 Danger 스타일로 구분되는지 Component Test로 검증한다.
- [ ] 일정 상세에서 `일정 취소`를 선택하면 취소 alertdialog가 표시되고, `계속 일정 보기`와 `일정 취소 확정`이 각각 Secondary와 Danger 스타일로 구분되는지 Component Test로 검증한다.
- [ ] 각 alertdialog에서 우측 상단 `닫기`, 안전 액션, 파괴 액션을 키보드로 접근할 수 있고 Escape·닫기·안전 액션 후 기존 수정 또는 상세 모달 상태가 유지되는지 검증한다.
- [ ] pending 상태에서는 수정 저장과 일정 취소 확정의 중복 실행이 차단되고 disabled 스타일이 유지되는지 검증한다.
- [ ] Cypress에서 데스크톱 footer의 액션 경계와 computed style이 구분되고, 390px 모바일에서 버튼 겹침과 문서 전체 가로 overflow가 없으며 모든 액션이 보이는지 검증한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx`를 실행한다.
- [ ] 부모 브라우저 검증기를 통해 `frontend/cypress/e2e/calendar`의 일정 수정·취소 모달 시나리오를 실행한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 일정 수정·폐기 확인·일정 취소 확인 모달의 Primary·Secondary·Danger 버튼 위계와 footer 정렬이 데스크톱·모바일에서 일관되어야 한다.
- 수정 저장, 수정 폐기, 일정 취소와 모달 닫기 동작이 기존 API 및 상태 계약을 유지해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- Red → Green → Refactor의 실제 명령과 결과가 작업 결과에 기록되어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 후속 모달 버튼에 시각적 버튼 형태 또는 의미별 위계가 적용되지 않음
- 닫기 버튼이 우측 최상단이 아니거나 footer에 일반 닫기 액션이 추가됨
- 데스크톱·390px 모바일에서 버튼이 겹치거나 모달 또는 문서 전체 가로 overflow가 발생함
- 키보드 포커스가 보이지 않거나 Escape·닫기·안전 액션의 기존 동작이 회귀함
- 수정 저장 또는 일정 취소 요청이 중복 실행되거나 기존 API 계약이 변경됨
- 테스트 또는 빌드 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 일정 추가 모달과 입력 폐기 확인 모달의 디자인 변경
- 일정 수정 폼의 필드 구성·유효성 규칙 변경
- 일정 수정·취소 API, Backend 또는 DB 변경
- 캘린더 외 모달과 전역 버튼 디자인 체계 개편
- 새로운 UI 또는 아이콘 의존성 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- 일정 수정과 취소 후속 모달의 버튼 형태, 의미 위계, footer 정렬과 반응형 배치가 일관되어야 한다.
- 일반 닫기는 우측 최상단에만 제공되고 footer에는 수정 저장·계속 수정·수정 취소·계속 일정 보기·일정 취소 확정과 같은 업무 액션만 있어야 한다.
- 기존 수정 저장·일정 취소·모달 닫기·pending 상태와 API 계약이 회귀하지 않아야 한다.
- 각 Task의 수정 범위가 해당 Task의 수정 가능 경로인 `frontend/src/features/schedule-calendar`과 `frontend/cypress/e2e/calendar`을 벗어나지 않아야 한다.
- 수정 금지 경로에 변경이 없어야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- 버튼의 의미 위계, 위치, 반응형 또는 키보드 접근성 요구사항이 누락됨
- 기존 일정 수정·취소 동작 또는 API 호출이 회귀함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design 기준과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
