# 작업 계획: calendar-01

## 1. 기본 정보

### 사용자 요청

캘린더 MVP 기능을 계획하되, 다른 팀원이 담당하는 사용자·인증·인가·로그인 기능이 구현된 이후 관련 연동과 보안 검증을 완성하는 순서로 구성한다.

### 작업 목적

개인·팀·프로젝트 일정의 월간·주간·일간 조회와 일반 일정 생성·상세 조회·수정·취소를 구현한다. 인증과 분리 가능한 Calendar 도메인·API 계약·UI를 먼저 완성하고, 팀원의 사용자·인증·인가·로그인 기능이 준비된 뒤 검증된 사용자 Context, 참석자 검색과 객체 수준 권한을 연결해 보호된 Calendar MVP를 완성한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/calendar.md`
- Design Doc: `docs/design-docs/schedule-and-notification.md`, `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `docs/adrs/0001-calendar-persistence-schema.md`, `docs/adrs/0002-calendar-migration-and-postgresql-verification.md`

### 실행 전제, 외부 의존성과 사람 승인 조건

- 타 팀원이 담당하는 사용자·인증·인가·로그인 구현은 Calendar Task의 범위가 아니다. Calendar는 JWT 발급·검증·저장·회전, 로그인 화면과 사용자·조직 원장 기능을 구현하거나 임시 인증으로 대체하지 않는다.
- Task 1~6은 인증과 분리 가능한 Calendar 도메인 규칙, 영속화, API 계약과 Frontend 사용자 흐름을 구현한다. 이 단계의 Test Double이나 계약 기반 Mock은 경계를 통제하기 위한 것으로만 사용하며 보호 API와 사용자 연동 완료로 보고하지 않는다.
- Task 7은 팀원 기능에서 검증된 인증 Principal, 보호 Endpoint, 활성 사용자 검색, 팀 소속과 프로젝트 참여 조회 계약 및 통합 Test Fixture가 제공된 이후 시작한다. 외부 기능이 준비되지 않으면 Task 7과 후속 Task를 `BLOCKED`로 유지하되 Task 1~6의 완료를 실패로 바꾸지 않는다.
- 보호된 일정 API의 인증 사용자 경계는 타 팀이 구현한 계약과 `docs/design-docs/authentication-and-permission.md`를 기준으로 Task 7에서 적용한다.
- 일정 상태, 취소 주체·시각, 종일 여부, 색상 라벨과 다중 참석자·팀·프로젝트 연결은 `docs/adrs/0001-calendar-persistence-schema.md`, Migration 도구와 PostgreSQL 검증 환경·Fixture는 `docs/adrs/0002-calendar-migration-and-postgresql-verification.md`에서 결정한다. 두 ADR이 사람 승인으로 `ACCEPTED`되기 전에는 Task 1을 실행하지 않는다.

---

## 2. 실행 Task

### Task 1. 일정 생성 Backend 핵심 구현

#### 선행 Task

- 없음

#### 작업 목적

FR-014~FR-016 중 인증과 사용자 원장에 독립적인 일반 일정 생성 규칙, 영속 모델과 API 계약을 구현한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/main/resources/db/migration`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/quality`
- `docs/plans`

#### 구현 항목

