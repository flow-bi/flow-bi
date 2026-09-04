# 작업 계획: code-simplification-01

## 1. 기본 정보

### 사용자 요청

프론트엔드와 백엔드에서 무겁거나 불필요한 구현을 제거하고 기존 동작을 유지하는 최소 구조로 정리한다.

### 작업 목적

이미 설치된 라이브러리와 공용 UI를 재사용하고 사용하지 않는 의존성·기능 플래그·기본 구현을 제거하여 코드량과 테스트 실행 비용을 줄인다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `docs/product-specs/meeting-room.md`
- Design Doc: `frontend/DESIGN.md`
- Architecture: `ARCHITECTURE.md`, `backend/BACKEND.md`, `frontend/FRONTEND.md`
- 기타 참고 문서: `AGENTS.md`, `CONVENTIONS.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 프론트엔드 예약 흐름 단순화

#### 선행 Task

- `없음`

#### 작업 목적

회의실 예약의 수동 Form 상태·검증과 중복 Dialog를 기존 React Hook Form, Zod와 공용 확인 Dialog로 대체하고 사용하지 않는 기능 플래그와 의존성을 제거한다.

#### 수정 가능 경로

- `frontend/src/features/meeting-room`
- `frontend/src/shared/ui/ConfirmationDialog.tsx`
- `frontend/cypress/e2e/meeting-room/test-gateway.ts`
- `frontend/package.json`
- `frontend/package-lock.json`

#### 수정 금지 경로

- `frontend/src/features/organization-chart`
- `backend`
- `docs/product-specs`
- `docs/design-docs`

#### 구현 항목

- [ ] 예약 Form의 수동 상태·검증을 React Hook Form과 Zod로 통합한다.
- [ ] 예약 취소 Dialog를 공용 `ConfirmationDialog`로 대체하고 포커스 동작을 유지한다.
- [ ] 항상 활성 상태인 예약 기능 플래그와 미사용 Zustand 의존성을 제거한다.
- [ ] 예약 선택과 검색 조건 변경 사이에서 Form 초기값이 섞이지 않게 한다.

#### TDD 정책

- REGRESSION_ONLY

기존 동작을 변경하지 않는 리팩터링이므로 현재 단위·컴포넌트 테스트를 회귀 기준으로 사용한다.

#### 검증 항목

- [ ] `cd frontend && npm run check`를 통과한다.
- [ ] 회의실 생성·수정·취소와 키보드 포커스 테스트를 통과한다.

#### 완료 조건

- 모든 구현·검증 항목이 완료되어야 한다.
- 사용자 동작, API 계약과 접근성이 변경되지 않아야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Frontend Check 실패
- 예약 입력·검증·취소·포커스 동작 변경
- 신규 의존성 또는 불필요한 추상화 추가

#### 제외 범위

- 공개 API와 DB Schema 변경
- 조직도 기능의 미추적 작업
- Query Client 테스트 Wrapper의 일괄 교체

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 백엔드 설정과 테스트 비용 단순화

#### 선행 Task

- `Task 1`

#### 작업 목적

중복 의존성, 사용되지 않는 Schedule 기본 Bean과 불필요한 import·주석을 제거하고 Spring 통합 테스트의 불필요한 Context 재생성을 줄인다.

#### 수정 가능 경로

- `backend/build.gradle`
- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/test/PostgresSpringBootTest.java`

#### 수정 금지 경로

- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain/user`

#### 구현 항목

- [ ] Starter에서 전이 제공되는 `spring-security-crypto` 직접 의존성과 죽은 Build 주석을 제거한다.
- [ ] 사용되지 않는 Schedule 조회 기본 Bean과 불필요한 wildcard import를 제거한다.
- [ ] PostgreSQL 통합 테스트 Annotation의 `@DirtiesContext`를 제거한다.

#### TDD 정책

- REGRESSION_ONLY

제품 동작을 변경하지 않는 설정·구조 정리이므로 기존 Backend 테스트를 회귀 기준으로 사용한다.

#### 검증 항목

- [ ] `cd backend && ./gradlew spotlessCheck compileJava`를 통과한다.
- [ ] Backend 전체 테스트를 통과한다.
- [ ] Context 재사용 상태에서 테스트 격리 실패가 없어야 한다.

#### 완료 조건

- 모든 구현·검증 항목이 완료되어야 한다.
- 공개 API, DB Schema, 인증·인가와 트랜잭션 동작이 변경되지 않아야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- Backend Compile, Spotless 또는 테스트 실패
- 테스트 격리 또는 실행 순서 의존 문제 발생
- 공개 API, DB Schema 또는 보안 정책 변경

#### 제외 범위

- 목적이 다른 Testcontainer 설정의 일괄 통합
- 기존 `@MockBean` 폐기 예정 경고 정리
- 조직도 기능 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현·검증 항목이 완료되어야 한다.
- Frontend Check와 Backend 전체 테스트가 통과해야 한다.
- 다른 기능 작업을 새 Issue와 Commit에 포함하지 않아야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 기존 사용자 동작, API, DB 또는 보안 계약 변경
- 필수 검증 실패
- 다른 기능 구현이 Issue 또는 Commit에 혼입됨
