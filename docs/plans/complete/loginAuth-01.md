# 작업 계획: loginAuth-01

## 1. 기본 정보

### 사용자 요청

사번과 비밀번호로 로그인하는 인증 기능과 Login Page를 구현한다. 로컬 개발 및 E2E 검증에 사용할 합성 테스트 계정을 생성하고, 운영 환경에는 노출되지 않는 조건에서 Login Page에 테스트 사번과 비밀번호를 안내한다. DB 생성, 보안·세션 기반, API, Frontend 화면, 브라우저 통합 검증을 성격이 다른 Task로 분리하고 실행 순서와 보안 위험을 검증한다.

### 작업 목적

FR-009, FR-010, NFR-001, NFR-002를 충족하도록 Spring Security와 Redis 기반 서버 세션 인증을 완성한다. 로그인 성공·실패, 최초 로그인 비밀번호 변경 강제, 현재 세션 로그아웃, 보호 경로 접근 제한을 Backend와 Frontend에서 일관되게 제공하며, 테스트 편의 기능이 운영 자격정보 노출이나 인증 우회로 이어지지 않게 한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/auth.md`, `docs/product-specs/global-layout.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`

### 확정 범위와 실행 전 승인 게이트

- 확정 범위는 자체 사번 로그인, Redis 기반 Spring Session, 내부 `userId` Principal, 비밀번호 단방향 해시, 최초 로그인 비밀번호 변경 강제, 현재 세션 로그아웃, 현재 인증 세션 상태 조회, 인증·변경 필요 상태에 따른 접근 제한이다.
- 정상 로그인 검증용 계정과 `mustChangePassword=true`인 최초 로그인 검증용 계정을 서로 다른 합성 계정으로 준비한다.
- `backend/BACKEND.md`에서 미결정인 Migration 도구와 PostgreSQL 통합 테스트 환경은 각각 Flyway와 Testcontainers 사용
- 구현 계약으로 세션 유휴 만료 1시간, 절대 만료 10시간, `SameSite=Lax`, 운영 `Secure=true`, Cookie 기반 CSRF Token과 변경 요청 Header 검증
- 반복 로그인 실패 제한은 사번과 요청 출처를 함께 고려하는 Redis 원자 카운터, 15분 구간 내 5회 실패 시 15분 제한, 성공 시 해당 사번 실패 상태 초기화
- 비밀번호 정책은 영문과 숫자 그리고 특수문자를 포함한 10자 이상으로 정한다.

---

## 2. 실행 Task

### Task 1. 인증 DB 스키마·영속성·로컬 테스트 계정 생성

#### 선행 Task

- 없음

#### 작업 목적

기준선의 `users`와 `user_credentials` 인증 구조를 실행 가능한 Migration과 영속 계층으로 구현하고, 운영과 격리된 로컬/E2E 합성 계정을 안전하게 생성한다.

#### 수정 가능 경로

- `backend/build.gradle`
- `backend/src/main/resources`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/scripts`
- `backend/DB_SCHEMA.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: PostgreSQL에서 사번 Unique, 사용자별 인증정보 1:1 Unique, 필수 FK, `must_change_password` 기본값, 비밀번호 해시 길이와 영속 조회를 검증하는 실패 테스트를 먼저 작성하고 의도한 실패를 기록한다.
- [ ] Green: 승인된 Flyway와 PostgreSQL Testcontainers 의존성을 추가하고 `users`, `user_credentials` 및 합성 계정에 필요한 최소 참조 테이블 Migration을 기준선 스키마와 일치하게 작성한다.
- [ ] Green: `userId`와 사번을 분리하고 비밀번호 해시를 DTO나 일반 사용자 조회에 노출하지 않는 Entity·Repository를 구현한다.
- [ ] Green: `local`/`test` Profile과 명시적 활성화 Flag가 모두 있을 때만 두 개의 합성 계정을 멱등 생성하고, 주입된 평문 비밀번호는 해시 후 저장하며 로그·예외·세션에 남기지 않는다.
- [ ] Green: 테스트 계정 환경변수가 누락되거나 두 계정이 중복되거나 Production Profile에서 활성화 Flag가 켜지면 안전하게 시작을 거부한다.
- [ ] Refactor: Migration, 영속 모델, Fixture 생성 책임을 분리하고 `backend/DB_SCHEMA.md`에 실제 Migration과 환경별 Fixture 경계를 동기화한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.persistence.*"`로 PostgreSQL Mapping, Constraint, 조회, 멱등 Fixture 생성, 운영 차단 테스트를 통과한다.
- [ ] Migration을 빈 PostgreSQL DB에 적용한 뒤 재적용해 성공하고, 실패 Migration이 부분 적용되지 않음을 확인한다.
- [ ] 저장된 비밀번호가 주입한 평문과 다르고 BCrypt 검증으로만 일치하며, 쿼리·로그·테스트 리포트에 평문과 해시가 출력되지 않음을 확인한다.
- [ ] Task 1 변경 파일에 실제 사번·비밀번호·운영 개인정보가 포함되지 않았는지 Secret 검색을 수행한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 통과하고 FR-009, NFR-002 및 Mandatory Gate G1~G7을 충족해야 한다.
- Migration과 `backend/DB_SCHEMA.md`가 일치하고 TDD Red → Green → Refactor 증거가 있어야 한다.
- 수정 범위가 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- 승인된 Migration·PostgreSQL 테스트 도구만 사용하고 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- Migration 도구 또는 PostgreSQL 테스트 환경 승인을 받지 못함
- H2만으로 PostgreSQL 호환성을 완료 처리함
- 평문 비밀번호, 비밀번호 해시 또는 실제 개인정보가 소스·문서·로그에 노출됨
- Production Profile에서 합성 테스트 계정이 생성됨
- 필수 테스트 실패, TDD 증거 누락, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 직원 CRUD, 관리자 임시 비밀번호 발급·초기화 API와 화면
- 역할·권한 전체 Seed와 조직 관리 기능
- 기준선 밖 DB 구조 개선 및 파괴적 Migration

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 1. Spring Security·Redis Session·Cookie·CSRF 기반 구성