- [ ] 일정 생성의 실패 테스트를 먼저 작성해 잘못된 시간 구간, 유형·공개 범위·대상 불일치, 중복 참석자 ID와 허용되지 않은 색상 라벨을 Red로 확인한다.
- [ ] `PERSONAL`, `TEAM`, `PROJECT` 중 정확히 하나인 유형과 기본 공개 범위, `[startAt, endAt)` 시간 규칙, 종일 일정, Red·Orange·Yellow·Green·Blue·Purple 라벨, 상세·위치, 등록자 참석 여부와 참석 인원 계산을 구현한다.
- [ ] 개인 일정은 팀·프로젝트 대상 없이, 팀 일정은 하나 이상의 팀 ID, 프로젝트 일정은 하나 이상의 프로젝트 ID를 갖도록 Calendar 내부 조합을 검증하고 일정·상세·공유 대상·참석자를 한 트랜잭션으로 저장한다.
- [ ] 등록자, 참석자, 팀과 프로젝트의 존재·활성·접근 가능 여부를 외부 기능에 위임할 명시적인 Port와 실패 계약을 정의하되 운영 Adapter나 인증 우회 구현은 추가하지 않는다.
- [ ] 사람이 승인해 `ACCEPTED`된 ADR-0001과 ADR-0002에 맞춰 필요한 비파괴 Migration, JPA Mapping, 제약·Index를 작성하고 `backend/API.md`, `backend/DB_SCHEMA.md`를 실제 계약과 동기화한다.
- [ ] Green 이후 중복 검증과 변환 책임을 정리하되 계층·도메인 경계를 바꾸지 않는 범위에서 리팩터링한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Schedule*Create*' --tests '*Schedule*Domain*'`로 생성 정상/경계/실패, 외부 Port 계약, Transaction Rollback, Mapping·Constraint 테스트를 통과한다.
- [ ] ADR-0002에서 승인된 PostgreSQL 검증 환경과 Fixture로 Migration 적용, FK·CHECK·UNIQUE·Index, 다중 관계와 기존 데이터 보존을 확인하며 H2 결과만으로 PostgreSQL 호환성을 대체하지 않는다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 이 Task의 Java Formatting을 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-014, FR-015, FR-016 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor와 실행 명령의 결과가 작업 결과에 기록되어야 한다.
- ADR-0001과 ADR-0002가 사람 승인으로 `ACCEPTED`되어야 하며 일정 생성 계약과 DB Mapping·Migration·문서가 승인된 결정과 일치해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- DB 변경 위험을 반영해 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 필수 구현 누락, 테스트·Formatting·Migration 검증 실패 또는 3회 수정 후 동일 실패가 남음
- 부분 저장, 외부 사용자 계약을 Calendar 내부에서 임의 구현하거나 허용되지 않은 유형·대상 조합 저장
- 승인되지 않은 Migration 도구·Schema 변경 또는 수정 가능 경로 밖 변경
- Product Spec·Design Doc·API·DB 계약과 다른 동작 구현
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 90 미만

#### 제외 범위

- 로그인·JWT 발급·검증·Refresh Token·브라우저 Token 저장 정책과 보호 Controller 구현
- 실제 참석자 후보 검색과 사용자·팀·프로젝트 존재·활성·접근 권한 판정
- 회의실 예약 일정 생성, 알림 발송, AI 자연어 일정 생성
- 캘린더 사용자 화면 구현

#### 작업 결과

`none`

#### 남은 문제

- ADR-0001과 ADR-0002는 사람 승인으로 `ACCEPTED`됐다. Task 1 실행 시 승인된 Schema·Migration·PostgreSQL Fixture 전략을 적용하고 실제 Container Runtime 가용성을 검증한다.
- Initial Baseline ERD 원본 파일이 저장소에 없어 `backend/DB_SCHEMA.md` 외 ERD 동기화 대상은 별도 결정이 필요하다.
- 실제 인증 사용자와 참석자·팀·프로젝트 검증 Adapter는 타 팀 기능 완료 후 Task 7에서 연결한다.

---

### Task 2. 일정 추가 Modal과 참석자 검색 Frontend 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

