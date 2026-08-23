# 작업 계획: calendar-12

## 1. 기본 정보

### 사용자 요청

일정 상세에서 진입하는 수정 폼을 일정 추가 폼과 비슷하게 구성하여 기존 값을 더 쉽게 확인하고 수정할 수 있게 한다.

### 작업 목적

일정 수정 폼을 일정 추가 폼과 같은 정보 구조와 입력 표현으로 정렬한다. 팀·프로젝트 대상은 원시 ID가 아닌 이름 기반 선택으로 제공하고, 기존 개인 일정·참석자·회의실 관리 정책과 접근성 및 반응형 동작은 유지한다.

### 작업 유형

- feature
- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Frontend 기준: `frontend/FRONTEND.md`, `frontend/DESIGN.md`
- 기타 참고 문서: `ARCHITECTURE.md`, `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `CAL-12-R1`: 수정 폼은 추가 폼과 같은 순서로 제목, 날짜·시간, 하루종일, 위치, 일정 유형, 공개 범위, 팀·프로젝트 대상, 색상, 참석자, 등록자 참석, 상세 설명을 표시한다.
- `CAL-12-R2`: 수정 폼의 레이블, 입력, 체크박스, 패널 여백과 반응형 날짜·시간 그리드는 추가 폼과 동일한 시각 규칙을 사용한다.
- `CAL-12-R3`: 팀·프로젝트 대상은 원시 ID 입력이 아니라 추가 폼과 같은 이름 기반 체크박스 목록으로 확인·수정하며 Loading·Empty·Error 상태를 제공한다.
- `CAL-12-R4`: 기존 개인 일정 제한, 참석자 검색, 미저장 변경 확인, 저장 중 중복 요청 방지와 회의실 관리 일정 수정 제한은 유지한다.
- `CAL-12-R5`: 키보드와 Screen Reader가 레이블, 선택 대상, 닫기 및 저장 동작을 식별할 수 있고 Desktop과 Mobile에서 가로 overflow가 없어야 한다.

### 적용 경계

- Backend API와 DB Schema는 변경하지 않고 기존 일정 상세 및 대상 목록 API를 재사용한다.
- 기존 작업 트리에 존재하는 선행 Calendar 변경은 되돌리거나 Calendar-12의 변경으로 간주하지 않고, 이 Task가 실제로 수정한 허용 경로만 범위 검증 대상으로 삼는다.
- 폼 전체 공통 컴포넌트 추출이나 전역 디자인 변경은 수행하지 않는다.

---

## 2. 실행 Task

### Task 1. 일정 수정 폼과 추가 폼의 사용 경험 통일

#### 선행 Task

- `없음`

#### 작업 목적

일정 수정 폼의 필드 순서·입력 스타일·반응형 배치를 추가 폼과 정렬하고, 팀·프로젝트 대상을 이름으로 확인하고 선택할 수 있게 하면서 기존 일정 정책과 회귀 검증을 유지한다.

#### 수정 가능 경로

- `docs/product-specs/calendar.md`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.tsx`
- `frontend/src/features/schedule-calendar/ScheduleCalendar.test.tsx`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `frontend/src/features/schedule-create`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `.agents`
- `backend/DB_SCHEMA.md`
- `backend/src/main/resources/db/migration`

#### 구현 항목

