# 작업 계획: calendar

## 1. 기본 정보

### 사용자 요청

$harness-plan calendar 만들어줘

### 작업 목적

`docs/product-specs/calendar.md`를 기준으로 일정 관리 기능 구현 전에 작업 범위, 담당 Worker, 검증 기준, 제외 범위를 명확히 정의한다. 캘린더 조회, 일정 상세 조회, 일정 등록/수정/삭제, 일정 공유 대상 처리, 회의실 예약으로 생성된 일정 표시가 Product Spec 및 관련 Design Doc과 충돌하지 않도록 activePlan을 만든다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`, `docs/design-docs/core-beliefs.md`
- Architecture: `docs/references/architecture.md`
- 기타 참고 문서: `docs/references/requirements.md`, `docs/references/ui-ux-spec.md`, `docs/references/database.md`

### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`
- `frontend/src`

### 수정 금지 경로

- `docs/references`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans/_template.md`
- `backend/src/main/java/com/flowbi/domain/room`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/java/com/flowbi/domain/team`
- `backend/src/main/java/com/flowbi/domain/project`
- `backend/src/main/resources/db`
- `frontend/node_modules`
- `frontend/dist`

---

## 2. 실행 Task

### Task 1. Backend 일정 도메인 구현

#### 담당 Worker

`backend-worker`

#### 선행 Task

- `없음`

#### 작업 목적

일정 관리 Product Spec의 데이터 흐름을 기준으로 월간/주간/일간 조회, 일정 상세 조회, 일정 등록/수정/삭제를 처리할 수 있는 backend schedule 도메인 책임을 구현한다.

#### 구현 항목

- [ ] 일정 기본 정보와 상세 정보, 공유 대상 정보를 Product Spec 범위 안에서 표현한다.
- [ ] 월간/주간/일간 기준으로 사용자가 볼 수 있는 일정 조회 흐름을 구현한다.
- [ ] 날짜 선택 및 일정 선택에 필요한 일자별 일정 조회와 상세 조회 응답을 제공한다.
- [ ] 일정 등록 시 제목, 날짜/시간, 위치, 일정 유형, 공개 범위, 참석자, 상세 설명을 처리한다.
- [ ] 일정 수정/삭제는 등록자 기준 변경 가능 조건을 반영한다.
- [ ] 회의실 예약으로 생성된 일정이 캘린더에 표시될 수 있도록 schedule 도메인 조회 모델에서 식별 가능한 범위를 마련한다.

#### 검증 항목

- [ ] `(backend) ./gradlew spotlessCheck`
- [ ] `(backend) ./gradlew test`
- [ ] `(backend) ./gradlew build`
- [ ] Product Spec의 In Scope와 Out of Scope를 대조한다.
- [ ] `docs/design-docs/schedule-and-notification.md`의 미확정 정책을 임의로 확정하지 않았는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않아야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 일정 조회 응답 시간 요구사항(NFR-003)을 해치지 않는 구조여야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 금지 경로 변경
- 요구사항과 다른 동작 구현
- 공개 범위, 색상 라벨, 참석자 정책을 문서 근거 없이 확정함
- 회의실 예약, AI, 알림 기능을 schedule 도메인 안에서 직접 구현함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 회의실 예약 생성/수정/취소 구현
- 예약 수정/취소 시 연결된 일정과 알림 처리의 세부 정책 확정
- AI 자연어 일정 생성 구현
- 알림 발송 구현
- Product Spec에 없는 공개 범위 값, 색상 라벨 선택지, 참석자 정책 임의 확정

#### 작업 결과

`none`

#### 남은 문제

- 공개 범위 값의 정확한 종류와 일정 유형 값의 관계는 구현 전에 사람 검증이 필요하다.
- 참석 인원과 참석자 목록의 관계는 구현 전에 사람 검증이 필요하다.
- 회의실 예약과 연결된 일정의 수정 및 취소 정책 세부 범위는 `docs/design-docs/schedule-and-notification.md`의 미확정 사항을 따른다.

---

### Task 2. Frontend 캘린더 화면 구현

#### 담당 Worker

`frontend-worker`

#### 선행 Task

- `Task 1`

#### 작업 목적

사용자가 월간/주간/일간 캘린더를 전환하고, 날짜별 일정 배너와 일정 상세/추가 모달을 통해 Product Spec에 정의된 일정 관리 작업을 수행할 수 있도록 frontend 화면 책임을 구현한다.

#### 구현 항목

