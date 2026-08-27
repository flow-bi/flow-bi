# 작업 계획: meeting-room-frontend-refactor-01

## 1. 기본 정보

### 사용자 요청

회의실 관련 프론트엔드 코드의 책임을 분리하고 구조를 리팩터링하되 브라우저 E2E는 검증 범위에서 제외한다.

### 작업 목적

회의실 기능의 사용자 동작, 공개 진입점과 Backend API 계약을 변경하지 않으면서 Gateway 계약·HTTP Adapter, 예약 현황 조회·표시, 예약 입력, 수정·취소 및 Query 갱신 책임을 테스트 가능한 단위로 분리한다. 현재 `meeting-room-page.tsx`, `reservation-panel.tsx`, `meeting-room-gateway.ts`와 단일 대형 Component Test에 집중된 책임을 줄여 FR-019~FR-023의 목록·생성·일정 연결·수정·취소 흐름을 안전하게 유지보수할 수 있게 한다. 사용자의 명시적 요청에 따라 실제 브라우저 E2E는 완료 Gate에서 제외하고 Unit·Component Test, Typecheck, Lint, Formatting과 Build로 검증한다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `frontend/AGENTS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/API.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 회의실 Gateway 계약과 Adapter 책임 분리

#### 선행 Task

- `없음`

#### 작업 목적

회의실 도메인 타입·Gateway 인터페이스·안전한 오류 모델과 Production HTTP 구현·Gateway 선택 책임을 분리하여 UI와 Test Double이 원시 HTTP 세부사항에 의존하지 않게 한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`

#### 수정 금지 경로

- `frontend/src/app`
- `frontend/src/pages`
- `frontend/src/shared`
- `frontend/src/features/authenticatedFetch.ts`
- `frontend/src/App.tsx`
- `frontend/cypress`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red: 분리할 Gateway 계약과 Production Adapter의 공개 동작을 대상으로 테스트를 먼저 작성하여 새 책임 경계가 아직 존재하지 않거나 기존 결합 때문에 독립 검증할 수 없어 실패하는지 확인한다.
- [ ] 회의실 조회·예약 생성·수정·취소 Command와 Result, 화면 Model, Gateway 인터페이스 및 허용된 오류 코드를 원시 HTTP 구현과 분리한다.
- [ ] Same-origin Session 요청, URL·Query 직렬화, JSON·빈 응답 처리, Backend 오류 코드 변환과 예약 상세의 `editable` 변환을 Production Adapter 책임으로 모은다.
- [ ] Development Gateway와 Test Double이 동일한 Gateway 계약을 사용하도록 Import 경계를 정리하되 기존 메모리 상태, 중복 예약·수용 인원 검증과 조회 결과를 변경하지 않는다.
- [ ] `frontend/src/features/meeting-room/index.ts`의 기존 공개 Export와 `MeetingRoomPage` 소비 계약을 유지하고 내부 파일 이동을 외부 Consumer에 노출하지 않는다.
- [ ] Green 이후 오류 코드 집합, 참석자 검색어 정규화와 예약 요청 Body 변환의 중복만 최소 범위에서 정리한다.
- [ ] 구현 문제로 검증이 실패하면 제품 계약이나 단언을 약화하지 않고 최대 3회까지 수정·재검증하며 이후에도 실패하면 Task를 실패 처리하고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] Red 단계에서 새 책임 단위 테스트가 의도한 미분리 경계 때문에 실패하고 기존 API 동작 오류 때문이 아님을 실행 기록에 남긴다.
- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room/production-meeting-room-gateway.test.ts src/features/meeting-room/development-meeting-room-gateway.test.ts`로 Same-origin Session, URL·Method·Body, 최소 응답 변환, 안전한 오류, Development 생성·조회·수정·취소 동작을 검증한다.
- [ ] `cd frontend && npx tsc -b --pretty false`로 기존 공개 Export와 App Consumer의 타입 호환성을 검증한다.
- [ ] `cd frontend && npx eslint src/features/meeting-room`과 `cd frontend && npx prettier --check src/features/meeting-room`으로 변경 범위의 정적 규칙과 Formatting을 검증한다.
- [ ] `git diff --check -- frontend/src/features/meeting-room`으로 Patch 형식을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-019~FR-023의 API 요청·응답 의미와 `backend/API.md`의 회의실 조회·예약 생성·수정·취소 계약이 변경되지 않아야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 Red → Green → Refactor 실행 증거가 기록되어야 한다.
- 문서 갱신 대상은 없으며 공개 API나 사용자 동작 변경이 필요해지면 구현하지 않고 사람의 승인을 요청해야 한다.
- 새 의존성, 인증 방식, 오류 코드, 공개 Export 호환성 변경은 허용하지 않으며 필요 시 사람 검토로 전환해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 관련 Unit Test, Typecheck, Lint, Formatting 또는 Patch 검증 실패
- 요청 URL·Method·Body, Session·CSRF 처리, 응답 필드 또는 오류 코드 의미 변경
- 기존 공개 Export 제거 또는 App Consumer 호환성 파괴
- 테스트 삭제, 단언 약화 또는 실제 Backend 계약과 다른 Mock으로 검증 우회
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 화면 Layout, Form 또는 사용자 메시지 변경
- Backend API, 인증·권한, DB Schema와 Migration 변경
- 공통 HTTP Client 교체 또는 새 의존성 도입
- 다른 Frontend 기능의 Gateway 구조 정리

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 회의실 조회·검색·목록 표시 책임 분리

#### 선행 Task

- `Task 1`

#### 작업 목적

회의실 검색 Draft·적용 조건과 시간 검증, TanStack Query 조회·마지막 유효 데이터 복구, 조회 상태 표현 및 회의실 Card·시간표 표시를 페이지 조립 책임에서 분리한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`