사용자가 PC와 모바일에서 일정 유형별 기본값을 확인하고 필수 정보를 입력해 일반 일정을 생성할 수 있는 접근 가능한 Modal 흐름을 구현한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/src/App.tsx`
- `frontend/src/index.css`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress.config.ts`
- `frontend/cypress/support`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 일정 추가 Modal의 실패 컴포넌트 테스트를 먼저 작성해 필수 Label, 초기 포커스·포커스 복귀, Escape/닫기, 저장되지 않은 입력 확인, 오류 연결, 제출 중 중복 방지를 Red로 확인한다.
- [ ] 일정 타입, 제목, 날짜, 시작·종료 시간, 하루종일, 위치, 유형, 공개 범위, 색상 라벨, 참석자, 등록자 참석 여부, 자동 참석 인원, 상세 설명 입력을 React Hook Form과 Zod로 구현한다.
- [ ] 유형 변경 시 확정된 기본 공개 범위를 표시하고 개인·팀·프로젝트 대상 선택을 계약에 맞게 제한하며, 서버 오류를 빈 데이터나 성공으로 바꾸지 않는다.
- [ ] TanStack Query 기반 생성 Mutation과 참석자 검색 Client를 문서화된 API 계약에 맞춰 구현하고 성공 시 영향받는 일정 조회만 갱신하며 개인정보가 화면 상태나 로그에 남지 않게 한다.
- [ ] Desktop 1280×800과 Mobile 390×844에서 핵심 생성 흐름, Loading·Empty·Error·Permission 상태와 키보드 사용이 가능하게 구현한다.
- [ ] Green 이후 Form 변환·검증과 표시 컴포넌트 책임을 기능 경계 안에서 리팩터링한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features`로 일정 추가, 기본 공개 범위, 참석자 중복 제거·인원 계산, 오류·접근성 시나리오를 통과한다.
- [ ] `cd frontend && npm run typecheck`와 `cd frontend && npm run lint`로 Task 1 계약 타입과 정적 규칙을 검증해 선행 Task 결과와의 계약 충돌이 없음을 확인한다.
- [ ] React Testing Library로 키보드만 사용한 Modal 열기·입력·제출·닫기와 포커스 복귀를 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-014, FR-015, FR-016 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor 결과와 검증 명령이 기록되어야 한다.
- Loading·Empty·Error·Permission 상태, PC·모바일, 기본 접근성과 API 계약이 검증되어야 하며 실제 사용자·인증 연동 완료로 보고하지 않아야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 필수 입력·유형·공개 범위·참석 인원 동작 누락 또는 서버 검증을 UI가 우회함
- 테스트·Type Check·Lint 실패 또는 3회 수정 후 동일 실패가 남음
- API 오류를 성공으로 처리하거나 민감정보를 노출함
- Product Spec·Design Doc과 다른 UX 또는 수정 가능 경로 밖 변경
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 85 미만

#### 제외 범위

- 월간·주간·일간 조회 화면과 상세 Modal
- 일정 수정·취소 UI
- 신규 날짜·캘린더 UI 라이브러리 또는 Router 도입

#### 작업 결과

`none`

#### 남은 문제

- 실제 참석자 검색과 인증 Token 처리 연결은 타 팀 기능 완료 후 Task 7에서 수행하며 이 Task에서는 계약 기반 Test Double만 사용한다.

---

### Task 3. 기간별 일정 조회와 상세 조회 Backend 핵심 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

FR-011~FR-013의 월·주·일 화면이 사용할 기간별 목록·상세 조회 규칙과 API 계약을 구현하고, 실제 인증 사용자·소속·프로젝트 참여 Adapter 연결은 Task 7로 미룬다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `backend/src/main/resources/db/migration`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 기간별 목록과 상세 조회의 실패 테스트를 먼저 작성해 공개 정책상 대상이 아닌 Actor, 잘못되거나 과도한 기간, 경계에 걸친 일정과 취소 일정 제외를 Red로 확인한다.
- [ ] `[from, to)` 범위와 Asia/Seoul 표시 기준에 맞춰 기간과 겹치는 ACTIVE 일정을 조회하고 명시적인 Actor·소속 조회 Port를 기준으로 PERSONAL은 작성자·참석자, TEAM은 연결 팀 소속·참석자, PROJECT는 프로젝트 참여자·참석자에게만 공개한다.
- [ ] 목록은 캘린더 렌더링에 필요한 최소 필드만, 상세는 허용된 사용자에게 상세·위치·유형·공개 범위·색상·참석자와 회의실 예약 관리 여부를 반환하며 Entity를 직접 노출하지 않는다.
- [ ] 존재하지 않거나 공개 정책상 노출할 수 없는 상세는 동일한 안전한 Not Found 결과로 처리하고 내부 예외나 개인정보를 응답·로그에 노출하지 않는다.
- [ ] 기간 제한과 조회 Index를 활용해 N+1·무제한 조회를 피하고 `backend/API.md`를 실제 Request·Response·오류 계약과 동기화한다.
- [ ] Green 이후 공개 범위 판정과 DTO Mapping 책임을 중앙화하는 범위에서 리팩터링한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Schedule*Query*' --tests '*Schedule*Detail*'`로 통제된 Actor와 소속 Port를 사용한 공개/비공개·참석자·다중 팀·다중 프로젝트·시간 경계·취소 제외 시나리오를 통과한다.
- [ ] 승인된 PostgreSQL 환경에서 한 달 범위에 접근 가능한 일정 1,000건과 고정 Actor Fixture를 준비해 20회 Warm Run하고 서버 응답 p95가 3초 이내인지 기록한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 이 Task Java Formatting을 확인하고 선행 Task 계약과의 충돌이 없음을 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-011, FR-012, FR-013, NFR-003 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor와 성능 표본·환경·범위·p95 결과가 기록되어야 한다.
- 비공개·취소 일정 노출, N+1과 무제한 조회가 없어야 하며 실제 인증·IDOR 통합 완료로 보고하지 않아야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 공개 범위·데이터 노출 위험을 반영해 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 공개 정책상 대상이 아닌 Actor의 목록·상세 결과 노출, 취소 일정 기본 노출 또는 안전하지 않은 오류
- 시간 경계·다중 대상·참석자 조회 오류, 성능 측정 기준 누락 또는 p95 3초 초과
- 테스트·Formatting 실패 또는 3회 수정 후 동일 실패가 남음
- Product Spec·Design Doc·API 계약과 다른 동작 또는 수정 가능 경로 밖 변경
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 90 미만

#### 제외 범위

- 취소 일정 감사 조회 및 복구 화면
- 회의실 예약 목록·수정·취소 API
- 캘린더 렌더링 UI
- 실제 인증 Principal, 보호 Controller와 사용자·팀·프로젝트 조회 Adapter

