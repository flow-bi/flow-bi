# 작업 계획: calendar-13

## 1. 기본 정보

### 사용자 요청

구현된 캘린더 기능의 코드를 기존 동작과 계약을 유지하면서 책임이 명확하고 중복이 적은 구조로 리팩터링한다.

### 작업 목적

캘린더 구현 과정에서 커진 프런트엔드 컴포넌트, 생성·수정 사이의 중복 폼과 API 모델, 백엔드 일정 쓰기 모델의 불필요한 계층 의존을 정리한다. FR-011~FR-018, CAL-11-R1·R4~R6, CAL-12-R1~R5, NFR-003, NFR-006의 사용자 동작과 기존 API·DB 계약은 변경하지 않고 이후 일정 기능을 안전하게 수정할 수 있는 구조를 만든다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `docs/quality/quality-model.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`

---

## 2. 실행 Task

### Task 1. 백엔드 일정 쓰기 모델과 도메인 의존성 정리

#### 선행 Task

- 없음

#### 작업 목적

일정 생성·수정 명령의 중복 검증과 엔티티 관계 갱신 책임을 명확히 하고, DTO·Entity가 Controller·Repository·Service에 의존하는 불필요한 import를 제거하되 일정 생성·수정·취소 규칙과 영속 결과는 그대로 유지한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule/dto`
- `backend/src/main/java/com/flowbi/domain/schedule/entity`
- `backend/src/main/java/com/flowbi/domain/schedule/service`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/schedule/controller`
- `backend/src/main/java/com/flowbi/domain/schedule/repository`
- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`

#### 구현 항목

- [ ] Red: `SchedulePackageStructureTest`에 DTO·Entity가 Controller·Repository·Service 패키지에 의존하지 않는 규칙을 먼저 추가하고 현재 불필요한 의존 때문에 실패함을 기록한다.
- [ ] Red: 생성·수정 명령의 필수값, 시간 순서, 기본 공개 범위, 대상 유형, 양수·중복 ID 검증과 `Schedule`의 참석자·공유 대상 갱신 동작을 관련 단위 테스트로 고정한다.
- [ ] Green: 생성·수정 명령이 공유하는 불변 목록 정규화와 일정 쓰기 검증을 하나의 명확한 내부 책임으로 추출하고, 생성·수정별 예외 타입과 기존 메시지 의미를 유지한다.
- [ ] Green: `Schedule`의 생성·수정 시 참석자와 사용자·팀·프로젝트 대상 구성 로직을 작은 책임 단위로 정리하면서 등록자 참석 중복 방지와 orphan removal 동작을 보존한다.
- [ ] Refactor: 일정 DTO·Entity의 wildcard 및 교차 계층 import를 필요한 도메인 타입으로 축소하고 이름·가시성·패키지 배치를 `backend/BACKEND.md`에 맞춘다.
- [ ] 공개 API 요청·응답, DB Mapping·Migration, 일정 권한·취소 정책, 회의실 예약 연동 인터페이스에는 변경을 만들지 않는다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.schedule.dto.*' --tests 'com.flowbi.domain.schedule.entity.*' --tests 'com.flowbi.domain.schedule.service.ScheduleCreateServiceTest' --tests 'com.flowbi.domain.schedule.service.ScheduleUpdateServiceTest' --tests 'com.flowbi.domain.schedule.structure.SchedulePackageStructureTest'`가 통과한다.
- [ ] `cd backend && ./gradlew spotlessCheck`가 통과한다.
- [ ] Red 실패, Green 통과, Refactor 후 재통과 결과를 Task 실행 기록에 남긴다.
- [ ] 테스트 삭제·단언 약화·예외 삼키기 없이 생성과 수정의 정상·경계·실패 결과가 기존 계약과 동일한지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- DTO·Entity에서 Controller·Repository·Service 패키지로 향하는 의존이 없어야 한다.
- 생성·수정 검증과 엔티티 관계 갱신의 중복이 제거되고 각 책임이 단일 위치에서 설명 가능해야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 정적 검증 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- API, DB Mapping, 권한, 취소 또는 회의실 예약 연동 동작 변경
- 테스트 삭제·단언 약화·검증 우회
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 공개 일정 API 및 오류 응답 계약 변경
- DB 스키마, Migration, Entity Mapping 변경
- 인증·인가, 일정 취소 정책 및 회의실 예약 정책 변경
- 새 라이브러리 또는 아키텍처 패턴 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 프런트엔드 일정 기능 경계와 공통 쓰기 흐름 통합

#### 선행 Task

- Task 1

#### 작업 목적