- [ ] Red: 수정 폼의 반응형 날짜·시간 그리드와 공통 입력 표현이 없고 팀 대상 원시 ID 입력이 노출되는 사용자 동작 실패 테스트를 먼저 기록한다.
- [ ] Green: 제목부터 상세 설명까지 추가 폼과 같은 필드 순서, 레이블·입력·체크박스 표현과 반응형 패널 배치를 적용한다.
- [ ] Green: 팀·프로젝트 대상 원시 ID 입력을 제거하고 기존 대상 목록 API를 사용한 이름 기반 체크박스 목록과 Loading·Empty·Error·Retry 상태를 제공한다.
- [ ] Green: 기존 선택 대상, 참석자 이름, 등록자 참석 여부와 자동 참석 인원을 수정 폼에서 바로 확인할 수 있게 한다.
- [ ] Green: 개인 일정 전환 시 관계 제거 안내, 참석자 검색, 미저장 변경 확인, 저장 중 중복 요청 방지와 회의실 관리 일정 직접 수정 제한을 유지한다.
- [ ] Green: Desktop과 Mobile에서 모달 가로 overflow 없이 키보드와 Screen Reader로 레이블·체크박스·닫기·저장 동작을 식별하고 조작할 수 있게 한다.
- [ ] Refactor: Calendar 수정 폼 안의 중복 표현만 최소 정리하고 생성 폼, 전역 스타일 또는 API 계약을 변경하지 않는다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정과 검증을 반복하고 이후에도 실패하면 요구사항이나 접근성 단언을 약화하지 않고 Task를 실패 처리한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features/schedule-calendar/ScheduleCalendar.test.tsx`로 수정 폼 구조, 이름 기반 대상 선택, 참석자 정책과 기존 기능 회귀를 검증한다.
- [ ] `cd frontend && npm run check`로 Typecheck, Lint, Format, 전체 Unit Test와 Production Build를 검증한다.
- [ ] `cd frontend && npx cypress run`으로 일정 생성·상세·수정, 이름 기반 대상·참석자 선택, Desktop·Mobile, 미저장 확인과 선행 Calendar 기능의 충돌 또는 회귀가 없는지 통합 검증한다.
- [ ] 저장소 루트에서 `git diff --check`를 실행하고 이 Task의 실제 변경이 수정 가능 경로에 한정되며 수정 금지 경로를 변경하지 않았는지 확인한다.
- [ ] Product Spec의 `CAL-12-R1`부터 `CAL-12-R5`까지가 실제 화면, 테스트와 일치하고 기존 개인 일정 및 회의실 관리 일정 계약과 충돌하지 않는지 교차 검토한다.

#### 완료 조건

- `CAL-12-R1`부터 `CAL-12-R5`까지 모두 충족해야 한다.
- Red → Green → Refactor 순서와 각 단계의 실패·성공 결과가 실행 기록에 남아야 한다.
- 모든 구현 항목과 검증 항목이 통과해야 한다.
- 수정 폼에서 원시 팀·프로젝트 대상 ID가 노출되지 않고 이름으로 기존 값과 선택 상태를 확인할 수 있어야 한다.
- 기존 개인 일정·참석자·회의실 관리 정책, 접근성과 반응형 동작에 회귀가 없어야 한다.
- 수정 가능 경로 밖 또는 수정 금지 경로에 이 Task가 만든 변경이 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 수정 폼과 추가 폼의 필드 순서·레이블·입력 표현 또는 반응형 배치가 불일치함
- 팀·프로젝트 대상이 원시 ID로 노출되거나 기존 선택 상태를 이름으로 확인·수정할 수 없음
- 대상 목록의 Loading·Empty·Error 상태 또는 Retry 동작이 누락됨
- 개인 일정 제한, 참석자 검색, 미저장 변경 확인, 저장 중 중복 요청 방지 또는 회의실 관리 일정 정책이 회귀함
- 키보드·Screen Reader·Mobile 사용성 검증이 실패함
- 테스트 단언 약화, 필수 검증 실패 또는 3회 수정 후에도 같은 문제가 지속됨
- 수정 가능 경로 밖 또는 수정 금지 경로에 이 Task가 만든 변경이 발생함
- `quality_score`가 `90` 미만임

#### 제외 범위

- Backend API, 인증·인가, DB Schema 또는 Migration 변경
- 일정 추가 폼이나 전역 디자인 시스템의 구조 변경
- 폼 전체 공통 컴포넌트 추출 또는 대규모 리팩터링
- 신규 UI, 검색 또는 상태 관리 의존성 도입
- 기존 개인 일정 관계의 데이터 정리
- Git commit, 원격 Push, 배포 또는 운영 데이터 변경

#### 작업 결과

`none`

#### 남은 문제

- 생성·수정 폼의 스타일 상수는 각각 존재하므로 장기적으로 다시 달라질 수 있다. 공통 폼 컴포넌트 추출은 별도 Plan에서 검토한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- Product Spec, 수정 폼 구현과 테스트가 `CAL-12-R1`부터 `CAL-12-R5`까지 같은 동작을 설명해야 한다.
- 기존 개인 일정·참석자·회의실 관리 일정 정책과 충돌 또는 회귀가 없어야 한다.
- 모든 Task의 실제 변경이 수정 가능 경로 안에 있고 수정 금지 경로에 새 변경이 없어야 한다.
- 실행하지 못한 검증이 있으면 이유와 남은 위험을 기록하고 완료로 처리하지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 구현 항목 또는 검증 항목이 실패함
- Product Spec 또는 Design Doc과 실제 수정 폼 동작이 충돌함
- 개인 일정·참석자·회의실 관리 일정 정책, 접근성 또는 반응형 동작에 회귀가 발생함
- 테스트 단언이나 품질 기준을 약화하여 검증을 통과시킴
- Task의 수정 가능 경로 밖 또는 수정 금지 경로에 새 변경이 발생함
- 미실행 검증이나 남은 위험이 사용자 확인 없이 방치되거나 완료로 보고됨
- 전체 `quality_score`가 `90` 미만임