#### 수정 금지 경로

- `frontend/src/app`
- `frontend/src/pages`
- `frontend/src/shared`
- `frontend/src/App.tsx`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red: 검색 Form, 적용된 조회 조건, Loading·Empty·Error·인증 대기와 마지막 유효 회의실 데이터, PC 시간표·Mobile 텍스트 대체 동작을 분리된 책임 단위의 Component Test로 먼저 작성해 새 경계가 없어 실패하는지 확인한다.
- [ ] 검색 입력 상태와 마지막으로 적용된 검색 조건을 분리하고 10분 단위, `09:00`~`18:00`, 시작·종료 시간 검증 및 `RoomAvailabilityQuery` 변환 책임을 검색 단위로 이동한다.
- [ ] 회의실 조회 Query, 이전 데이터 유지, 실패 후 재시도와 마지막 유효 응답 표시를 전용 조회 책임으로 분리하고 오래된 요청이 최신 화면 상태를 덮어쓰지 않게 한다.
- [ ] 회의실 Card·목록과 기본 이미지, 수용 인원·위치, 예약 예정·사용 중·사용 완료 시간표 및 Mobile 텍스트 대체 표시를 Page에서 분리한다.
- [ ] 예약 상태 `전체`·`예약 가능`·`예약중`, 수용 인원·날짜·시간 조건과 소유 예약의 수정·취소 Trigger 노출 의미를 유지한다.
- [ ] `MeetingRoomPage`는 조회·검색·목록 단위를 조립하고 예약 동작 Callback을 전달하도록 정리하되 외부 Props와 `#meeting-room` 진입점을 유지한다.
- [ ] Green 이후 검색·목록 관련 Component Test를 책임별 파일로 정리하되 기존 정상·경계·오류·접근성 시나리오와 단언을 삭제하거나 약화하지 않는다.
- [ ] 구현 문제로 검증이 실패하면 제품 동작이나 Fixture 계약을 약화하지 않고 최대 3회까지 수정·재검증하며 이후에도 실패하면 Task를 실패 처리하고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] Red 단계에서 분리된 조회·검색·목록 테스트가 의도한 컴포넌트 또는 조회 경계 부재로 실패했는지 기록한다.
- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`에서 조회·검색·목록 책임에 해당하는 테스트를 실행해 검색 Draft와 적용 조건 분리, 시간 검증, Loading·Empty·Error·인증 대기·재시도 및 마지막 유효 데이터 동작을 확인한다.
- [ ] React Testing Library Component Test에서 Desktop 시간표·필터, Mobile 텍스트 대체와 키보드 조작을 사용자가 관찰 가능한 DOM·접근성 동작으로 검증한다.
- [ ] `cd frontend && npx tsc -b --pretty false`로 분리된 검색·조회·목록 Props와 Page 조립의 타입 호환성을 검증한다.
- [ ] `cd frontend && npx eslint src/features/meeting-room`과 `cd frontend && npx prettier --check src/features/meeting-room`으로 변경 범위의 정적 규칙과 Formatting을 검증한다.
- [ ] Task 1의 Gateway 계약을 사용하는 조회 경로와 분리된 검색·목록 UI가 충돌하지 않고 기존 조회 흐름에 회귀가 없는지 Component Test 결과로 확인한다.
- [ ] `git diff --check -- frontend/src/features/meeting-room`으로 Patch 형식을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-019의 전체 회의실 조회·필터·현황 표시와 FR-020~FR-023의 소유 예약 Action 진입점이 기존과 동일하게 동작해야 한다.
- Loading·Empty·Error·Permission 상태, Desktop·Mobile 표시, 키보드 조작과 색상에 의존하지 않는 예약 정보 대체 경로가 유지되어야 한다.
- 사용자 승인에 따라 실제 브라우저 E2E는 `N/A`이며 미실행 자체를 실패로 처리하지 않되 Component Test로 대체한 범위와 남은 실제 브라우저 위험을 작업 결과에 기록해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 Red → Green → Refactor 실행 증거가 기록되어야 한다.
- 문서 갱신 대상은 없으며 검색 의미, 화면 동작 또는 API 계약 변경이 필요해지면 구현하지 않고 사람의 승인을 요청해야 한다.
- 새 상태 저장소, 새 의존성 또는 전역 UI 변경은 허용하지 않으며 필요 시 사람 검토로 전환해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 관련 Component Test, Typecheck, Lint, Formatting 또는 Patch 검증 실패
- 검색 Draft가 적용 전 조회에 반영되거나 이전 날짜·시간 예약이 최신 결과에 남음
- Loading·Empty·Error·인증 대기 또는 재시도 상태 손실
- 소유하지 않은 예약의 수정·취소 Action 노출 또는 서버 권한을 대체하는 Client 판정 추가
- PC 시간표, Mobile 텍스트 대체, 키보드 접근성 또는 기존 사용자 메시지 회귀
- 테스트 삭제, 단언 약화 또는 검증 우회
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 예약 Form 내부, 참석자 검색·선택과 제출 상태 구조 변경
- 예약 수정 상세 조회와 취소 Mutation 구조 변경
- Product Spec에 없는 필터·정렬·페이지네이션 추가
- 공통 디자인 시스템 또는 전역 상태 저장소 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 예약 생성·수정 입력 패널 책임 분리

#### 선행 Task

- `Task 2`

#### 작업 목적

예약 Panel Shell과 닫기·입력 폐기, Form 값·검증·제출 상태, 참석자 검색·선택 책임을 분리하여 생성과 수정이 같은 검증·접근성 계약을 재사용하도록 한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`

