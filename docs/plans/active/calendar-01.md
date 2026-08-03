# 작업 계획: calendar-01

## 1. 기본 정보

### 사용자 요청

캘린더 MVP 기능 구현을 위한 실행 계획을 작성한다.

### 작업 목적

인증된 사용자가 권한 범위 안에서 개인·팀·프로젝트 일정을 월간·주간·일간으로 조회하고, 일정 상세 확인과 등록·수정·삭제를 수행할 수 있는 캘린더 MVP를 구현한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 권한 기반 일정 기간 조회 및 상세 API 구현

#### 선행 Task

- 없음

#### 작업 목적

FR-011~FR-013에 따라 인증 사용자가 접근 가능한 활성 일정을 기간으로 조회하고 개별 상세를 확인할 수 있는 Schedule 도메인 기반을 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `frontend`
- `docs`
- `backend/src/main/resources`
- `backend/build.gradle`

#### 구현 항목

- [ ] 기간 경계, 일정 유형, 공개 범위, 색상 라벨, 종일 여부, 상세, 공유 대상, 참석자 및 등록자 참석 여부를 표현하는 일정 도메인·DTO·Repository 계약의 실패 테스트를 먼저 작성한다.
- [ ] `GET /api/schedules?from=&to=`와 `GET /api/schedules/:scheduleId`가 필요한 최소 Controller·Service·Repository·Entity 계층을 구현한다.
- [ ] 개인 일정은 작성자와 참석자, 팀 일정은 연결 팀 소속 사용자와 참석자, 프로젝트 일정은 연결 프로젝트 참여자와 참석자에게만 노출하고 인증 주체가 없으면 기본 거부한다.
- [ ] 시작·종료 경계가 조회 기간과 겹치는 일정만 반환하고 회의실 예약에서 취소된 연결 일정은 기본 조회에서 제외한다.
- [ ] 목록 응답은 화면에 필요한 최소 정보만, 상세 응답은 위치·설명·공개 범위·참석자 정보를 권한 범위 안에서 반환하며 내부 예외나 불필요한 개인정보를 노출하지 않는다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `./gradlew test --tests '*Schedule*Query*Test'`로 기간 겹침, 월·주·일 경계, 빈 결과와 취소 일정 제외를 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Authorization*Test'`로 미인증, 유형별 조회 권한과 다른 일정 ID를 이용한 IDOR 차단을 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Detail*Test'`로 상세 응답과 존재하지 않거나 접근 불가한 일정의 안전한 오류를 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 인증 주체가 없거나 권한이 없는 일정이 노출됨
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- 인증·토큰 정책 자체 구현
- 회의실 예약 생성·수정·취소와 알림 발송 구현
- DB Migration 및 Initial Baseline 스키마 변경

#### 작업 결과

`none`

#### 남은 문제

- 현재 저장소에 인증 구현과 사용자·팀·프로젝트 소속 조회 구현이 없으므로, 승인된 인증 컨텍스트가 제공되지 않으면 보호 API는 기본 거부 상태를 유지하고 통합 차단 사유를 기록한다.
- 색상 라벨, 종일 일정 및 참석자 저장 구조가 Initial Baseline 스키마의 검토 대기 항목이므로 스키마 변경이 필요하면 구현을 중단하고 사람의 승인을 요청한다.

---

### Task 2. 일정 등록 API 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

FR-014~FR-016에 따라 인증 사용자가 일정 유형별 공개 규칙과 참석자 규칙을 지키며 일정을 등록할 수 있게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `frontend`
- `docs`
- `backend/src/main/resources`
- `backend/build.gradle`

#### 구현 항목

- [ ] 일정 등록 정상·실패 시나리오의 Service 및 API 실패 테스트를 먼저 작성한다.
- [ ] `POST /api/schedules`에서 유형, 제목, 날짜·시간, 종일 여부, 위치, 공개 범위, 색상 라벨, 참석자, 등록자 참석 여부와 상세 설명을 검증하고 저장한다.
- [ ] `PERSONAL`, `TEAM`, `PROJECT` 중 정확히 하나의 유형만 허용하고 각각 비공개, 팀 공개, 프로젝트 공개를 기본값으로 적용한다.
- [ ] 팀 일정에는 접근 가능한 팀 대상, 프로젝트 일정에는 참여 중인 프로젝트 대상이 하나 이상 존재하도록 검증하고 유형과 맞지 않는 대상 조합을 거부한다.
- [ ] 참석자는 접근 가능한 활성 사내 사용자만 허용하며 중복을 제거하고 등록자 참석 여부를 반영해 참석 인원을 서버에서 계산한다.
- [ ] `startAt < endAt`, 허용 색상과 필수 입력을 검증하고 생성 전체를 하나의 트랜잭션으로 처리하며 실패 시 일부 데이터가 남지 않게 한다.
- [ ] 중요 일정 생성 감사 이벤트에는 사용자, 시간, 대상, 결과만 남기고 일정 상세나 개인정보를 과도하게 기록하지 않는다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `./gradlew test --tests '*Schedule*Create*Test'`로 유형별 정상 등록, 기본 공개 범위, 종일·시간 일정, 색상 및 참석 인원 계산을 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Validation*Test'`로 잘못된 시간, 유형·대상 조합, 허용되지 않은 대상·참석자 거부와 중복 참석자 ID의 서버 중복 제거를 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Transaction*Test'`로 상세·대상·참석자 저장 실패 시 Rollback을 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Authorization*Test'`로 요청의 등록자 ID를 신뢰하지 않고 인증 주체를 등록자로 사용하는지 검증한다.
- [ ] 이 Task의 생성 계약과 저장 모델이 선행 Task의 조회·상세 계약과 충돌하지 않는지 생성 직후 조회 시나리오로 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 실제 인증·사용자·팀·프로젝트 어댑터가 아직 제공되지 않은 경우에도 기본 거부 구현과 허용·거부 테스트 어댑터로 인증 주체, 대상 접근성 및 활성 사용자 경계를 검증하면 이 Task를 차단하지 않는다.
- 모든 Mandatory Gate와 검증이 통과하면 실제 어댑터 미제공만을 이유로 `BLOCKED`, `HUMAN_REVIEW_REQUIRED` 또는 `PASS_WITH_FOLLOW_UP`으로 낮추지 않고 `PASS`로 판정한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 입력 사용자 ID를 인증 사용자로 신뢰하거나 일부 저장 데이터가 남음
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- 사내 사용자·팀·프로젝트 관리 기능 구현
- 회의실 예약과 일정의 동시 생성
- 알림 생성과 발송
- 새로운 외부 서비스 또는 의존성 도입

#### 작업 결과

`none`

#### 남은 문제

- 실제 인증·사용자·팀·프로젝트 어댑터 연결은 후속 통합 범위다. 이 Task에서는 기본 거부 구현과 계약에 맞는 테스트 어댑터로 허용·거부 경계를 검증하며, 해당 검증이 통과하면 실제 어댑터 미제공은 비차단 조건으로 기록한다.

---

### Task 3. 일정 수정 및 삭제 API 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

FR-017~FR-018에 따라 일정 소유자가 일반 일정을 안전하게 수정하고 삭제할 수 있게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `frontend`
- `docs`
- `backend/src/main/resources`
- `backend/build.gradle`

#### 구현 항목

- [ ] 일정 수정·삭제의 소유권, 입력 검증, 트랜잭션 및 회귀 시나리오 실패 테스트를 먼저 작성한다.
- [ ] `PUT /api/schedules/:scheduleId`에서 등록 권한 규칙과 동일하게 유형·시간·대상·참석자·공개 범위·색상·상세를 검증하고 원자적으로 수정한다.
- [ ] `DELETE /api/schedules/:scheduleId`에서 등록자 소유권을 확인하고 일반 일정을 `CANCELED` 상태로 전환하며 취소 시각과 취소 주체를 기록한다.
- [ ] 취소된 일정의 상세·대상·참석자 관계를 보존하고 기본 목록·상세 조회에서 제외하며 등록자의 반복 삭제 요청에는 `204 No Content`를 반환한다.
- [ ] 회의실 예약과 연결된 일정의 예약 관련 정보는 캘린더 수정·삭제 대상에서 제외하고 회의실 예약 흐름을 사용하도록 안전한 오류를 반환한다.
- [ ] 존재 여부와 권한 여부를 과도하게 구분해 다른 사용자의 일정 존재를 노출하지 않고 IDOR를 차단한다.
- [ ] 중요 일정 수정·삭제 감사 이벤트에 변경 주체, 대상, 결과를 기록하되 민감한 상세 값은 남기지 않는다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `./gradlew test --tests '*Schedule*Update*Test'`로 정상 수정, 유형 전환 규칙, 참석 인원 재계산과 실패 시 Rollback을 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Delete*Test'`로 일반 일정의 취소 상태 전환, 이력 관계 보존, 반복 요청, 회의실 연결 일정 보호와 취소 후 기본 조회 제외를 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Authorization*Test'`로 미인증, 비소유자와 다른 객체 ID에 대한 수정·삭제 거부를 검증한다.
- [ ] 이 Task의 변경 동작이 선행 Task의 등록·조회 권한과 충돌하지 않는지 수정 전후 및 삭제 후 조회 시나리오로 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 비소유자 변경, 회의실 연결 일정 직접 변경 또는 승인되지 않은 물리 삭제 발생
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- 회의실 예약 일정의 예약 정보 수정·취소
- 삭제 데이터 복구 UI와 감사 로그 조회 UI
- 알림 취소 처리
- DB Migration과 Initial Baseline ERD 변경