#### 작업 결과

`none`

#### 남은 문제

- NFR-003의 전체 Client Rendering 시간은 Task 8에서 별도로 측정하며 Backend 결과만으로 최종 충족을 보고하지 않는다.
- 실제 미인증·IDOR·소속 변경 통합 검증은 타 팀 기능 완료 후 Task 7에서 수행한다.

---

### Task 4. 월간·주간·일간 Calendar와 상세 Frontend 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

첫 화면인 월간 Calendar와 주간·일간 전환, 날짜별 우측 Banner, 일정 상세 Modal을 기간 조회 API에 연결해 제공한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/src/App.tsx`
- `frontend/src/index.css`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 월간 기본 화면, 주간·일간 전환, 이전·다음 기간 이동, 날짜 선택 Banner와 일정 상세 Modal의 실패 컴포넌트 테스트를 먼저 작성한다.
- [ ] 보기 단위와 기준 날짜를 URL 상태로 표현하고 월·주·일의 `[from, to)` 조회 범위를 계산해 Task 3 API와 TanStack Query로 연결한다.
- [ ] 일정 색상 라벨과 유형을 색상에만 의존하지 않는 텍스트 대안으로 표시하고 날짜 선택 시 일간 목록을 Desktop 우측 Banner, Mobile Overlay 또는 전체 화면으로 제공한다.
- [ ] 일정 선택 시 상세 Modal을 열고 회의실 예약 연결 일정의 관리 주체를 명확히 표시하며, 취소 일정은 기본 화면에 렌더링하지 않는다.
- [ ] Loading·Empty·Error·Permission·인증 만료 상태, 재시도, 오래된 요청의 결과 무시와 키보드 탐색·Modal 포커스 복귀를 구현한다.
- [ ] Green 이후 기간 계산·API Mapping·표현 컴포넌트를 기능 경계 안에서 리팩터링한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features`로 월·주·일 범위, 월 경계·윤년·종일·기간 걸침, Banner·상세·상태·키보드 시나리오를 통과한다.
- [ ] `cd frontend && npm run typecheck`와 `cd frontend && npm run lint`로 Task 3 계약 타입과 정적 규칙을 검증해 선행 Task 결과와의 계약 충돌이 없음을 확인한다.
- [ ] 1280×800과 390×844 Viewport에서 텍스트 대안, 포커스 순서, Overlay·Modal 복귀와 가로 Overflow 부재를 컴포넌트 테스트로 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-011, FR-012, FR-013 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor와 검증 결과가 기록되어야 한다.
- 첫 화면 월간 보기, 보기 전환, 날짜 Banner, 상세 Modal, 주요 상태와 접근성이 동작해야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 월·주·일 기간 계산 오류, 취소·비공개 일정 표시 또는 API 오류를 빈 일정으로 위장함
- PC·모바일 핵심 조회 흐름, 키보드 접근, 포커스 관리 또는 텍스트 대안 누락
- 테스트·Type Check·Lint 실패 또는 3회 수정 후 동일 실패가 남음
- Product Spec·Design Doc과 다른 화면 동작 또는 수정 가능 경로 밖 변경
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 85 미만

#### 제외 범위

- 일정 Drag and Drop, 반복 일정, 취소 일정 복구
- 일정 수정·취소 Form과 확인 흐름
- 신규 Calendar·날짜 처리 의존성 도입

#### 작업 결과

`none`

#### 남은 문제

- 지원 Browser 전체 Matrix는 미확정이며 MVP 자동 검증 Viewport는 Desktop 1280×800, Mobile 390×844로 제한한다.

---

### Task 5. 일반 일정 수정과 멱등 취소 Backend 핵심 구현

#### 선행 Task

- `Task 4`

#### 작업 목적