#### 선행 Task

- 없음

#### 작업 목적

브라우저 인증의 공통 기반을 Spring Security와 Spring Session Redis로 구성하고, 공개 Endpoint Allowlist·보호 API·Cookie·CSRF·만료 정책을 실패 폐쇄 방식으로 적용한다.

#### 수정 가능 경로

- `backend/build.gradle`
- `backend/src/main/resources`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `backend/DB_SCHEMA.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 공개 Endpoint 외 익명 요청 거부, Session Cookie 속성, 인증 성공 시 Session ID 교체, CSRF 누락·불일치 거부, Redis 장애 시 인증 거부를 표현하는 Security 통합 테스트를 먼저 작성한다.
- [ ] Green: 승인된 Spring Security·Spring Session Redis 의존성을 활성화하고 Principal 인덱스를 지원하는 Redis Session Repository를 구성한다.
- [ ] Green: `/api/auth/login`과 CSRF bootstrap에 필요한 최소 공개 경로만 명시하고 나머지 API를 기본 거부한다.
- [ ] Green: 승인된 유휴·절대 만료, `HttpOnly`, 환경별 `Secure`, `SameSite`, Cookie Path를 적용하며 Session Cookie에 사용자 정보를 넣지 않는다.
- [ ] Green: Cookie 기반 CSRF Token 발급과 상태 변경 요청 Header 검증을 구성하고, CORS는 승인된 동일 출처 또는 명시적 Origin만 Credential과 함께 허용한다.
- [ ] Green: 비밀번호·Cookie·CSRF Token·Redis 내부 Key가 응답 Body나 로그에 노출되지 않게 보안 로깅 경계를 적용한다.
- [ ] Refactor: Security Configuration, Cookie/Session 설정, 인증 실패 응답 변환 책임을 분리하고 확정된 계약을 `backend/API.md`에 동기화한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.security.*"`로 익명 접근, 공개 경로, Session Fixation, Cookie, 만료, CSRF, CORS, Redis 실패 폐쇄를 검증한다.
- [ ] Task 1의 영속 계약을 다시 시험하지 않고 Security 테스트 Fixture가 실제 Repository 계약과 충돌하지 않는지 컴파일로 확인한다.
- [ ] `backend/API.md`의 Cookie·CSRF·오류 계약과 구현 설정명이 일치하는지 정적 확인한다.
- [ ] 응답 Header와 로그 Capture에 비밀번호, Session ID 전체 값, CSRF Token 전체 값이 남지 않는지 확인한다.

#### 완료 조건

- NFR-001과 SECURITY 세션 기준, Mandatory Gate G1~G7을 충족하고 TDD 증거가 있어야 한다.
- 공개 경로가 Allowlist로 제한되고 보호 API가 익명·CSRF 실패·Redis 장애 시 안전하게 거부되어야 한다.
- API 문서와 구현이 일치하고 Task 1 계약과 충돌하지 않아야 한다.
- 수정 가능·금지 경로를 준수하고 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- Cookie·CSRF·만료 정책 승인을 받지 못함
- Security 또는 CSRF를 비활성화해 테스트를 통과시킴
- Redis 장애 시 로컬 인증 상태로 우회하거나 허용함
- 민감정보 노출, API 계약 불일치, 테스트 실패, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 로그인 Credential 검증과 로그인 실패 제한
- 비밀번호 변경, 로그아웃, 역할별 세부 인가
- Frontend 요청 연동

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 사용자별 Session Generation 검증·무효화 기반 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