#### 작업 결과

`none`

#### 남은 문제

- 취소 상태를 실제 영속 Schema에 반영하는 Migration은 별도 Schema Review와 승인된 Plan이 필요하다. 이 Task에서는 물리 삭제나 Initial Baseline 변경을 수행하지 않는다.

---

### Task 4. 월간·주간·일간 캘린더 조회 화면 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

FR-011~FR-013에 따라 첫 화면을 월간 캘린더로 제공하고 사용자가 월간·주간·일간 보기를 전환하며 접근 가능한 일정을 탐색할 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/src/App.tsx`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `docs`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`

#### 구현 항목

- [ ] 월간 첫 화면, 보기 전환, 기간 이동, 일정 표시와 주요 상태를 사용자 관찰 동작으로 표현한 Cypress 실패 테스트를 먼저 작성한다.
- [ ] 캘린더 페이지와 기능별 API·타입·조회 상태를 `pages`와 `features/calendar` 책임에 맞춰 구현한다.
- [ ] 월간·주간·일간 기간을 계산해 기간 조회 API를 호출하고 이전·다음 기간 및 오늘 이동을 제공한다.
- [ ] 일정 제목, 시간, 유형과 색상 라벨을 표시하되 색상만으로 의미를 전달하지 않고 날짜·시간의 텍스트 대체 접근 경로를 제공한다.
- [ ] Loading, Empty, Error, Permission, 인증 만료 상태와 재시도 동작을 명시적으로 제공한다.
- [ ] 데스크톱과 모바일에서 핵심 탐색이 가능하고 모든 보기 전환·날짜·일정 요소를 키보드로 조작할 수 있게 한다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `npm run test:e2e -- --spec 'cypress/e2e/calendar/calendar-views.cy.*'`로 월간 기본값, 월·주·일 전환, 기간 이동과 일정 표시를 검증한다.
- [ ] 같은 Cypress Spec에서 Loading, Empty, Error, Permission 및 재시도 상태를 API 계약과 일치하는 응답으로 검증한다.
- [ ] 같은 Cypress Spec에서 키보드 탐색, 접근 가능한 이름과 데스크톱·모바일 핵심 흐름을 검증한다.
- [ ] `npm run typecheck`로 캘린더 API와 화면 타입을 정적 검증한다.
- [ ] 이 Task의 기간 계산과 응답 변환이 선행 Task의 조회 API 계약과 충돌하지 않는지 Cypress 요청·응답 단언으로 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Type Check 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- Mock 응답이 실제 Schedule API 계약과 다름
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 확정되지 않은 날짜·캘린더 UI 라이브러리 도입
- 전역 Layout, Navigation과 디자인 토큰 재설계
- 일정 등록·수정·삭제 상호작용