FR-017~FR-018의 등록자 기준 수정·Soft Delete 상태 전이와 회의실 예약 연결 일정 보호 규칙을 구현하고, 실제 인증 Principal과 객체 수준 인가 연결은 Task 7로 미룬다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/DB_SCHEMA.md`
- `backend/build.gradle`
- `backend/src/main/resources/db/migration`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 수정·취소 실패 테스트를 먼저 작성해 통제된 Actor가 비등록자인 경우, 잘못된 유형·대상·시간, 이미 취소된 일정 수정, 회의실 예약 관리 일정의 직접 수정·취소와 반복 취소를 Red로 확인한다.
- [ ] 등록자만 일반 일정의 확정 필드를 수정하도록 하고 유형·공개 범위·공유 대상·참석자 변경을 한 트랜잭션에서 재검증·반영한다.
- [ ] 일반 일정 취소 시 `CANCELED`, 취소 시각, 호출 경계에서 전달된 Actor를 취소 주체로 기록하고 상세·공유 대상·참석자 관계를 보존한다.
- [ ] 같은 등록자의 반복 취소는 추가 상태 변경 없이 204로 처리하고, 회의실 예약 연결 일정은 409와 `ROOM_RESERVATION_MANAGED_SCHEDULE`로 거부한다.
- [ ] 존재하지 않거나 공개 정책상 노출할 수 없는 일정은 동일한 안전한 Not Found 결과로 처리하고 감사 이벤트에는 주체·시각·일정 ID·결과만 남긴다.
- [ ] `backend/API.md`를 실제 수정·취소 Request·Response·오류 계약과 동기화하고 Green 이후 상태 전이·권한 검증 책임을 리팩터링한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Schedule*Update*' --tests '*Schedule*Cancel*'`로 통제된 Actor를 사용한 정상·비등록자·Rollback·멱등성·예약 연결·감사 최소화 시나리오를 통과한다.
- [ ] 동시 수정·취소 요청에서도 허용되지 않은 상태 전이와 부분 반영이 없는지 통합 테스트로 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 Formatting과 Task 1·3의 생성·조회 계약과의 회귀·충돌이 없음을 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-017, FR-018 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor와 소유권 규칙·Transaction·동시성 검증 결과가 기록되어야 한다.
- 취소 이력·관계 보존, 반복 요청 멱등성, 회의실 예약 관리 경계와 안전한 오류가 검증되어야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 상태 전이·데이터 정합성 위험을 반영해 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 통제된 Actor가 비등록자인데 수정·취소 허용, 물리 삭제, 취소 이력·관계 손실 또는 예약 연결 일정 직접 변경
- 반복 취소 비멱등, 동시 요청 상태 손상, 부분 반영 또는 민감정보 감사 기록
- 테스트·Formatting 실패 또는 3회 수정 후 동일 실패가 남음
- Product Spec·Design Doc·API 계약과 다른 동작 또는 수정 가능 경로 밖 변경
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 90 미만

#### 제외 범위

- 취소 일정 복구·감사 조회 UI와 물리 삭제
- 회의실 예약 수정·취소와 알림 생성·취소
- 관리자에 의한 일정 수정·취소 권한
- 실제 인증 Principal, 보호 Controller와 사용자 권한 Adapter

#### 작업 결과

`none`

#### 남은 문제

- 회의실 예약 연결 일정의 일부 일반 속성을 Calendar에서 수정하는 범위는 미확정이므로 MVP에서 모두 예약 관리 흐름으로 안내한다.
- 실제 미인증·IDOR·사용자 비활성화 통합 검증은 타 팀 기능 완료 후 Task 7에서 수행한다.

---

### Task 6. 일정 수정과 취소 Frontend 구현

#### 선행 Task

- `Task 5`

#### 작업 목적

