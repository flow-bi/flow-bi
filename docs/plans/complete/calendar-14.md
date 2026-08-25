# 작업 계획: calendar-14

## 1. 기본 정보

### 사용자 요청

캘린더 기능 폴더에 많은 파일이 한 디렉터리에 모여 있는 구조를 책임별 하위 폴더로 정리한다.

### 작업 목적

`schedule-calendar` 루트에 혼재한 API, 화면 컴포넌트, 일정 폼, 상태 훅과 순수 도메인 로직을 역할별 하위 경계로 재배치하고 공개 진입점을 명확히 한다. FR-011~FR-018, CAL-05, CAL-11, CAL-12 및 NFR-003·NFR-006의 사용자 동작과 기존 API·Query cache·접근성 계약은 변경하지 않으면서 파일 탐색성과 의존 방향을 개선한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `docs/quality/quality-model.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`

---

## 2. 실행 Task

### Task 1. 캘린더 기능 파일을 책임별 하위 경계로 재배치

#### 선행 Task

- 없음

#### 작업 목적

캘린더 기능의 외부 소비자는 하나의 공개 진입점만 사용하게 하고, 내부 파일은 API, 캘린더 표시 컴포넌트, 일정 쓰기·상세 컴포넌트, 서버 상태 훅, 순수 모델 책임으로 구분해 한 폴더에 파일이 집중된 문제를 해결한다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar`
- `frontend/src/features/schedule-create`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `frontend/src/features/auth`
- `frontend/src/features/meeting-room`
- `frontend/src/shared`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] Red: `featureBoundary.test.ts`에 `schedule-calendar` 루트의 허용 파일, 공개 진입점 사용, 하위 경계 간 의존 방향과 순환 의존 금지 규칙을 먼저 추가하고 현재 flat 구조 때문에 실패함을 기록한다.
- [ ] Red: 월·주·일 조회, 일정 생성·상세·수정·취소, 날짜 패널, 폼 변환, 시간축 배치, 색상 표현과 API 요청의 기존 관찰 가능 동작을 현재 단위·컴포넌트 테스트로 고정한다.
- [ ] Green: 일정 API 요청·응답 타입·오류 경계를 `api` 하위 폴더로 이동하고 관련 테스트를 대상 모듈 옆에 배치한다.
- [ ] Green: 헤더·그리드·일간 타임라인·날짜 패널을 `components/calendar`에, 생성·수정·상세·취소·공통 폼·참석자 선택을 `components/schedule`에 배치하고 각 테스트를 관련 구현 옆에 유지한다.
- [ ] Green: TanStack Query 조회·수정·취소 조정 코드는 `hooks`에, 날짜·시간축·색상·폼 Schema·표현 변환 같은 순수 로직과 테스트는 `model`에 배치한다.
- [ ] Green: `schedule-calendar` 루트에는 외부 공개 진입점과 최상위 화면 조립 책임만 남기고, `App.tsx`와 테스트는 공개 진입점을 통해 `ScheduleCalendar`와 `ScheduleCreateModal`을 사용하도록 정리한다.
- [ ] Refactor: 저장소 내부 사용처가 없는 `schedule-create` 호환 re-export와 중복 테스트 경계를 제거하되 모든 소비처가 새 공개 진입점으로 이전됐음을 구조 테스트와 Type Check로 확인한다.
- [ ] Refactor: 상대 import를 새 책임 경계에 맞게 갱신하고 하위 폴더 간 역방향·순환 의존, 비어 있는 디렉터리와 중복 barrel export를 남기지 않는다.
- [ ] 파일 이동 외에 사용자 레이블·DOM 식별자, URL 상태, Query key·cache 무효화, API endpoint·payload, 포커스·키보드·반응형 동작을 변경하지 않는다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/schedule-calendar src/App.test.tsx`가 통과한다.
- [ ] `cd frontend && npm run typecheck`가 통과한다.
- [ ] `cd frontend && npm run lint`와 `cd frontend && npm run format:check`가 통과한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/calendar/**/*.cy.ts'`가 통과한다.
- [ ] Red 구조 테스트가 flat 구조 때문에 실패하고 Green·Refactor 후 동일 테스트와 관련 회귀 테스트가 통과한 결과를 실행 기록에 남긴다.
- [ ] `rg` 기반 사용처 확인에서 `schedule-create` 내부 경로 import와 새 하위 경계를 우회하는 외부 deep import가 남지 않았는지 확인한다.
- [ ] Desktop 1280×800과 Mobile 390×844에서 월·주·일 조회, 생성·상세·수정·취소, 날짜 패널, 모달 포커스와 가로 overflow 계약이 기존 Cypress 결과와 동일한지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `schedule-calendar` 루트에는 공개 진입점과 최상위 조립 파일만 남고 내부 구현은 `api`, `components/calendar`, `components/schedule`, `hooks`, `model` 책임에 맞게 배치되어야 한다.
- 기능 외부에서는 공개 진입점만 사용하고 내부 하위 경계 사이에 역방향 또는 순환 의존이 없어야 한다.
- 기존 일정 API, URL, Query cache, DOM·접근성 및 반응형 계약이 유지되어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 단위 테스트, Type Check, Lint, Formatting 또는 Cypress 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 사용자 동작, API, URL, Query cache, DOM·접근성 또는 반응형 계약 변경
- 하위 폴더 간 역방향·순환 의존 또는 외부 deep import 잔존
- 테스트 삭제·단언 약화·검증 우회
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 캘린더 기능 추가 또는 UI·UX 변경
- Backend, 공개 API, 인증·인가, DB 스키마와 Migration 변경
- 공통 디자인 시스템 또는 전역 `shared` 구조 개편
- 새 라이브러리, 상태 관리 방식, Router 또는 빌드 도구 도입
- 캘린더 외 기능의 테스트 실패 수정

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
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- 캘린더 사용자 동작, API·URL·Query cache, DOM·접근성 및 반응형 계약이 변경되지 않아야 한다.
- Frontend Type Check·Lint·Formatting·Unit Test·Build와 Calendar Cypress가 통과해야 한다.
- `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 전체 `quality_score`가 85 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 캘린더 사용자 동작, API·URL·Query cache, DOM·접근성 또는 반응형 계약이 변경됨
- 테스트 삭제, 단언 약화 또는 검증 우회로 폴더 구조 정리를 통과시킴
- 남은 문제가 사용자 확인 없이 방치됨