#### 작업 결과

`none`

#### 남은 문제

- Router와 날짜 처리 라이브러리가 미확정이므로 새 의존성을 도입하지 않고 현재 앱 진입점과 표준 날짜 API 범위에서 구현한다.

---

### Task 5. 날짜별 일정 배너 및 일정 상세 모달 구현

#### 선행 Task

- `Task 4`

#### 작업 목적

선택한 날짜의 일간 일정을 우측 배너에 표시하고 일정 선택 시 권한 범위 내 상세 정보를 모달로 제공한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `docs`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`

#### 구현 항목

- [ ] 날짜 선택, 일간 배너, 상세 모달과 접근성 상태를 표현한 Cypress 실패 테스트를 먼저 작성한다.
- [ ] 날짜 선택 시 해당 날짜의 접근 가능한 일정을 시간순으로 우측 배너에 표시하고 작은 화면에서는 Overlay 또는 전체 화면으로 전환한다.
- [ ] 일정 선택 시 제목, 유형, 공개 범위, 날짜·시간, 종일 여부, 위치, 색상, 참석자 수·목록, 등록자 참석 여부와 설명을 상세 API 결과로 표시한다.
- [ ] 상세 Loading, Error, Permission 상태와 재시도를 제공하고 접근 불가 데이터나 불필요한 개인정보를 남은 화면 상태에 유지하지 않는다.
- [ ] 모달의 제목·닫기 수단·초기 포커스·Focus Trap·Escape 닫기·이전 포커스 복귀를 구현한다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `npm run test:e2e -- --spec 'cypress/e2e/calendar/calendar-detail.cy.*'`로 날짜 선택, 배너 정렬, 상세 조회와 모바일 Overlay를 검증한다.
- [ ] 같은 Cypress Spec에서 상세 Loading, Error, Permission, 재시도와 민감 데이터 잔존 방지를 검증한다.
- [ ] 같은 Cypress Spec에서 모달 키보드 조작, Focus Trap, Escape 및 포커스 복귀를 검증한다.
- [ ] `npm run typecheck`로 상세 API와 화면 모델의 계약 일치를 정적 검증한다.
- [ ] 이 Task의 날짜 선택과 상세 상태가 선행 Task의 캘린더 기간·보기 상태와 충돌하지 않는지 동일 화면 전환 시나리오로 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Type Check 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 접근 불가 상세나 개인정보 노출
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 상세 모달에서 회의실 예약 정보 직접 수정
- 알림 설정과 참석 응답 기능
- 등록·수정 폼 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 6. 일정 참석자 후보 검색 API 계약 및 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

FR-015에 따라 일정 등록·수정 화면이 접근 가능한 활성 사내 사용자를 최소 개인정보로 검색할 수 있는 참석자 후보 API를 제공한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/resources`
- `backend/build.gradle`
- `backend/DB_SCHEMA.md`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] 인증, 검색어 경계, 최소 응답 필드, 활성·접근 가능 사용자 필터와 빈 결과의 실패 테스트를 먼저 작성한다.
- [ ] `GET /api/schedules/attendee-candidates?query=` Controller·Service·Reader 계약과 최소 응답 DTO를 구현한다.
- [ ] 검색어는 공백을 정규화한 1~50자로 제한하고 결과는 최대 20건으로 제한한다.
- [ ] 응답에는 `userId`, `displayName`만 포함하고 이메일·전화번호 등 불필요한 개인정보를 노출하지 않는다.
- [ ] 인증 주체가 없으면 기본 거부하고 비활성·퇴사·접근 불가 사용자는 결과에서 제외한다.
- [ ] 실제 조직 저장소 어댑터가 없는 기본 구성은 사용자 정보를 추측하지 않고 빈 Reader를 사용한다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `./gradlew test --tests '*Schedule*AttendeeCandidate*Test'`로 인증, 검색어 경계, 결과 제한, 최소 응답과 빈 결과를 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Authorization*Test'`로 기존 일정 권한 경계에 회귀가 없는지 검증한다.
- [ ] `./gradlew test --tests '*Schedule*Create*Test' --tests '*Schedule*Validation*Test'`로 검색 결과의 사용자 ID를 최종 생성 시 서버가 다시 검증하는지 확인한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 실제 조직 저장소 어댑터가 아직 제공되지 않아도 기본 거부·빈 Reader와 계약 기반 허용·거부 테스트가 통과하면 비차단으로 판정한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 비활성·접근 불가 사용자 또는 불필요한 개인정보 노출
- 인증 주체 없이 후보 검색 성공
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- 직원 관리·등록·수정 기능
- 조직 저장소와 DB Schema 구현
- 이메일·전화번호 등 추가 개인정보 검색
- 인증·토큰 정책 자체 구현