인증 Design Doc의 Principal 인덱스와 원자적 Session Generation 계약을 구현해 비밀번호·권한 변경 시 기존 세션을 즉시 논리 차단하고 멱등 삭제할 기반을 제공한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/src/main/resources`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `backend/API.md`
- `backend/DB_SCHEMA.md`

#### 구현 항목

- [ ] Red: 내부 `userId` Principal 인덱스, 로그인 시 Generation 기록, 세대 불일치·변경 진행 상태 차단, 유지 세션 예외, Redis Key 유실·원자 연산 실패 시 실패 폐쇄 테스트를 먼저 작성한다.
- [ ] Green: 변경되지 않는 내부 `userId` 문자열을 Principal 이름으로 사용하고 Session의 `AUTH_GENERATION` 최소 속성을 관리한다.
- [ ] Green: 사용자별 Generation 증가와 변경 진행 상태 기록을 Redis 원자 연산으로 구현하며 개인정보 없는 Namespace와 충분한 TTL을 적용한다.
- [ ] Green: 모든 인증 요청에서 현재 Generation을 비교하고, 논리 차단 후 Principal 인덱스로 대상 Session을 찾아 `deleteById`로 멱등 정리한다.
- [ ] Green: 활성 Session이 있는데 Generation Key가 유실되거나 Redis 작업이 실패하면 인증과 보안 이벤트를 성공 처리하지 않고 감사 가능한 오류를 남긴다.
- [ ] Refactor: Generation Store, Session Index Cleanup, 요청 검증 Filter의 책임을 분리하고 Spring Session 내부 Key를 직접 조작하지 않게 한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.session.*"`로 다중 세션, 원자성, 동시 요청, Key 유실, 삭제 재시도와 실패 폐쇄를 검증한다.
- [ ] Task 2의 Security Filter 계약과 충돌하지 않고 현재 Task의 Generation 검증이 보호 요청마다 적용되는지 통합 테스트로 확인한다.
- [ ] Redis 저장 값과 Capture Log에 사번, 비밀번호, 해시, 일반 프로필이 포함되지 않는지 확인한다.
- [ ] 물리 Session 삭제 실패 후에도 세대 차이로 기존 Session이 사용할 수 없고 재시도가 멱등인지 확인한다.

#### 완료 조건

- 인증 Design Doc의 Session Generation·Principal 인덱스 계약과 Mandatory Gate G1~G7을 충족해야 한다.
- 동시성·Redis 실패 경계의 Red → Green → Refactor 증거와 관련 테스트 통과가 있어야 한다.
- Task 2 보안 기반과 충돌하지 않고 수정 가능·금지 경로를 준수해야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- Spring Session Redis 내부 Key를 애플리케이션이 직접 조작함
- 세대 비교 실패나 Redis 장애에서 인증을 허용함
- 변경 가능한 사번을 Principal로 사용함
- 테스트 실패, 동시성 검증 누락, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 로그인 Credential 검증 Endpoint
- 비밀번호 변경 Transaction
- 역할·권한 관리 API

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 로그인 API·실패 제한·감사 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

사번과 비밀번호를 검증해 안전한 서버 Session을 생성하고, 계정 열거를 막는 일반화 오류와 반복 실패 제한·감사 이벤트를 제공한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/src/main/resources`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `backend/DB_SCHEMA.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 정상 로그인, 존재하지 않는 사번·오류 비밀번호의 동일 응답, 비활성 사용자 거부, 실패 제한 429, 성공 시 제한 상태 초기화, 중복 제출, Redis 장애 실패 폐쇄 테스트를 먼저 작성한다.
- [ ] Green: 길이·형식을 검증한 사번과 비밀번호 DTO, 인증 Service, Controller를 구현하고 비밀번호는 BCrypt Matcher로만 비교한다.
- [ ] Green: 성공 시 Session ID를 교체하고 내부 `userId` Principal, 현재 Generation, 최소 역할·권한, `mustChangePassword` 상태만 인증 맥락에 반영한다.
- [ ] Green: 승인된 임계값으로 사번과 요청 출처 기반 Redis 원자 실패 제한을 적용하되 계정 존재·잠금 여부·비밀번호 불일치를 같은 사용자 메시지로 반환한다.
- [ ] Green: 성공·실패·제한·의존성 장애 감사 이벤트에 시간, 결과, 마스킹된 식별 정보와 추적 ID만 기록하고 비밀번호·Session ID·CSRF Token을 제외한다.
- [ ] Refactor: Credential 조회, Password 검증, Rate Limit, Session 생성, Audit 책임을 분리하고 Request Body를 로그로 직렬화하지 않는다.
- [ ] Refactor: Request·Response·오류 Code·HTTP 상태·CSRF 요구사항을 `backend/API.md`에 확정한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.login.*"`으로 정상·실패·제한·동시 요청·Redis 장애·Session Fixation 시나리오를 통과한다.
- [ ] Repository·Security·Generation 계약과 로그인 구현이 충돌하지 않는지 현재 API 통합 테스트의 실제 구성으로 확인한다.
- [ ] 존재하지 않는 사번과 잘못된 비밀번호가 Status·Error Code·Message·응답 시간 정보에서 계정 존재를 구분 가능하게 만들지 않는지 확인한다.
- [ ] 감사 로그 Capture와 API 응답에서 평문 비밀번호, 해시, 전체 Session/CSRF 값, Stack Trace가 없음을 확인한다.