별도 내부 기능처럼 나뉜 `schedule-calendar`와 `schedule-create`의 계약·API·폼 책임을 하나의 캘린더 기능 경계로 정렬하고, 생성·수정 폼에서 중복된 타입·필드·대상·참석자 처리 로직을 재사용 가능한 단위로 통합한다.

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

#### 구현 항목

- [ ] Red: 캘린더 기능이 형제 `schedule-create` 내부 파일을 직접 import하지 않고 공개 진입점을 통해서만 사용한다는 구조 테스트를 먼저 추가하고 현재 교차 기능 import 때문에 실패함을 기록한다.
- [ ] Red: 일정 생성·수정의 필드 순서, 기본 공개 범위, 개인 일정 관계 제거, 팀·프로젝트 대상 Loading·Empty·Error, 참석자 선택·자동 인원 계산, 종일 시간 변환을 기존 컴포넌트·순수 함수 테스트로 고정한다.
- [ ] Green: 생성 화면과 캘린더 화면의 중복 `ScheduleType`, `ScheduleColorLabel`, 요청·응답 타입, 인증 요청 처리와 API 오류 변환을 캘린더 기능 내부의 단일 계약·API 경계로 통합한다.
- [ ] Green: 생성·수정이 함께 사용하는 초기값 생성, 상세 응답의 폼 값 변환, 요청 변환, 일정 유형 변경, 대상 선택, 참석자 동기화 및 공통 폼 필드를 재사용 가능한 모듈·컴포넌트로 추출한다.
- [ ] Green: `ScheduleCreateModal`과 수정 폼이 공통 쓰기 흐름을 사용하도록 바꾸고 기존 공개 진입점과 `App.tsx` 조립 코드를 정렬한다.
- [ ] Refactor: 이동이 끝난 `schedule-create` 내부 구현과 중복 타입·스타일·요청 코드를 제거하고, 기능 간 내부 경로 직접 참조와 순환 의존이 없도록 정리한다.
- [ ] 사용자에게 보이는 레이블, 필드 순서, Loading·Empty·Error·Permission 상태, 키보드·포커스·닫기 확인 동작과 API payload 의미를 변경하지 않는다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/schedule-calendar src/App.test.tsx`가 통과한다.
- [ ] `cd frontend && npm run typecheck`가 통과한다.
- [ ] `cd frontend && npm run lint`와 `cd frontend && npm run format:check`가 통과한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/calendar/attendee-policy-integration.cy.ts,cypress/e2e/calendar/schedule-target-name-selection.cy.ts,cypress/e2e/calendar/modal-dismissal.cy.ts'`가 통과한다.
- [ ] Red 실패, Green 통과, Refactor 후 재통과 결과를 Task 실행 기록에 남긴다.
- [ ] PC와 Mobile에서 생성·수정 폼의 필드 배치, 키보드 조작, 포커스 복귀 및 저장하지 않은 입력의 닫기 확인이 유지되는지 Cypress 결과로 확인한다.
- [ ] Task 1의 백엔드 수정 가능 경로와 충돌하는 변경이 없고 기존 일정 API 계약을 그대로 사용하는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 일정 생성·수정이 단일 계약·API·폼 모델을 사용하고 형제 기능 내부 파일 직접 import가 없어야 한다.
- 공통 폼 동작은 한 구현에서 관리되며 생성·수정별 차이는 명시적인 입력으로 표현되어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 단위 테스트, Type Check, Lint, Formatting 또는 Cypress 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 사용자 동작, 접근성, API payload 또는 오류 상태 의미 변경
- 생성·수정 테스트 삭제, 단언 약화 또는 Mock 계약 왜곡
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 캘린더 화면 레이아웃과 상세·취소 흐름의 구조 분리
- 일정 API 또는 DB 계약 변경
- 디자인 토큰과 전역 공통 UI 변경
- 새 상태 관리·폼·날짜·UI 라이브러리 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 캘린더 조회 화면과 모달 오케스트레이션 책임 분리 및 통합 검증

#### 선행 Task

- Task 2

#### 작업 목적

조회, URL 상태, 서버 상태, 월·주·일 표시, 날짜 패널, 상세·수정·취소 모달을 한 파일에서 처리하는 `ScheduleCalendar`를 사용자 흐름별 컴포넌트와 상태 조정 책임으로 분리해 읽기 쉽고 독립적으로 테스트 가능한 구조로 만든다.

#### 수정 가능 경로