#### 작업 결과

`none`

#### 남은 문제

- 실제 조직 저장소 어댑터 연결은 후속 통합 범위다. 이 Task에서는 기본 거부·빈 Reader와 계약 기반 테스트 어댑터로 API 및 개인정보 경계를 검증한다.

---

### Task 7. 일정 등록 모달 구현 및 API 연동

#### 선행 Task

- `Task 2`
- `Task 5`
- `Task 6`

#### 작업 목적

FR-014~FR-016에 따라 사용자가 모달에서 일정 정보를 입력하고 검증된 일반 일정을 등록할 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `docs`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`

#### 구현 항목

- [ ] 모달 열기, 필드 검증, 참석자 선택, 제출 성공·실패와 포커스 동작을 표현한 Cypress 실패 테스트를 먼저 작성한다.
- [ ] React Hook Form과 Zod로 일정 유형, 제목, 날짜, 시작·종료 시간, 종일, 위치, 공개 범위, 색상, 참석자, 등록자 참석 여부와 상세 설명 입력을 구현한다.
- [ ] 유형 선택 시 확정된 기본 공개 범위를 표시하고 유형에 맞는 팀·프로젝트 대상만 입력받되 서버 검증을 대체하지 않는다.
- [ ] 사내 사용자 검색 결과에서 참석자를 추가·제거하고 중복 선택을 막으며 등록자 참석 여부를 포함한 참석 인원을 자동 표시한다.
- [ ] 필드별 오류를 Label 및 도움말과 연결하고 제출 중 중복 요청을 방지하며 서버 오류를 성공이나 빈 데이터로 위장하지 않는다.
- [ ] 생성 성공 후 영향받는 기간 조회만 갱신하고 모달을 닫아 생성된 일정을 캘린더에 표시한다.
- [ ] 저장되지 않은 입력이 있으면 닫기 전 확인하고 닫힌 뒤 이전 포커스로 복귀시킨다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `npm run test:e2e -- --spec 'cypress/e2e/calendar/calendar-create.cy.*'`로 유형별 등록, 기본 공개 범위, 종일·시간 입력, 색상과 참석 인원 계산을 검증한다.
- [ ] 같은 Cypress Spec에서 필수값·시간 범위·대상·참석자 검증, 중복 제출 방지와 서버 오류 복구를 검증한다.
- [ ] 같은 Cypress Spec에서 모달 Focus Trap, 저장되지 않은 입력 확인과 포커스 복귀를 검증한다.
- [ ] `npm run typecheck`로 Form Schema와 생성 API 계약의 일치를 정적 검증한다.
- [ ] 이 Task의 생성 성공 후 Query 갱신이 선행 Task의 목록·배너·상세 상태와 충돌하지 않는지 Cypress 시나리오로 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Type Check 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 클라이언트가 등록자 신원이나 최종 권한을 결정함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 회의실 예약 생성
- AI 자연어 일정 생성
- 일정 알림 정책 설정

#### 작업 결과

`none`

#### 남은 문제

- 실제 조직 저장소 어댑터가 연결되지 않은 환경에서는 참석자 후보가 빈 결과일 수 있으나, Task 6의 확정 API 계약과 Cypress 응답으로 검색·선택 경계를 검증한다.

---

### Task 8. 일정 수정 및 삭제 사용자 흐름 구현

#### 선행 Task

- `Task 3`
- `Task 7`

#### 작업 목적

FR-017~FR-018에 따라 권한 있는 사용자가 상세 화면에서 일반 일정을 수정하거나 확인 후 삭제할 수 있게 한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `docs`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/index.css`