- [ ] 첫 화면을 월간 캘린더 기준으로 구성한다.
- [ ] 월간/주간/일간 캘린더 보기 전환을 제공한다.
- [ ] 날짜 클릭 시 해당 날짜의 일간 일정 우측 배너를 표시한다.
- [ ] 일정 클릭 시 일정 상세 모달을 표시한다.
- [ ] 일정 추가 모달에 일정 타입, 제목, 날짜, 시작/종료 시간, 하루종일, 위치, 일정 유형, 공개 범위, 색상 라벨, 참석자, 상세 설명 입력을 포함한다.
- [ ] 일정 조회/등록/수정/삭제 흐름을 backend schedule 도메인과 연결한다.
- [ ] 회의실 예약으로 생성된 일정은 캘린더에서 조회 가능한 일정으로 표시하되 회의실 예약 UI는 구현하지 않는다.

#### 검증 항목

- [ ] `(frontend) npm run typecheck`
- [ ] `(frontend) npm run lint`
- [ ] `(frontend) npm run build`
- [ ] PC 및 모바일 환경에서 월간/주간/일간 캘린더, 우측 배너, 모달 구성이 깨지지 않는지 확인한다.
- [ ] Product Spec에 없는 색상 라벨 선택지나 공개 범위 정책을 UI에서 임의로 확정하지 않았는지 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않아야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- PC 및 모바일 환경에서 주요 일정 관리 화면을 사용할 수 있어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 금지 경로 변경
- 요구사항과 다른 동작 구현
- 화면 구성 요소가 모바일 또는 데스크톱에서 겹치거나 사용할 수 없음
- 미확정 색상 라벨 또는 공개 범위 값을 임의 정책으로 확정함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 회의실 목록/예약 현황 UI 구현
- AI 채팅 또는 자연어 일정 생성 UI 구현
- 알림 설정 또는 알림 발송 UI 구현
- 미확정 색상 라벨 선택지 임의 확정
- 공개 범위 값과 일정 유형 값의 관계 확정

#### 작업 결과

`none`

#### 남은 문제

- 색상 라벨의 선택지와 의미는 Product Spec에서 정의되어 있지 않아 사람 검증이 필요하다.
- 공개 범위 값의 정확한 종류와 일정 유형 값의 관계는 Product Spec에서 정의되어 있지 않아 사람 검증이 필요하다.

---

### Task 3. 일정 기능 통합 검증

#### 담당 Worker

`test-worker`

#### 선행 Task

- `Task 1`
- `Task 2`

#### 작업 목적

Backend와 Frontend의 일정 관리 흐름이 Product Spec, Core Beliefs, reference 문서, `schedule-and-notification.md`의 확정 범위와 일치하는지 통합 관점에서 검증한다.

#### 구현 항목

- [ ] 월간/주간/일간 조회 흐름을 검증한다.
- [ ] 날짜 선택, 일정 상세 조회, 일정 등록/수정/삭제 흐름을 검증한다.
- [ ] 일정 유형, 공개 범위, 참석자 입력이 Product Spec 범위를 벗어나지 않는지 확인한다.
- [ ] 회의실 예약으로 생성된 일정이 캘린더에서 조회 가능한 일정으로만 다뤄지는지 확인한다.
- [ ] 회의실, AI, 알림으로 이동한 Out of Scope 요구사항이 일정 기능 안에 구현되지 않았는지 확인한다.

#### 검증 항목

- [ ] `(backend) ./gradlew test`
- [ ] `(backend) ./gradlew build`
- [ ] `(frontend) npm run check`
- [ ] Product Spec, Core Beliefs, `schedule-and-notification.md`, 구현 결과 간 충돌 여부를 점검한다.
- [ ] Product Spec 및 Design Doc의 미확정 사항이 임의로 확정되지 않았는지 점검한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않아야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 검증 항목이 누락됨
- 테스트 또는 빌드 실패
- 수정 금지 경로 변경
- 관련 Product Spec 또는 Design Doc과 충돌함
- 미확정 사항을 사용자 확인 없이 구현 정책으로 확정함
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 구현 완료 후 품질 점수의 임의 통과 판정
- Product Spec에 없는 정책 확정
- 별도 기능인 회의실, AI, 알림 구현 검증
- 알림 생성, 갱신, 취소 정책 검증

#### 작업 결과

`none`

#### 남은 문제

- 예약 수정/취소 시 연결된 일정 및 알림 처리 정책은 `docs/design-docs/schedule-and-notification.md`의 미확정 사항으로 남아 있어 별도 검증이 필요하다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 수정 금지 경로에 변경이 없어야 한다.
- 관련 문서와 실제 구현이 일치해야 한다.
- Product Spec 및 Design Doc의 미확정 사항을 임의로 확정하지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- 작업 범위 밖의 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
- Product Spec 또는 Design Doc의 미확정 사항을 구현 정책으로 임의 확정함