#### 수정 금지 경로

- `frontend/src/app`
- `frontend/src/pages`
- `frontend/src/shared`
- `frontend/src/App.tsx`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red: 생성·수정 초기값, Form 검증·Command 변환, 참석자 검색·중복 제거·수용 인원, 제출·충돌 복구, 입력 폐기·Focus 동작을 분리된 책임 단위의 Component Test로 먼저 작성해 새 경계가 없어 실패하는지 확인한다.
- [ ] Panel Dialog의 제목·초기 Focus·Overlay 닫기·저장되지 않은 입력 폐기 확인과 Form 상태·검증·제출 책임을 분리한다.
- [ ] 참석자 검색어 정규화, Query Loading·Empty·Error·재시도, 후보 추가·중복 안내·선택 제거와 ID 배열 동기화 책임을 독립된 참석자 선택 단위로 이동한다.
- [ ] 생성과 수정의 초기값·Button 문구·성공 안내를 명시적인 Mode 입력으로 유지하고 `CreateRoomReservationCommand` 변환 및 예약자 ID 비전송 계약을 공유한다.
- [ ] 제출 중 중복 요청을 막고 충돌 시 입력을 보존한 채 예약 현황 재조회 Action을 제공하며 권한·수용 인원·참석자 접근 오류를 성공으로 처리하지 않는다.
- [ ] 등록자 참석 여부와 추가 참석자 수의 합으로 수용 인원을 검증하고 참석자 표시 정보는 `userId`, `displayName`만 사용한다.
- [ ] Green 이후 생성·수정·참석자·Panel 수명주기 Component Test를 책임별 파일로 정리하되 기존 시나리오와 단언을 삭제하거나 약화하지 않는다.
- [ ] 구현 문제로 검증이 실패하면 제품 동작이나 API Fixture를 약화하지 않고 최대 3회까지 수정·재검증하며 이후에도 실패하면 Task를 실패 처리하고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] Red 단계에서 예약 입력 책임 테스트가 의도한 Form·참석자·Panel 경계 부재로 실패했는지 기록한다.
- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`에서 예약 입력 책임에 해당하는 테스트를 실행해 생성·수정 초기값, 필수·시간·수용 인원 검증, 참석자 상태, 중복 제출 방지, 오류·성공과 입력 보존을 확인한다.
- [ ] React Testing Library Component Test에서 Desktop·Mobile 생성·수정, 충돌 복구, Overlay·입력 폐기와 Focus 복귀를 사용자가 관찰 가능한 DOM·접근성 동작으로 검증한다.
- [ ] `cd frontend && npx tsc -b --pretty false`로 분리된 Panel Shell·Form·참석자 선택 Props와 생성·수정 조립의 타입 호환성을 검증한다.
- [ ] `cd frontend && npx eslint src/features/meeting-room`과 `cd frontend && npx prettier --check src/features/meeting-room`으로 변경 범위의 정적 규칙과 Formatting을 검증한다.
- [ ] Task 1~2의 Gateway·조회·목록 Trigger와 분리된 예약 Panel이 충돌하지 않고 생성·수정 사용자 흐름에 회귀가 없는지 Component Test 결과로 확인한다.
- [ ] `git diff --check -- frontend/src/features/meeting-room`으로 Patch 형식을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-020~FR-022의 예약·연결 일정 생성과 수정 입력 의미, 참석자·등록자 참석·수용 인원 및 시간 규칙이 유지되어야 한다.
- Loading·Empty·Error·Permission·제출 상태, Desktop·Mobile Panel, 키보드·Focus·입력 폐기 확인 동작이 유지되어야 한다.
- 사용자 승인에 따라 실제 브라우저 E2E는 `N/A`이며 미실행 자체를 실패로 처리하지 않되 Component Test로 대체한 범위와 남은 실제 브라우저 위험을 작업 결과에 기록해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 Red → Green → Refactor 실행 증거가 기록되어야 한다.
- 문서 갱신 대상은 없으며 Form 의미, 사용자 메시지 또는 API 계약 변경이 필요해지면 구현하지 않고 사람의 승인을 요청해야 한다.
- 새 Form 기술, 상태 저장소, 외부 의존성 또는 신규 UX 도입은 허용하지 않으며 필요 시 사람 검토로 전환해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 관련 Component Test, Typecheck, Lint, Formatting 또는 Patch 검증 실패
- 사용자 ID·예약자 ID 전송, API Command 필드 또는 생성·수정 의미 변경
- 참석자 중복, 수용 인원, 시간 검증 또는 제출 중복 방지 회귀
- 충돌·권한·네트워크 오류를 성공으로 표시하거나 실패 후 입력 손실
- Panel Focus, 키보드, Overlay 닫기, 입력 폐기 확인 또는 Mobile 흐름 회귀
- 테스트 삭제, 단언 약화 또는 검증 우회
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Backend 예약 검증·권한·트랜잭션 변경
- 회의실 관리, 사진 업로드와 장비 편집 UI 추가
- 일반 Calendar 일정 Form 변경
- Form Library·Query Library 또는 Styling 기술 교체

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 예약 취소와 회의실 페이지 조립 통합 검증

#### 선행 Task

- `Task 3`

#### 작업 목적

예약 취소 Dialog·Mutation·오류 복구·Focus 관리와 생성·수정·취소 후 Query 갱신 정책을 페이지 Markup에서 분리하고, 앞선 책임 단위를 `MeetingRoomPage`에서 충돌 없이 조립한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`