#### 완료 조건

- FR-009, NFR-001, NFR-002와 로그인 Product Spec 인수 조건 및 Mandatory Gate G1~G7을 충족해야 한다.
- 승인된 실패 제한 정책을 구현하고 TDD 증거와 API 문서 동기화가 있어야 한다.
- 선행 보안·세션 계약과 충돌하지 않고 수정 가능·금지 경로를 준수해야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 로그인 실패 제한 임계값의 Design Doc 승인·선행 갱신이 없음
- 계정 존재 여부가 응답이나 로그로 드러남
- 인증 성공 시 Session ID를 교체하지 않거나 Redis 실패를 허용함
- 테스트·계약 검증 실패, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 외부 인증, SSO, JWT Access/Refresh Token
- 비밀번호 찾기와 관리자 초기화
- Login Page 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 최초 로그인 비밀번호 변경 강제 API 구현

#### 선행 Task

- 없음

#### 작업 목적

임시 비밀번호 계정의 일반 기능 접근을 차단하고, 승인된 새 비밀번호로 변경하면 현재 Session만 유지한 채 다른 Session을 즉시 무효화한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `backend/DB_SCHEMA.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 변경 필요 사용자의 일반 API 403, 변경·로그아웃 허용, 새 비밀번호 확인 불일치·정책 위반 거부, 재사용 임시 비밀번호 거부, 현재 Session 유지·다른 Session 차단 테스트를 먼저 작성한다.
- [ ] Green: `mustChangePassword` 인증 후처리와 허용 Endpoint Allowlist를 구현해 일반 기능을 기본 거부한다.
- [ ] Green: 새 비밀번호와 확인값을 서버에서 검증하고 승인된 BCrypt 정책으로 해시한 뒤 Credential 갱신과 `must_change_password=false`를 하나의 DB Transaction으로 처리한다.
- [ ] Green: Session Generation을 원자 증가해 다른 Session을 먼저 논리 차단하고, DB 성공 후 현재 Session Generation 갱신·다른 Session 멱등 삭제·변경 진행 상태 정리를 수행한다.
- [ ] Green: DB 실패, Redis 실패, 물리 삭제 실패별 안전 상태와 감사 로그를 구현하며 이전 비밀번호를 응답·로그·Session에 남기지 않는다.
- [ ] Refactor: Password Policy, Transaction, Session Invalidation, API 응답 책임을 분리하고 `backend/API.md` 계약을 동기화한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.password.*"`로 정책 경계, Transaction Rollback, 다중 Session, Redis/DB 실패, 동시 변경을 검증한다.
- [ ] Task 3 Generation 계약과 Task 4 로그인 결과가 현재 Task의 제한 Filter·Session 유지 흐름과 충돌하지 않는지 통합 테스트로 확인한다.
- [ ] 변경 전후 DB에는 평문이 없고 현재 Session 외 기존 Session이 보호 API를 호출할 수 없음을 확인한다.
- [ ] `backend/API.md`와 Request·Response·오류 Code·허용 Endpoint가 일치하는지 확인한다.

#### 완료 조건

- 인증 Product Spec의 최초 로그인 흐름, NFR-001, NFR-002와 Mandatory Gate G1~G7을 충족해야 한다.
- 승인된 비밀번호 정책과 원자적 Session 무효화 계약이 테스트되고 TDD 증거가 있어야 한다.
- 선행 Task 계약과 충돌하지 않고 수정 가능·금지 경로를 준수해야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 비밀번호 정책의 Design Doc 승인·선행 갱신이 없음
- 비밀번호 변경 전 일반 기능 접근을 허용함
- DB와 Redis 실패에서 이전 Session이나 변경 중 로그인을 허용함
- 현재 Session까지 잘못 종료하거나 다른 Session을 유효하게 남김
- 테스트 실패, 민감정보 노출, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 마이페이지의 일반 비밀번호 변경 UI
- 관리자 비밀번호 초기화
- 비밀번호 변경 이력·주기 정책

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. 현재 세션 로그아웃 API 구현

#### 선행 Task

- `Task 4`

#### 작업 목적