#### 구현 항목

- [ ] 일정 수정·삭제의 권한별 버튼, Form 초기화, 성공·실패, 확인 절차와 포커스 동작을 표현한 Cypress 실패 테스트를 먼저 작성한다.
- [ ] 서버가 반환한 변경 권한에 따라 수정·삭제 행동을 제공하고 UI 숨김을 서버 인가의 대체 수단으로 사용하지 않는다.
- [ ] 수정 모달을 상세 값으로 초기화하고 등록과 동일한 입력·유형·대상·참석자 검증을 적용한다.
- [ ] 수정 성공 후 영향받는 기간과 상세 Query를 갱신하고 실패 시 기존 유효 데이터를 유지하며 재시도 수단을 제공한다.
- [ ] 삭제는 대상 일정과 영향을 명시한 확인 Dialog를 거친 뒤 요청하고, 성공 후 목록·배너·상세 상태에서 제거한다.
- [ ] 회의실 예약 연결 일정에는 캘린더 직접 수정·삭제 대신 변경 불가 사유를 표시한다.
- [ ] 모달과 확인 Dialog의 키보드 조작, Focus Trap, Escape 처리와 이전 포커스 복귀를 구현한다.
- [ ] Red → Green → Refactor 각 단계의 실행 명령과 결과를 Harness 실행 기록에 남긴다.