#### 수정 금지 경로

- `frontend/src/app`
- `frontend/src/pages`
- `frontend/src/shared`
- `frontend/src/App.tsx`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress`
- `backend`
- `docs`

#### 구현 항목

- [ ] Red: 취소 확인·Escape·Focus Trap·중복 제출 방지, 404·409·인증·네트워크 오류와 최신 현황 재조회, 성공 후 Query 갱신·Focus 복귀를 분리된 취소 책임 단위의 Component Test로 먼저 작성해 새 경계가 없어 실패하는지 확인한다.
- [ ] 취소 확인 내용, 위험 안내, Dialog Focus·Escape·Tab 순환·닫기 및 Trigger 복귀를 전용 취소 Dialog 책임으로 분리한다.
- [ ] 취소 Mutation의 진행·오류·재조회 권고·성공 안내와 최신 예약 현황 복구 책임을 UI Markup에서 분리하고 실패 시 마지막 유효 화면 데이터를 유지한다.
- [ ] 회의실 예약 생성은 현재 검색 조건의 회의실 Query와 Calendar 목록 Query, 수정은 현재 회의실 Query, 취소는 현재 회의실 Query와 Calendar 목록·상세 Query만 기존 범위대로 무효화하도록 Query Key와 갱신 책임을 명시적으로 모은다.
- [ ] `MeetingRoomPage`가 Gateway, 조회·목록, 생성·수정 Panel과 취소 흐름을 조립하는 역할만 갖도록 정리하고 외부 Props, 공개 Export, `#meeting-room` Landmark와 App 연결을 유지한다.
- [ ] 기존 대형 `meeting-room-page.test.tsx`의 시나리오를 조회·생성·수정·취소·통합 책임에 맞게 분리하되 테스트와 단언을 삭제하거나 약화하지 않는다.
- [ ] Desktop·Mobile에서 조회 후 생성·수정·취소, Calendar Cache 반영, 인증 대기·오류 복구와 키보드 흐름이 분리된 책임 사이에서 동일하게 이어지도록 정리한다.
- [ ] Green 이후 Callback·Query 갱신·Focus 복귀 중복만 최소 범위에서 정리하고 새 전역 상태나 범용 추상화를 만들지 않는다.
- [ ] 구현 문제로 검증이 실패하면 제품 동작이나 API Fixture를 약화하지 않고 최대 3회까지 수정·재검증하며 이후에도 실패하면 Task를 실패 처리하고 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] Red 단계에서 취소·페이지 조립 테스트가 의도한 Dialog·Mutation·Query 갱신 경계 부재로 실패했는지 기록한다.
- [ ] `cd frontend && npm run test:unit -- src/features/meeting-room`에서 취소와 최종 페이지 조립 책임에 해당하는 테스트를 실행해 소유권 Action, 확인·멱등 UI, 오류·재시도, 정확한 Query 무효화, 마지막 유효 데이터와 Focus 복귀를 검증한다.
- [ ] React Testing Library Component Test에서 취소 계약, Desktop·Mobile 생성·수정 조립, Calendar Cache 갱신과 Development Gateway 연결을 사용자가 관찰 가능한 DOM·접근성·Query 동작으로 검증한다.
- [ ] `cd frontend && npx tsc -b --pretty false`로 분리된 책임의 Props·Gateway·공개 Export와 App 조립 타입을 검증한다.
- [ ] `cd frontend && npx eslint src/features/meeting-room`과 `cd frontend && npx prettier --check src/features/meeting-room`으로 변경 범위의 정적 규칙과 Formatting을 검증한다.
- [ ] Task 1~3의 Gateway, 조회·목록, 예약 입력 결과와 취소·Query 갱신·페이지 조립이 충돌하지 않고 FR-019~FR-023 사용자 흐름에 회귀가 없는지 Component Test로 확인한다.
- [ ] `git diff --check -- frontend/src/features/meeting-room`으로 Patch 형식을 검증한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-019~FR-023의 조회·생성·일정 연결·수정·취소 흐름과 `backend/API.md`의 인증·소유권·오류·Soft Cancel 계약이 변경되지 않아야 한다.
- 취소 실패 후 데이터·입력 보존, 성공 후 영향받는 Query만 갱신, 소유하지 않은 예약 Action 비노출과 서버 권한 최종 책임이 유지되어야 한다.
- Loading·Empty·Error·Permission 상태, Desktop·Mobile, 키보드·Dialog Focus·Focus 복귀가 유지되어야 한다.
- 사용자 승인에 따라 실제 브라우저 E2E는 `N/A`이며 미실행 자체를 실패로 처리하지 않되 Component Test로 대체한 범위와 남은 실제 브라우저 위험을 작업 결과에 기록해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 Red → Green → Refactor 실행 증거가 기록되어야 한다.
- 문서 갱신 대상은 없으며 공개 API, 사용자 동작, Cache 정책 의미 또는 권한 계약 변경이 필요해지면 구현하지 않고 사람의 승인을 요청해야 한다.
- 새 의존성, 인증·권한 정책, 전역 상태 또는 범용 UI 체계 도입은 허용하지 않으며 필요 시 사람 검토로 전환해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `85` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 관련 Component Test, Typecheck, Lint, Formatting 또는 Patch 검증 실패
- 취소 확인·Focus Trap·Escape·중복 제출 방지·오류 복구 또는 Trigger Focus 복귀 회귀
- 생성·수정·취소 후 필요한 Query 누락 또는 영향받지 않은 Query까지 무효화
- 소유하지 않은 예약의 수정·취소 Action 노출, 인증 우회 또는 예약 존재 여부 노출
- 실패를 성공으로 표시하거나 마지막 유효 데이터·수정 입력 손실
- 공개 Props·Export, API 계약 또는 사용자 동작 변경
- 테스트 삭제, 단언 약화 또는 검증 우회
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- Product Spec 또는 Design Doc과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Backend 예약·일정·알림 트랜잭션 변경
- Calendar 내부 컴포넌트·Query 구조 리팩터링
- 관리자 회의실·장비·사진 관리 UI
- 새로운 화면·검색 조건·예약 상태 또는 사용자 메시지 추가

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과하고 Red → Green → Refactor 실행 증거가 기록되어야 한다.
- Task 간 Gateway·조회·목록·예약 Form·취소·Query 갱신 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- FR-019~FR-023, `docs/product-specs/meeting-room.md`, `docs/design-docs/schedule-and-notification.md`와 실제 사용자 동작·API 계약이 일치해야 한다.
- 기존 공개 Export, Backend API, 인증·권한, DB Schema, 사용자 메시지와 Cache 갱신 의미가 변경되지 않아야 한다.
- Loading·Empty·Error·Permission 상태, PC·Mobile, 키보드·Focus·위험 행동 확인과 실패 복구가 유지되어야 한다.
- 모든 Task 완료 후 Harness 실행기가 Frontend 전체 `cd frontend && npm run check`를 한 번 실행해 Typecheck, Lint, Formatting, Unit·Component Test와 Build를 모두 통과해야 한다.
- 사용자 승인에 따라 실제 브라우저 E2E는 전체 완료 Gate에서 제외하며 Component Test가 대체하지 못하는 브라우저 Layout·Focus·통합 환경 위험을 최종 결과에 기록해야 한다.
- Mandatory Gate G1~G7이 모두 `PASS`이고 해결되지 않은 Critical 또는 Blocker Finding이 없어야 한다.
- 전체 `quality_score`가 `85` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패하거나 같은 구현 문제에 대한 3회 수정 후에도 검증이 실패함
- 필수 검증 명령 또는 Frontend 전체 Check가 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- FR-019~FR-023 사용자 동작, Backend API, 인증·권한, 공개 Export 또는 Query 갱신 의미가 변경됨
- 테스트 삭제, 단언 약화, 실제 계약과 다른 Mock 또는 검증 우회가 발생함
- Loading·Empty·Error·Permission, Desktop·Mobile, 키보드·Focus 또는 오류 복구 회귀가 발생함
- 새 의존성·전역 상태·범용 구조 또는 범위 밖 리팩터링이 사람 승인 없이 추가됨
- 남은 문제가 사용자 확인 없이 방치됨