로그인 사용자와 비밀번호 변경 필요 사용자가 현재 Session을 안전하게 종료하고, 종료된 Cookie로 보호 API에 다시 접근하지 못하게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `backend/DB_SCHEMA.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 정상 로그아웃, 변경 필요 사용자 로그아웃, CSRF 없는 요청 거부, 반복 로그아웃의 안전한 결과, 종료 Session 재사용 거부 테스트를 먼저 작성한다.
- [ ] Green: `POST /api/auth/logout`에서 현재 HttpSession만 무효화하고 Session Cookie를 동일 속성·Path로 만료한다.
- [ ] Green: 로그아웃 성공·실패 감사 이벤트를 남기되 Session ID와 인증정보를 기록하지 않는다.
- [ ] Green: 익명·이미 만료된 Session 처리 결과가 계정 또는 이전 Session 상태를 과도하게 노출하지 않게 한다.
- [ ] Refactor: Spring Security Logout 처리와 API 오류 계약을 정리하고 `backend/API.md`를 구현과 동기화한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.logout.*"`으로 정상·반복·CSRF·만료·변경 필요 사용자 흐름을 검증한다.
- [ ] Task 2 Cookie/CSRF와 Task 5 제한 Allowlist 계약이 현재 Logout 처리와 충돌하지 않는지 API 통합 테스트로 확인한다.
- [ ] 로그아웃 응답 Cookie와 이후 보호 요청 401을 확인하고 다른 브라우저 Session은 유지됨을 확인한다.
- [ ] 로그와 응답에 Session ID, CSRF Token, 비밀번호 정보가 없는지 확인한다.

#### 완료 조건

- FR-010과 인증 Product Spec 로그아웃 인수 조건 및 Mandatory Gate G1~G7을 충족해야 한다.
- 현재 Session만 무효화되고 TDD 증거와 API 계약 동기화가 있어야 한다.
- 선행 보안 계약과 충돌하지 않고 수정 가능·금지 경로를 준수해야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 로그아웃 뒤 Session 재사용이 가능함
- 다른 사용자의 Session 또는 같은 사용자의 다른 Session을 함께 삭제함
- CSRF 검증을 우회함
- 테스트·계약 검증 실패, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 전체 기기 로그아웃과 기기별 Session 관리 UI
- 관리자 강제 로그아웃
- Frontend 로그아웃 요소

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 6. Login Page·테스트 계정 안내·로그인 연동 구현

#### 선행 Task

- `Task 5`

#### 작업 목적