#### 검증 항목

- [ ] `npm run test:e2e -- --spec 'cypress/e2e/calendar/calendar-update-delete.cy.*'`로 수정 초기값, 정상 수정, Query 갱신과 실패 복구를 검증한다.
- [ ] 같은 Cypress Spec에서 삭제 확인·취소·성공·실패, 중복 요청 방지와 목록 제거를 검증한다.
- [ ] 같은 Cypress Spec에서 비소유자 및 회의실 연결 일정의 변경 차단과 서버 권한 오류 처리를 검증한다.
- [ ] 같은 Cypress Spec에서 수정 모달과 삭제 Dialog의 키보드·포커스 동작을 검증한다.
- [ ] `npm run typecheck`로 수정·삭제 API와 화면 상태의 계약 일치를 정적 검증한다.
- [ ] 이 Task의 수정·삭제 후 상태 갱신이 선행 Task의 등록·조회·상세 흐름과 충돌하지 않는지 Cypress 시나리오로 검증한다.
- [ ] 구현 문제로 실패하면 최대 3회까지 수정·재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 Type Check 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 파괴적 행동의 확인 절차 누락 또는 권한 없는 변경 성공
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 85 미만

#### 제외 범위

- 삭제된 일정 복구 화면
- 회의실 예약 수정·취소 화면
- 일정 변경·삭제 알림 생성

#### 작업 결과

`none`

#### 남은 문제

- 일반 일정 삭제 성공은 `204 No Content`로 처리하고, 취소된 일정이 목록·배너·상세 상태에서 제거되는지 검증한다.

---

### Task 9. 캘린더 전체 통합 검증 시나리오 구현

#### 선행 Task

- `Task 8`

#### 작업 목적

월간 첫 진입부터 일정 조회·상세·등록·수정·삭제까지 이어지는 핵심 사용자 흐름을 하나의 Cypress 회귀 시나리오로 고정하고 프런트엔드와 Schedule API 계약의 통합 상태를 검증한다.

#### 수정 가능 경로

- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `backend`
- `docs`
- `frontend/src`
- `frontend/package.json`
- `frontend/package-lock.json`