등록자가 일정 상세에서 일반 일정을 수정하고 확인 후 취소할 수 있게 하며, 예약 관리 일정과 권한 오류를 사용자가 이해할 수 있게 표시한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/src/App.tsx`
- `frontend/src/index.css`

#### 수정 금지 경로

- `backend`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/cypress`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 일정 상세의 수정 진입, 기존 값 채움, 검증 오류, 저장되지 않은 변경 확인, 취소 확인과 중복 제출 방지의 실패 컴포넌트 테스트를 먼저 작성한다.
- [ ] Task 5 상세 API의 서버 계산 `canManage`, `meetingRoomManaged`를 사용해 수정·취소 행동을 표시하되 UI 숨김이 서버 권한 검사를 대체하지 않도록 API 오류를 처리한다.
- [ ] 수정 Form은 생성 Form의 계약과 검증을 재사용하고 성공 시 해당 목록·상세 Query만 갱신하며 실패 시 기존 유효 데이터를 유지한다.
- [ ] 위험한 취소는 대상 일정과 결과가 드러나는 확인 절차를 제공하고 204 성공 후 목록·Banner·상세에서 제거한다.
- [ ] 404·409·권한·네트워크 오류를 구분해 사용자가 취할 행동을 안내하고 회의실 예약 관리 일정은 예약 취소 흐름을 사용해야 함을 표시한다.
- [ ] Green 이후 생성·수정 Form의 중복을 기능 경계 안에서 리팩터링하고 포커스 복귀와 PC·모바일 흐름을 유지한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features`로 수정 정상/검증 실패/권한, 취소 확인·성공·404·409·네트워크 실패, Query 갱신 시나리오를 통과한다.
- [ ] `cd frontend && npm run typecheck`와 `cd frontend && npm run lint`로 Task 5 계약 타입과 정적 규칙을 검증해 선행 Task 결과와의 계약 충돌이 없음을 확인한다.
- [ ] 1280×800과 390×844에서 키보드만으로 수정·취소·오류 복구가 가능하고 Modal 닫힘 후 초점이 원래 일정으로 복귀하는지 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-017, FR-018 및 Mandatory Gate G1~G7이 충족되어야 한다.
- TDD Red → Green → Refactor와 검증 결과가 기록되어야 한다.
- 등록자·예약 관리 상태별 행동, 위험 확인, 오류 복구와 Query 갱신이 접근 가능하게 동작해야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- `quality_score`가 85 이상이어야 한다.

#### 실패 조건

- 비등록자에게 상태 변경이 성공한 것처럼 표시하거나 서버 권한 오류를 숨김
- 취소 확인, 예약 관리 안내, 포커스 복귀, 모바일 핵심 흐름 또는 기존 데이터 보존 누락
- 테스트·Type Check·Lint 실패 또는 3회 수정 후 동일 실패가 남음
- Product Spec·Design Doc과 다른 UX 또는 수정 가능 경로 밖 변경
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 85 미만

#### 제외 범위

- 취소 일정 복구·감사 조회 UI
- 회의실 예약 수정·취소 화면과 알림 UI
- Drag and Drop 수정, 반복 일정, 대량 편집

#### 작업 결과

`none`

#### 남은 문제

- 회의실 예약 취소 화면의 실제 경로는 meeting-room 기능에서 확정되므로 Calendar MVP는 관리 주체 안내까지만 제공한다.
- 실제 로그인 Session과 사용자 권한에 따른 행동·오류 연결은 타 팀 기능 완료 후 Task 7에서 수행한다.

---

### Task 7. 사용자·인증·인가 기능과 Calendar 연동

#### 선행 Task

- `Task 6`

#### 작업 목적

타 팀의 사용자·인증·인가·로그인 기능이 완료된 이후 Calendar의 외부 Port와 UI 계약을 실제 인증 Principal, 사용자 검색, 팀 소속과 프로젝트 참여 정보에 연결해 보호된 API를 완성한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi`
- `backend/API.md`
- `frontend/src/features`
- `frontend/src/pages`
- `frontend/src/App.tsx`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/java/com/flowbi/domain/team`
- `backend/src/main/java/com/flowbi/domain/project`
- `backend/build.gradle`
- `backend/DB_SCHEMA.md`
- `backend/src/main/resources/db/migration`
- `frontend/cypress`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 실제 인증 Principal과 사용자·소속 계약을 사용한 실패 통합 테스트를 먼저 작성해 미인증, 비활성 사용자, 비등록자 변경, 비공개 일정 IDOR, 접근 불가 참석자·팀·프로젝트를 Red로 확인한다.
- [ ] 타 팀의 인증 계약과 `docs/design-docs/authentication-and-permission.md`에 따라 Identity & Access가 검증한 Principal에서 Actor를 얻어 Task 1·3·5의 Calendar Use Case에 전달하는 보호 Controller와 Adapter를 구현한다.
- [ ] 활성 사내 사용자 참석자 검색을 정규화된 1~50자 검색어, 최대 20건, 안정적인 정렬과 `userId`, `displayName` 최소 응답으로 구현하고 비활성·퇴사·접근 불가 사용자를 제외한다.
- [ ] 일정 생성·수정 시 참석자와 팀·프로젝트의 존재·활성·현재 Actor의 접근 가능성을 실제 사용자·조직·프로젝트 기능을 통해 검증한다.
- [ ] 목록·상세·수정·취소에서 PERSONAL 작성자·참석자, TEAM 소속·참석자, PROJECT 참여자·참석자 공개 정책과 등록자 변경 권한을 실제 데이터로 적용한다.
- [ ] Frontend Calendar API Client를 타 팀이 제공한 인증 Session과 실제 보호 Endpoint에 연결하고 401·403·404·409, 인증 만료와 권한 상태를 기존 UI 흐름에 반영한다.
- [ ] Calendar 목록·상세·생성·수정·취소·참석자 검색 중 보호 API가 `401 UNAUTHENTICATED`를 반환하면 기존 로그인 화면으로 전환하고, `403`·`404`는 로그인 상태를 유지한 채 기존 Calendar 오류 흐름으로 처리하는 실패 Frontend Test를 먼저 작성한 뒤 공통 Session 만료 연결을 구현한다.
- [ ] Green 이후 인증 구현 세부사항이 Calendar 도메인에 유출되지 않도록 Adapter와 Mapping 책임만 리팩터링한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew test --tests '*Schedule*Security*' --tests '*Schedule*UserIntegration*'`로 실제 Security Test Fixture를 사용한 인증·객체 수준 인가·IDOR·사용자 상태·소속 변경 시나리오를 통과한다.
- [ ] `cd backend && ./gradlew test --tests '*Schedule*Controller*' --tests '*Schedule*Attendee*'`로 보호 Endpoint와 참석자 검색의 Status·Error Code·최소 응답·개인정보 비노출을 확인한다.
- [ ] `cd frontend && npm run test:unit -- --run src/features`, `cd frontend && npm run test:unit -- --run src/test/App.test.tsx`와 `cd frontend && npm run typecheck`로 실제 인증 Session 계약, Calendar `401` 로그인 전환, `403`·`404` 상태 유지와 Task 2·4·6 사용자 흐름 간 충돌·회귀가 없음을 확인한다.
- [ ] `cd backend && ./gradlew spotlessCheck`와 `cd frontend && npm run lint`로 양 영역의 정적 규칙을 확인한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- 타 팀의 사용자·인증·인가·로그인 기능과 통합 Test Fixture가 완료 상태로 제공되어야 한다.
- 타 팀이 제공한 인증 사용자 경계가 관련 Design Doc과 일치하고 Calendar 연동 계약이 양 팀에서 확인되어야 한다.
- FR-011~FR-018, NFR-001 및 Mandatory Gate G1~G7의 Calendar 적용 범위가 충족되어야 한다.
- TDD Red → Green → Refactor와 미인증·권한·IDOR·개인정보 검증 결과가 기록되어야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 보안·개인정보 위험을 반영해 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- Calendar가 JWT 정책, 로그인 또는 사용자·조직 원장 기능을 중복 구현하거나 타 팀 소유 경로를 변경함
- 요청 Body·Path의 사용자 ID를 인증 Principal 대신 신뢰하거나 미인증·비인가·IDOR 요청이 허용됨
- 비활성·퇴사·접근 불가 사용자를 참석자로 노출하거나 개인정보를 과도하게 반환함
- 테스트·Type Check·Lint·Formatting 실패 또는 3회 수정 후 동일 실패가 남음
- Product Spec·Design Doc·타 팀 인증 계약과 다른 동작, 수정 가능 경로 밖 변경 또는 `quality_score` 90 미만