사번·비밀번호를 접근성 있게 입력하고 로그인 API 상태를 정확히 표시하며, 로컬/E2E 환경에서만 주입된 합성 테스트 계정을 안내하는 Login Page를 구현한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/test`
- `frontend/cypress/e2e`

#### 수정 금지 경로

- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 사번·비밀번호 Label, 필수 입력, 제출 중 중복 방지, 일반화된 오류, 429 안내, 키보드 제출, 비밀번호 비노출 기본값, 성공 분기를 사용자 관찰 동작으로 표현하는 Component 테스트를 먼저 작성한다.
- [ ] Green: `features/auth` 경계에 Login Form Schema, API Client, 오류 Mapping, Page·Component를 구현하고 Cookie 요청에 `credentials: include`와 CSRF Header를 적용한다.
- [ ] Green: 로그인 성공 응답의 `mustChangePassword`에 따라 비밀번호 변경 화면 또는 인증 후 기본 화면으로 이동하고, 401·429·503을 성공이나 빈 상태로 위장하지 않는다.
- [ ] Green: 개발 빌드와 명시적 표시 Flag가 모두 참일 때만 런타임 주입된 정상·최초 로그인 합성 계정의 사번과 비밀번호를 별도 안내 영역에 표시한다.
- [ ] Green: Production Build, 표시 Flag 누락, Credential 누락·불일치 시 안내 영역과 값이 DOM·번들·Source Map에 나타나지 않게 하고 테스트 계정 자동 입력은 제공하지 않는다.
- [ ] Green: 입력 `autocomplete` 의미, 오류 `aria-live`, Focus 이동, Mobile 폭, 접근 가능한 명암과 Loading 상태를 적용한다.
- [ ] Refactor: Form UI, API 상태, 환경별 테스트 안내를 분리하고 비밀번호를 Client Store·localStorage·sessionStorage·Console에 저장하지 않는다.

#### 검증 항목

- [ ] `npm run test:unit -- --run src/features/auth`로 정상·실패·제한·중복 제출·접근성·환경별 안내 표시 테스트를 통과한다.
- [ ] Task 4~6의 실제 API 계약과 Frontend Request·Response·Error Mapping이 충돌하지 않는지 타입과 Fixture를 정적 비교한다.
- [ ] `npm run typecheck`와 대상 Auth 파일 ESLint·Prettier 검사를 통과한다.
- [ ] Production Mode Build 산출물에서 테스트 사번·비밀번호·환경변수 값과 Credential 안내 문구가 존재하지 않는지 검색한다.

#### 완료 조건

- FR-009, 로그인 화면 인수 조건, Frontend 접근성 기준과 Mandatory Gate G1~G7을 충족해야 한다.
- 로컬/E2E에서만 테스트 계정 안내가 보이고 Production에서는 완전히 제거되어야 한다.
- API 계약과 충돌하지 않고 TDD 증거 및 수정 가능·금지 경로 준수가 있어야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 테스트 계정 값이 Git 추적 파일·Production Bundle·DOM·로그에 포함됨
- 비밀번호를 Browser Storage나 전역 상태에 저장함
- 계정 존재 여부를 구분하는 오류를 표시하거나 중복 제출을 허용함
- 테스트·Type Check·정적 검증 실패, API 계약 불일치, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 회원가입, 비밀번호 찾기, SSO UI
- 관리자 계정 발급·초기화 UI
- 일반 기능 전체 Layout 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 7. 현재 인증 세션 상태 조회 API 구현

#### 선행 Task

- `Task 6`

#### 작업 목적

새로고침과 Browser History 직접 접근에서도 Frontend가 Client 상태를 신뢰하지 않고 현재 서버 Session을 기준으로 익명·비밀번호 변경 필요·변경 완료 상태를 결정할 수 있게 한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `docs/product-specs`
- `docs/design-docs`
- `backend/DB_SCHEMA.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 정상 Session, 비밀번호 변경 필요 Session, 익명·만료 Session, Session Generation 불일치, Redis 장애와 민감정보 비노출 테스트를 제품 코드보다 먼저 작성한다.
- [ ] Green: 인증된 현재 Session을 조회하는 `GET /api/auth/session`을 구현하고 `200 OK`와 `{ "authenticated": true, "mustChangePassword": boolean }`을 반환한다.
- [ ] Green: Session이 없거나 만료됐거나 Generation이 불일치하면 `401 UNAUTHENTICATED`, Redis 또는 Session Store를 사용할 수 없으면 `503 AUTH_SESSION_UNAVAILABLE`로 실패 폐쇄한다.
- [ ] Green: 비밀번호 변경 필요 사용자가 상태 조회 API에는 접근할 수 있도록 `MustChangePasswordFilter` Allowlist에 추가하되, 일반 보호 API의 `403 PASSWORD_CHANGE_REQUIRED` 제한은 유지한다.
- [ ] Green: 상태 응답에 사번, 비밀번호, 비밀번호 해시, Session ID, CSRF Token과 불필요한 개인정보를 포함하지 않고 `Cache-Control: no-store`를 적용한다.
- [ ] Refactor: 인증 상태 조회, Session 검증, 오류 응답 책임을 분리하고 `backend/API.md`에 Request·Response·오류·Cache 계약을 동기화한다.

#### 검증 항목

- [ ] `backend/gradlew.bat test --tests "com.flowbi.domain.auth.session.*"`로 정상·변경 필요·익명·만료·Generation 불일치·Redis 장애 흐름을 검증한다.
- [ ] 변경 필요 Filter 계약이 현재 상태 조회 API와 충돌하지 않는지 통합 테스트로 확인한다.
- [ ] 응답 Header·Body와 로그에 비밀번호, 해시, Session ID, CSRF Token과 불필요한 개인정보가 없고 `Cache-Control: no-store`가 적용됐는지 확인한다.
- [ ] `backend/API.md`와 상태별 HTTP Status·Error Code·Response Body·Allowlist가 일치하는지 확인한다.

#### 완료 조건

- 인증 Product Spec의 서버 Session 기준 접근 제한, NFR-001, NFR-002와 Mandatory Gate G1~G7을 충족해야 한다.
- 정상·변경 필요·익명·장애 상태가 서버 응답으로 구분되고 TDD 증거와 API 계약 동기화가 있어야 한다.
- 기존 Session Generation·비밀번호 변경 제한 계약과 충돌하지 않고 수정 가능·금지 경로를 준수해야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- Client가 인증 또는 권한 상태를 추정해야만 화면을 결정할 수 있음
- 비밀번호 변경 필요 Session이 상태 조회 API에서 차단되거나 일반 보호 API에 접근할 수 있음
- Session·Redis 장애에서 인증 상태를 성공으로 반환함
- 민감정보 노출, 테스트·계약 검증 실패, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 사용자 Profile·권한 상세 조회
- Session 목록·기기 관리·전체 기기 로그아웃
- Frontend 화면과 Client 상태 관리 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 8. 최초 비밀번호 변경 Page·보호 화면·로그아웃 연동 구현

#### 선행 Task

- `Task 7`

#### 작업 목적