#### 구현 항목

- [ ] 인증된 사용자가 월간 캘린더에서 일정을 등록하고 주간·일간 보기 및 상세에서 확인한 뒤 수정·삭제하는 전체 Cypress 실패 시나리오를 먼저 작성한다.
- [ ] 개인·팀·프로젝트 일정의 공개 범위와 참석자 표시가 Schedule API 계약과 일치하는 통합 회귀 시나리오를 작성한다.
- [ ] 비소유자와 접근 권한이 없는 사용자가 일정 상세·수정·삭제를 수행할 수 없는 보안 회귀 시나리오를 작성한다.
- [ ] Loading, Empty, Error, Permission, 모바일 화면과 키보드 포커스의 대표 경로를 전체 흐름에서 검증한다.
- [ ] 통합 시나리오가 제품 코드 결함으로 실패하면 최대 3회까지 해당 원인을 기록해 담당 Task 재시도를 요청하고 테스트 단언이나 계약을 약화하지 않는다.

#### 검증 항목

- [ ] `npm run test:e2e -- --spec 'cypress/e2e/calendar/calendar-integration.cy.*'`로 선행 Task가 제공한 조회·상세·등록·수정·삭제 흐름의 통합과 충돌 여부를 검증한다.
- [ ] 같은 Cypress Spec에서 유형별 공개 범위, 참석자 계산, 비소유자 및 IDOR 차단 응답이 화면에 안전하게 반영되는지 검증한다.
- [ ] 같은 Cypress Spec에서 데스크톱·모바일 및 키보드 핵심 흐름의 회귀가 없는지 검증한다.
- [ ] Cypress가 실제 API 계약과 다른 Mock 또는 성공 고정 응답으로 결함을 숨기지 않는지 검토한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 통합 테스트 실패
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec과 다른 통합 동작 구현
- Mock 또는 단언 약화로 실제 계약·권한 오류를 우회함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 90 미만

#### 제외 범위

- 제품 코드 수정
- 전체 Lint, Test, Build 재실행
- 회의실 예약·알림·AI 비서 흐름 통합

#### 작업 결과

`none`

#### 남은 문제

- 실제 인증 컨텍스트가 제공되지 않은 경우 승인된 API 계약과 기본 거부 동작을 반영한 테스트 어댑터 또는 Cypress intercept로 인증·권한 경계를 검증한다. 계약 불일치나 권한 우회가 없고 모든 Mandatory Gate와 검증이 통과하면 실제 어댑터 미제공은 비차단 조건으로 기록한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- FR-011~FR-018과 캘린더 Product Spec의 월·주·일 조회, 상세, 등록, 수정 및 삭제 흐름이 추적 가능해야 한다.
- 유형별 공개 범위, 소유권, 참석자 및 IDOR 방지 규칙이 백엔드에서 검증되어야 한다.
- 프런트엔드의 Loading, Empty, Error, Permission, 인증 만료, 반응형 및 키보드 접근성 상태가 검증되어야 한다.
- 모든 Task 완료 후 Harness 실행기가 `frontend`에서 `npm run check`와 `npm run test:e2e`를 실행해 통과해야 한다.
- 모든 Task 완료 후 Harness 실행기가 `backend`에서 `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`를 실행해 통과해야 한다.
- API 또는 DB 계약 변경이 필요해지면 승인 문서와 동기화하기 전 완료 처리하지 않아야 한다.
- 실제 인증·사용자·팀·프로젝트 어댑터 미제공은 기본 거부 구현과 계약 기반 테스트 어댑터로 권한 경계를 검증한 경우 전체 완료를 차단하지 않는다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 인증·인가 우회, IDOR, 민감정보 노출 또는 승인되지 않은 데이터 삭제가 발생함
- TDD Red → Green → Refactor 증거가 누락되거나 테스트 단언이 약화됨
- DB Initial Baseline 또는 API 계약 변경이 사람의 승인과 문서 동기화 없이 수행됨
- 남은 문제가 사용자 확인 없이 방치됨
- 전체 `quality_score`가 90 미만