- `frontend/src/features/schedule-calendar`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `frontend/src/App.tsx`
- `frontend/src/features/auth`
- `frontend/src/features/meeting-room`
- `frontend/src/shared`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend`

#### 구현 항목

- [ ] Red: 월·주 그리드, 일간 타임라인, 날짜 패널, 상세 모달, 수정 모달, 취소 확인의 공개 사용자 동작을 책임별 컴포넌트 테스트로 먼저 작성하고 추출 대상이 없어 실패함을 기록한다.
- [ ] Red: URL `view`·`date` 초기화와 이전·오늘·다음·브라우저 뒤로 가기, 조회 Loading·Empty·Error·Permission 상태, 상세 조회 실패 및 mutation 성공·실패의 캐시·포커스 결과를 회귀 테스트로 고정한다.
- [ ] Green: 캘린더 헤더·기간/보기 제어, 월·주 그리드, 일간 타임라인, 날짜별 패널, 상세 모달과 취소 확인을 각각 한 가지 주요 책임을 가진 컴포넌트로 추출한다.
- [ ] Green: URL 상태 동기화, 일정 목록·상세 Query, 수정·취소 Mutation과 Query cache 갱신을 UI 표현과 분리하되 기존 Query key 및 무효화 범위를 유지한다.
- [ ] Green: 상세 열기·닫기, 날짜 패널 닫기, 수정 전환, 일반 일정·회의실 예약 취소의 상태 전이와 트리거 포커스 복귀를 명시적인 이벤트와 props로 연결한다.
- [ ] Refactor: 중복 날짜 필터링·레이블·오류 메시지·스타일 상수를 적절한 모듈로 이동하고 `ScheduleCalendar`는 화면 조립과 흐름 조정만 담당하도록 정리한다.
- [ ] 월간·주간·일간 조회, 일정 상세·수정·취소, 회의실 예약 취소 위임, 반응형 표시와 접근성 동작을 변경하지 않는다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- src/features/schedule-calendar`가 통과한다.
- [ ] `cd frontend && npm run typecheck`가 통과한다.
- [ ] `cd frontend && npm run lint`와 `cd frontend && npm run format:check`가 통과한다.
- [ ] `cd frontend && npm run cy:run -- --spec 'cypress/e2e/calendar/calendar-display-contract.cy.ts,cypress/e2e/calendar/calendar-visual-refinement.cy.ts,cypress/e2e/calendar/modal-dismissal.cy.ts,cypress/e2e/calendar/room-reservation-cancellation.cy.ts'`가 통과한다.
- [ ] Red 실패, Green 통과, Refactor 후 재통과 결과를 Task 실행 기록에 남긴다.
- [ ] 월간·주간·일간 전환, 날짜 패널, 상세·수정·취소, 오류 재시도, PC·Mobile 및 키보드·포커스 흐름이 기존 Cypress 인수 조건을 유지하는지 확인한다.
- [ ] Task 2에서 통합한 일정 계약·API·공통 폼과 조회·상세·수정·취소 오케스트레이션이 충돌 없이 연결되고 기존 기능 회귀가 없는지 관련 단위 테스트와 Cypress로 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 추출된 각 UI 단위가 하나의 주요 책임을 가지며 `ScheduleCalendar`가 화면 조립과 흐름 조정 외의 대형 폼·표현 구현을 직접 포함하지 않아야 한다.
- 서버 상태, URL 상태와 로컬 모달 상태의 소유권이 코드에서 구분되고 기존 Query key·cache 무효화 계약이 유지되어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 단위 테스트, Type Check, Lint, Formatting 또는 Cypress 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 캘린더 조회·상세·수정·취소 동작, 반응형 UI 또는 접근성 회귀
- Query key, 캐시 갱신, 회의실 예약 취소 위임 계약 변경
- 테스트 삭제·단언 약화·검증 우회
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 신규 캘린더 기능 또는 UX 추가
- 일정 API, 인증·인가, DB 스키마와 Migration 변경
- 회의실 예약 기능 내부 리팩터링
- 전역 라우터·상태 저장소·디자인 시스템 도입 또는 교체

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
- 공개 API, DB 스키마, 인증·인가, 일정·회의실 예약 정책과 사용자 동작에 변경이 없어야 한다.
- 전체 Harness 검증의 Frontend Type Check·Lint·Formatting·Unit Test·Build·Calendar Cypress와 Backend Spotless·Test·Build가 통과해야 한다.
- 모든 Task에 `Red → Green → Refactor` 실행 증거가 남아야 한다.
- 전체 `quality_score`가 85 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 공개 API, DB, 보안·권한, 일정·회의실 예약 정책 또는 사용자 동작이 변경됨
- 테스트 삭제, 단언 약화 또는 검증 우회로 리팩터링을 통과시킴
- 남은 문제가 사용자 확인 없이 방치됨