최초 로그인 사용자를 비밀번호 변경 Page로 제한하고, 변경 완료 뒤 일반 화면으로 전환하며 인증 만료·로그아웃을 일관되게 처리한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/test`
- `frontend/cypress/e2e`

#### 수정 금지 경로

- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] Red: 변경 필요 사용자의 일반 화면 차단, 새 비밀번호·확인 검증, 제출 중 중복 방지, 정책 오류, 변경 성공, 인증 만료, 로그아웃 Focus 흐름을 Component 테스트로 먼저 작성한다.
- [ ] Green: 최초 비밀번호 변경 Form과 API 연동을 구현하고 현재/임시 비밀번호를 다시 요구하거나 Client Storage에 보관하지 않는다.
- [ ] Green: `GET /api/auth/session`으로 인증 상태를 bootstrap하고 `200` 응답의 `mustChangePassword` 값에 따라 변경 필요 사용자는 Password Change Page, 완료 사용자는 기본 인증 화면으로 보내며 `401`은 Login Page, `503`은 인증 상태 확인 실패 화면으로 보낸다.
- [ ] Green: Browser History 직접 접근과 새로고침에서도 서버 인증 상태를 기준으로 제한하며 UI 상태만으로 권한을 추정하지 않는다.
- [ ] Green: 공통 로그아웃 요소를 제공하고 성공·세션 만료 시 민감 상태를 제거한 뒤 Login Page로 이동한다.
- [ ] Green: 정책 오류, 네트워크 오류, 401·403·503을 구분해 사용자가 취할 행동을 안내하고 키보드·Focus·Mobile 접근성을 적용한다.
- [ ] Refactor: 인증 서버 상태, 화면 Guard, Password Form, Logout 동작 책임을 분리하고 불필요한 전역 상태를 만들지 않는다.

#### 검증 항목

- [ ] `npm run test:unit`으로 변경 강제·성공·실패·만료·로그아웃·직접 접근·접근성 테스트를 통과하고 Auth 대상 테스트 파일과 실행 결과를 증거로 남긴다.
- [ ] Password·Logout·Session API 계약과 Login·화면 분기가 충돌하지 않는지 실제 응답 Fixture와 타입으로 확인한다.
- [ ] `npm run typecheck`와 대상 Auth 파일 ESLint·Prettier 검사를 통과한다.
- [ ] 비밀번호 값이 Browser Storage, URL, Console, 오류 메시지에 남지 않고 로그아웃 후 메모리 상태가 초기화되는지 확인한다.

#### 완료 조건

- FR-010, 최초 로그인 변경 흐름, NFR-001, NFR-002와 Mandatory Gate G1~G7을 충족해야 한다.
- 인증·변경 필요·로그아웃 상태가 서버 응답을 기준으로 정확히 분기되고 TDD 증거가 있어야 한다.
- 선행 API·Login Page 계약과 충돌하지 않고 수정 가능·금지 경로를 준수해야 한다.
- `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 변경 필요 사용자가 일반 화면에 접근함
- 비밀번호를 URL·Storage·Console에 노출함
- Client 상태만으로 인증·권한을 허용함
- 테스트·Type Check·접근성 검증 실패, 계약 불일치, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 마이페이지 일반 비밀번호 변경
- 모든 기기 로그아웃·Session 목록 UI
- 실제 Dashboard 기능 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 9. 실제 세션 기반 Cypress 통합 검증

#### 선행 Task

- `Task 8`

#### 작업 목적

실제 Backend·PostgreSQL·Redis와 Browser Cookie를 사용하는 Cypress 시나리오를 구현해 로그인부터 변경 강제·보호 경로·로그아웃까지 최종 사용자 흐름과 운영 테스트 계정 비노출을 검증한다.

#### 수정 가능 경로

- `frontend/cypress/e2e`
- `frontend/cypress/support`
- `frontend/cypress.config.ts`
- `frontend/package.json`
- `frontend/scripts`

#### 수정 금지 경로

- `frontend/src`
- `backend`
- `docs/product-specs`
- `docs/design-docs`
- `ARCHITECTURE.md`
- `SECURITY.md`

#### 구현 항목

- [ ] 실제 Backend와 Redis를 포함한 E2E 실행 구성을 추가하고 Frontend Mock이나 인증 우회로 Session을 만들지 않는다.
- [ ] 정상 합성 계정의 안내 확인, 사번·비밀번호 로그인, 보안 Cookie 발급, 보호 화면 접근, 로그아웃, 종료 Session 재사용 거부 시나리오를 작성한다.
- [ ] 잘못된 사번과 비밀번호의 동일 오류, 반복 실패 제한, CSRF 누락·불일치, Session 만료·Redis 장애의 안전한 실패 시나리오를 작성한다.
- [ ] 최초 로그인 합성 계정의 비밀번호 변경 Page 강제, 일반 화면 직접 접근 차단, 새 비밀번호 변경, 현재 Session 유지와 기존 Session 무효화 시나리오를 작성한다.
- [ ] Production Mode 실행에서는 합성 계정 Seed가 없고 Login Page 안내·번들 문자열·Network 응답에 테스트 자격정보가 없음을 검증한다.
- [ ] 각 E2E 실행은 격리된 합성 데이터와 Redis Namespace를 사용하고 완료 후 운영 데이터에 영향을 주지 않는 정리 절차를 적용한다.