#### 제외 범위

- 로그인 화면, JWT 발급·검증·저장·회전, Refresh Token과 Session 정책 구현
- 사용자·팀·프로젝트 원장 및 RBAC 기능 구현·수정
- 관리자 권한 모델과 Calendar 관리자 변경 권한 추가

#### 작업 결과

`none`

#### 남은 문제

- 타 팀 기능이 준비되지 않은 동안 이 Task는 `BLOCKED`이며 Task 1~6의 독립 완료 결과는 유지한다.

---

### Task 8. Calendar Frontend 사용자 흐름 통합 검증

#### 선행 Task

- `Task 7`

#### 작업 목적

Calendar MVP의 생성·월주일 조회·상세·수정·취소 흐름과 주요 오류·접근성·반응형 동작을 Frontend 단위·컴포넌트 통합 테스트로 고정한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/pages`
- `frontend/src/test`

#### 수정 금지 경로

- `frontend/cypress`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `docs/plans`

#### 구현 항목

- [ ] 월간 첫 화면, 월·주·일 전환, 날짜 Banner, 상세 Modal, 일정 생성·수정·취소 핵심 흐름의 실패 컴포넌트 통합 테스트를 먼저 작성한다.
- [ ] 통제된 응답으로 Loading·Empty·네트워크 Error를 검증하고, 실제 인증 Session과 Backend 연결로 Permission·인증 만료·비공개·취소 일정 미표시와 회의실 예약 관리 일정의 409 안내를 검증한다.
- [ ] Desktop 1280×800과 Mobile 390×844에서 키보드 탐색, Modal·Overlay 초점 이동과 복귀, 취소 확인, 색상 외 텍스트 대안과 가로 Overflow 부재를 검증한다.
- [ ] 실제 PostgreSQL Test 환경에 한 달 범위 1,000건의 접근 가능한 일정을 준비해 인증된 사용자로 20회 Warm Run하고 보기 이동 시작부터 Calendar settled 상태까지 p95 3초 이내인지 측정해 환경·표본·결과를 기록한다.
- [ ] Green 이후 Selector를 접근 가능한 Role·Name 중심으로 정리하고 Task 2·4·6 사용자 흐름의 회귀를 탐지할 수 있게 중복 Setup만 리팩터링한다.

#### 검증 항목

- [ ] `cd frontend && npm run test:unit -- --run src/features`로 Calendar 단위·컴포넌트 통합 테스트를 통과한다.
- [ ] Task 7의 실제 보호 API가 사용하는 Status·Error Code·Response Field와 Fixture·Intercept를 대조하고 실제 Backend 생성·조회·수정·취소 흐름 간 통합 충돌과 회귀가 없음을 확인한다.
- [ ] 성능 실패를 대기 시간 증가나 Assertion 완화로 우회하지 않고 재현 조건과 병목 범위를 작업 결과에 기록한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되어야 한다.
- FR-011~FR-018, NFR-003, NFR-006 및 Mandatory Gate G1~G7이 충족되어야 한다.
- Frontend 테스트 TDD Red → Green → Refactor와 Viewport·키보드·성능 검증 결과가 기록되어야 한다.
- 핵심 흐름과 주요 실패 상태의 사용자 관찰 결과가 컴포넌트 통합 테스트로 검증되고 Test가 실제 API 계약과 일치해야 한다.
- 수정 범위가 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- 전체 사용자 흐름 위험을 반영해 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 핵심 생성·조회·상세·수정·취소 흐름 또는 PC·모바일·키보드 시나리오 누락
- 실제 API 계약과 다른 Mock, 실제 인증 Backend 검증 누락, 실패 상태 우회, 취소·비공개 일정 노출 또는 p95 3초 초과
- Frontend 단위·컴포넌트 통합 테스트 실패 또는 3회 수정 후 동일 실패가 남음
- Product Spec·Design Doc과 다른 동작 또는 수정 가능 경로 밖 변경
- TDD 증거 부재, 검증 불가 상태 또는 `quality_score` 90 미만

#### 제외 범위

- 신규 Frontend 테스트 의존성 도입
- 회의실 예약·알림·AI Assistant의 End-to-End 흐름
- 운영 환경 부하·가용성·지원 Browser 전체 Matrix 검증

#### 작업 결과

`none`

#### 남은 문제

- 실제 Backend와 PostgreSQL Test 환경을 사용한 성능 검증 방식은 Harness 실행 환경에서 가용해야 하며, 해당 환경이 없으면 성능 검증을 `BLOCKED`로 기록한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과하고 Red → Green → Refactor 증거가 기록되어야 한다.
- Task 1~6은 외부 인증 기능과 독립된 Calendar 구현 Milestone으로 완료할 수 있지만, Task 7과 Task 8이 끝나기 전에는 Calendar MVP 전체를 완료로 보고하지 않아야 한다.
- Task 간 결과가 정상적으로 통합되고 Calendar 생성·월주일 조회·상세·수정·취소 흐름이 동작해야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- FR-011~FR-018, NFR-003, NFR-006과 관련 API·DB·사용자 동작 문서가 실제 구현과 일치해야 한다.
- 타 팀의 사용자·인증·인가·로그인 기능과 통합 Test Fixture가 완료된 후 Task 7에서 실제 연동을 검증해야 한다.
- ADR-0001과 ADR-0002가 사람 승인으로 `ACCEPTED`되고 구현이 승인된 Schema·Migration·PostgreSQL 검증 결정과 일치해야 하며, 인증 연동은 타 팀 계약과 관련 Design Doc에 일치해야 한다.
- 인증·공개 범위·IDOR·시간 경계·Transaction·취소 이력·동시성 Mandatory Gate가 통과해야 한다.
- 모든 Task 완료 후 Harness 실행기가 `cd backend && ./gradlew spotlessCheck && ./gradlew test && ./gradlew build`, `cd frontend && npm run check`를 한 번 실행해 모두 통과해야 한다.
- 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 타 팀의 사용자·인증·인가·로그인 기능이 아직 준비되지 않은 상태만으로 Task 1~6을 실패 처리하지 않는다. 이 경우 Plan 전체는 Task 7부터 `BLOCKED`로 기록한다.
- 하나 이상의 필수 Task가 실패하거나 같은 오류에 대한 3회 수정 후에도 검증이 실패함
- 필수 검증 명령, PostgreSQL Migration 검증, Frontend 핵심 흐름 또는 성능 기준이 실패함
- Task별 수정 가능 경로 밖 변경 또는 수정 금지 경로 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌하거나 API·DB·화면 계약이 동기화되지 않음
- 인증 우회, 권한·IDOR·개인정보 노출, 부분 저장, 데이터 손실, 물리 삭제 또는 회의실 예약 관리 경계 침범이 발생함
- `PROPOSED` 또는 미승인 ADR에 의존해 Schema·Migration을 구현하거나 타 팀 계약과 다른 인증 정책 변경 또는 품질 Gate 완화가 포함됨
- 미실행 검증과 남은 문제가 사용자 확인 없이 방치되거나 완료로 보고됨
- 전체 `quality_score`가 90 미만임
