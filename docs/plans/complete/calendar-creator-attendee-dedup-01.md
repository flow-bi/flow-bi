# 작업 계획: calendar-creator-attendee-dedup-01

## 1. 기본 정보

### 사용자 요청

`등록자도 참석`을 선택한 상태에서 등록자 본인을 이름으로 검색해 참석자로 추가할 때 동일 인물이 등록자와 다른 참석자로 중복 추가되는 문제를 수정한다.

### 작업 목적

등록자의 참석 여부와 다른 참석자 목록을 분리한다는 Calendar 계약을 검색 단계부터 적용하여, 등록자 본인이 참석자 후보와 참석 인원에 중복 반영되지 않도록 한다.

### 작업 유형

- bugfix

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md` (`CAL-11-R4`, `CAL-11-R6`, `CAL-11-R7`)
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `없음`
- 기타 참고 문서: `backend/API.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 등록자 본인 참석자 후보 제외

#### 선행 Task

- `없음`

#### 작업 목적

인증된 등록자 본인은 별도의 `creatorAttends` 값으로 관리되므로 일정 참석자 검색 결과에서 제외하고, 동일한 이름을 가진 다른 활성 사용자는 정상적으로 검색되도록 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 인증 사용자의 이름으로 참석자를 검색했을 때 본인은 제외되지만 같은 이름의 다른 활성 사용자는 유지되는 실패 테스트를 Controller와 Repository/Service 책임에 맞게 작성하고 의도한 이유로 실패함을 기록한다.
- [ ] Green: Controller가 검증한 Actor ID를 참석자 검색 Use Case에 전달하고, 검색 Query가 해당 Actor ID만 제외하도록 최소 구현한다.
- [ ] Green: 기존 검색어 정규화, 활성 사용자 제한, 이름·사번 부분 일치, 최대 20건, 안정적 정렬과 최소 응답 필드 계약을 유지한다.
- [ ] Refactor: Actor 제외 책임이 Controller 또는 UI에 중복되지 않도록 검색 Service와 Repository 경계를 정리하고 관련 테스트를 다시 통과시킨다.
- [ ] `backend/API.md`의 일정 참석자 후보 검색 계약에 현재 인증 사용자는 등록자 참석 여부로 별도 관리되어 결과에서 제외된다는 규칙을 반영한다.

#### 검증 항목

- [ ] Red 단계에서 새 회귀 테스트가 현재 구현의 본인 포함 동작 때문에 실패하는지 확인한다.
- [ ] `./gradlew test --tests '*ScheduleAttendeeControllerTest' --tests '*ScheduleUserIntegrationTest'`를 `backend`에서 실행하여 본인 제외, 동명이인 유지, 기존 활성 상태·검색·응답 최소화 시나리오가 통과하는지 확인한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 수정과 동일 범위 재검증을 반복하고, 이후에도 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.
- [ ] 변경된 검색 응답 동작과 `backend/API.md` 계약이 일치하며 DB Schema, 인증 방식, 권한 모델에 변경이 없는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 검색 결과에서 Actor 본인만 제외되고 동명이인을 포함한 다른 유효 후보에는 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 대상 테스트 실패 또는 Red 단계 실패 원인 미확인
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 본인 외 사용자를 이름만으로 잘못 제외하거나 기존 검색·권한 계약을 약화함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- DB Schema 및 Migration 변경
- 인증 방식, 권한 모델 또는 개인정보 응답 범위 변경
- 회의실 예약 참석자 검색 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 등록자 중복 추가 사용자 흐름 통합 검증

#### 선행 Task

- `Task 1`

#### 작업 목적

일정 생성 화면에서 `등록자도 참석`을 선택한 뒤 본인 이름을 검색해도 본인이 다른 참석자로 추가되지 않고 자동 참석 인원이 1명으로 유지되는 실제 브라우저 흐름을 회귀 테스트로 고정한다.

#### 수정 가능 경로

- `frontend/cypress/e2e/calendar`

#### 수정 금지 경로

- `frontend/src`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: 구성된 Cypress 통합 환경에서 팀 또는 프로젝트 일정 생성 모달을 열고 `등록자도 참석` 선택 후 본인 이름을 검색하면 현재 구현에서는 본인이 후보로 노출되어 중복 추가 가능한 문제를 재현하는 실패 테스트를 작성한다.
- [ ] Green: Task 1의 실제 참석자 검색 API를 사용하는 동일 시나리오에서 본인 추가 버튼이 노출되지 않고 다른 동명이인 후보는 구분되어 추가할 수 있음을 검증한다.
- [ ] Green: 저장 직전 자동 참석 인원이 1명이고 요청의 `creatorAttends`는 `true`, `participantIds`에는 등록자 ID가 없음을 검증한다.
- [ ] Refactor: 기존 Calendar Cypress 지원 코드와 selector를 재사용하고 Desktop 1280×800 및 Mobile 390×844 중 해당 흐름의 기존 검증 범위를 훼손하지 않도록 테스트를 정리한다.

#### 검증 항목

- [ ] Red 단계에서 새 Cypress 시나리오가 본인 후보 노출 또는 참석 인원 2명 표시 때문에 실패하는지 확인한다.
- [ ] `npx cypress run --spec 'cypress/e2e/calendar/attendee-policy-integration.cy.ts'`를 `frontend`에서 실행하여 등록자 본인 제외와 다른 참석자 추가 흐름이 통과하는지 확인한다.
- [ ] Task 1의 본인 제외 API 계약과 Calendar 생성 화면의 검색·자동 인원 계산·저장 요청 사이에 충돌이나 회귀가 없는지 실제 통합 흐름으로 확인한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 테스트 Fixture가 아닌 제품 동작 원인을 수정하고 동일 범위 재검증을 반복하며, 이후에도 실패하면 우회하지 않고 원인과 남은 문제를 기록한다.
- [ ] 키보드로 등록자 참석 체크박스와 참석자 검색에 접근할 수 있고 390×844 화면에서 문서 가로 overflow가 없는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 등록자 본인은 다른 참석자로 추가되지 않고 등록자 참석 여부를 통해 정확히 한 번만 계산되어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- Cypress 회귀 테스트 실패 또는 Red 단계 실패 원인 미확인
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Mock으로 본인 후보를 임의 제거해 실제 API 회귀를 가리거나 동명이인을 함께 제거함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Calendar 생성·수정 화면의 디자인 변경
- 참석자 검색 Loading·Empty·Error·Permission UI의 전면 개편
- 회의실 예약 참석자 흐름 변경

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
- `CAL-11-R4`, `CAL-11-R6`, `CAL-11-R7`과 실제 검색·계산·표시 동작이 일치해야 한다.
- Harness 실행기가 전체 Frontend/Backend lint, test, build 품질 게이트를 통과시켜야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 본인 제외를 이름 문자열 비교로 구현하여 동명이인을 누락함
- 남은 문제가 사용자 확인 없이 방치됨