#### 검증 항목

- [ ] `npm run test:e2e -- --spec "cypress/e2e/login-auth/**/*.cy.ts"`로 현재 Task가 작성한 Browser 시나리오를 통과한다.
- [ ] 선행 Task의 DB·API·UI 계약을 Mock 없이 연결했을 때 Cookie, CSRF, Redirect, Error Mapping이 충돌하지 않는지 검증한다.
- [ ] Desktop과 Mobile Viewport에서 사번·비밀번호 입력, 오류 인지, Focus 이동, 변경 강제, 로그아웃 흐름을 완료한다.
- [ ] Cypress 영상·Screenshot·Command Log·JUnit 결과에 평문 비밀번호, Session ID, CSRF Token이 남지 않도록 민감 입력과 Header를 마스킹하고 산출물을 검색한다.

#### 완료 조건

- FR-009, FR-010, NFR-001, NFR-002 및 인증 Product Spec의 관련 인수 조건과 Mandatory Gate G1~G7을 실제 Browser 흐름으로 충족해야 한다.
- Frontend Mock·직접 Session 주입·Security 우회 없이 실제 Session Cookie와 Redis를 사용해야 한다.
- 선행 Task 계약과 충돌이 없고 수정 가능·금지 경로를 준수해야 한다.
- 보안·인증 기능 기준인 전체 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 실제 Backend·Redis 없이 Mock만으로 통과함
- Production에서 합성 계정이 생성되거나 테스트 Credential 안내가 노출됨
- Cypress 산출물에 비밀번호·Session ID·CSRF Token이 노출됨
- 핵심 정상·실패·변경 강제·로그아웃 시나리오 누락
- E2E 실패, 선행 계약 충돌, 범위 위반 또는 `quality_score`가 90 미만임

#### 제외 범위

- 성능·부하·침투 테스트
- 외부 SSO와 Mobile Native Client
- 관리자 비밀번호 초기화·역할 변경 Session 무효화 UI

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과하고 Red → Green → Refactor 실행 증거가 Task 결과에 남아야 한다.
- Task 간 결과가 정상 통합되고 DB → Security/Session → API → Frontend → Cypress 순서의 계약이 일치해야 한다.
- 각 Task의 수정 범위가 해당 수정 가능 경로를 벗어나지 않고 수정 금지 경로에 변경이 없어야 한다.
- `backend/gradlew.bat spotlessCheck`, `backend/gradlew.bat test`, `backend/gradlew.bat build`가 통과해야 한다.
- Frontend에서 `npm run check`와 `npm run test:e2e -- --spec "cypress/e2e/login-auth/**/*.cy.ts"`가 통과해야 한다.
- Migration 검증은 실제 PostgreSQL, Session 검증은 실제 Redis를 사용하고 H2나 Mock만으로 완료 처리하지 않아야 한다.
- `backend/API.md`, `backend/DB_SCHEMA.md`와 실제 구현이 일치해야 한다.
- 로그인 성공·실패·제한, 현재 인증 세션 상태 조회, 변경 필요 접근 제한, 비밀번호 변경, Session 무효화, 로그아웃, Production 테스트 계정 비노출 인수 조건이 모두 충족되어야 한다.
- 로그·응답·Session·Redis·Browser Storage·Build/E2E 산출물에 평문 비밀번호, 비밀번호 해시, 전체 Session ID, 전체 CSRF Token이 없어야 한다.
- 모든 Mandatory Gate를 통과하고 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 필수 검증 명령이 실패함
- 실행 전 승인 게이트 없이 Migration/Testcontainers, 인증·Cookie·CSRF·만료, 로그인 실패 제한, 비밀번호 정책을 구현함
- Task별 수정 가능 경로 밖 또는 수정 금지 경로에 변경이 발생함
- 관련 Product Spec, Design Doc, `SECURITY.md`, `ARCHITECTURE.md`와 구현이 충돌함
- 실제 PostgreSQL·Redis·Browser 통합 없이 Mock 또는 H2만으로 완료 처리함
- 인증·CSRF·Rate Limit·Session Generation 검증을 우회하거나 실패 시 접근을 허용함
- 운영 환경에 합성 테스트 계정이나 자격정보 안내가 노출됨
- 비밀번호·해시·Session ID·CSRF Token·운영 개인정보가 코드, 문서, 로그, 응답 또는 산출물에 노출됨
- TDD 증거가 없거나 테스트 삭제·단언 약화·검증 우회가 발생함
- 전체 `quality_score`가 90 미만이거나 남은 문제가 사용자 확인 없이 방치됨
