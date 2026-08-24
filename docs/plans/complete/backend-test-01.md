# 작업 계획: backend-test-01

## 1. 기본 정보

### 사용자 요청

PostgreSQL 전용 Flyway Migration 때문에 H2 기반 Backend 테스트가 실패하고 기준 데이터가 테스트 격리를 깨뜨리는 문제를 해결하여 `calendar-10`의 전체 검증을 다시 수행할 수 있게 한다.

### 작업 목적

적용된 Migration을 변경하거나 검증을 약화하지 않고, H2 보조 테스트와 PostgreSQL 통합 테스트의 책임을 분리한다. PostgreSQL 통합 테스트는 실제 전체 Migration과 기준 데이터가 존재하는 상태를 검증하고, H2 테스트는 PostgreSQL 전용 Migration을 실행하지 않은 채 테스트 대상 동작만 격리 검증하도록 정리한다.

### 작업 유형

- test

### 관련 설계 문서

- Product Spec: `docs/product-specs/system-quality.md`
- Design Doc: `docs/design-docs/core-beliefs.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `backend/AGENTS.md`, `backend/BACKEND.md`, `backend/DB_SCHEMA.md`, `docs/adrs/0002-calendar-migration-and-postgresql-verification.md`, `docs/adrs/0003-flyway-migration-version-management.md`, `docs/quality/quality-model.md`

### 요구사항 및 인수 조건

- `BE-TEST-DB-001`: H2 기반 보조 테스트는 PostgreSQL 전용 Migration SQL을 실행하지 않는다.
- `BE-TEST-DB-002`: Migration, DB 제약, 트랜잭션, 동시성과 영속 계약 테스트는 PostgreSQL Testcontainers에서 실행된다.
- `BE-TEST-DB-003`: PostgreSQL 테스트는 공유 기준 데이터가 이미 존재하는 상태에서도 독립적으로 반복 실행된다.
- `BE-TEST-DB-004`: 적용된 Migration 파일의 이름과 내용을 변경하지 않는다.
- `BE-TEST-DB-005`: `spotlessCheck`, 전체 `test`, `build`가 통과하고 Calendar 참석자 검색 지정 테스트가 Green이어야 한다.
- `BE-TEST-DB-006`: 존재하지 않는 조직을 지정한 직원 등록은 내부 조직 예외를 노출하지 않고 기존 직원 등록 오류 계약으로 실패해야 한다.

---

## 2. 실행 Task

### Task 1. H2 보조 테스트와 PostgreSQL Migration 검증 경계 분리

#### 선행 Task

- `없음`

#### 작업 목적

H2 Application Test가 PostgreSQL 전용 Migration을 해석하지 않게 하고, 실제 Migration 검증이 필요한 테스트는 PostgreSQL에서 유지한다.

#### 수정 가능 경로

- `backend/build.gradle`
- `backend/src/test/java`
- `backend/src/test/resources`
- `backend/BACKEND.md`

#### 수정 금지 경로

- `backend/src/main/java`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-harness.yml`
- `backend/src/main/resources/db/migration/**`
- `backend/DB_SCHEMA.md`
- `frontend/**`

#### 구현 항목

- [x] Red: 현재 전체 Backend 테스트에서 H2가 PostgreSQL functional partial index를 해석하지 못해 실패하는 결과를 기록한다.
- [x] Green: H2 보조 테스트 전용 설정을 추가해 PostgreSQL 전용 Migration 적용을 중단하고 JPA Mapping 기반 격리 Schema를 사용한다.
- [x] Green: PostgreSQL Migration·영속·트랜잭션·동시성 테스트는 기존 Testcontainers 설정과 전체 Flyway 적용을 유지한다.
- [x] Green: 명시적으로 `ddl-auto=validate`를 사용하는 H2 테스트는 책임에 맞게 H2 격리 설정을 사용하거나 PostgreSQL Testcontainers로 전환한다.
- [x] Refactor: 중복 테스트 DB 설정은 최소한의 공용 테스트 경계로 정리하고 제품 Runtime 설정은 변경하지 않는다.

#### 검증 항목

- [x] `backend`에서 H2 Application Context 테스트와 PostgreSQL Migration 테스트를 각각 실행한다.
- [x] `backend`에서 `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`를 실행한다.
- [x] 기존 Migration 파일에 변경이 없는지 `git diff -- backend/src/main/resources/db/migration`으로 확인한다.

#### 완료 조건

- `BE-TEST-DB-001`, `BE-TEST-DB-002`, `BE-TEST-DB-004`를 충족해야 한다.
- Red → Green → Refactor 기록과 모든 검증 결과가 남아야 한다.
- 수정 가능 경로 밖 변경과 수정 금지 경로 변경이 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- H2 통과를 위해 PostgreSQL Migration 또는 DB 제약을 변경·약화함
- PostgreSQL 검증을 H2 결과로 대체함
- 전체 테스트 또는 빌드 실패
- `quality_score`가 `90` 미만임

#### 제외 범위

- 제품 DB Schema와 Runtime DataSource 정책 변경
- Migration 파일 수정 또는 Flyway History 조작

#### 작업 결과

Red에서 전체 237개 테스트 중 47개가 H2의 PostgreSQL 전용 Migration 해석 실패로 실패했다. H2 전용 메타 Annotation으로 Flyway 경계와 ApplicationContext별 DB를 격리하고 PostgreSQL 계약 테스트는 Testcontainers를 유지했다. 수정 후 전체 테스트와 빌드가 통과했다.

#### 남은 문제

Harness 품질 평가는 아직 재실행하지 않았다.

---

### Task 2. 공유 기준 데이터에 독립적인 PostgreSQL 테스트 정리

#### 선행 Task

- `Task 1`

#### 작업 목적

조직과 참석자 기준 데이터가 존재해도 PostgreSQL 테스트가 고정 ID, 빈 테이블 또는 무조건 전체 삭제를 가정하지 않도록 격리한다.

#### 수정 가능 경로

- `backend/src/test/java`
- `backend/src/test/resources`
- `backend/BACKEND.md`
- `backend/src/main/java/com/flowbi/domain/user/service/EmployeeAccountRegistrationService.java`

#### 수정 금지 경로

- `backend/src/main/resources/**`
- `backend/DB_SCHEMA.md`
- `frontend/**`

#### 구현 항목

- [x] Red: 기준 사용자·팀 때문에 PK 충돌, FK 삭제 실패 또는 전체 개수 단언 실패가 발생하는 PostgreSQL 테스트 결과를 기록한다.
- [x] Green: 테스트가 소유한 고유 식별자만 생성·조회·정리하고 공유 기준 데이터의 존재 여부와 개수에 의존하지 않게 한다.
- [x] Green: 테스트 정리 순서는 사용자·Closure·팀 FK를 보존하며 제품 데이터 삭제 정책을 우회하지 않는다.
- [x] Green: Calendar 참석자 검색 테스트는 실제 합성 사용자 Migration과 비활성 제외·최소 응답 계약을 PostgreSQL에서 검증한다.
- [x] Refactor: 반복되는 PostgreSQL Fixture 정리와 식별자 생성을 허용 범위에서 공용화한다.
- [x] Green: 직원 등록 서비스가 변경된 팀 조회 예외를 직원 등록 오류 계약으로 변환하도록 회귀를 복구한다.

#### 검증 항목

- [x] 실패했던 PostgreSQL 테스트 클래스를 개별 재실행한다.
- [x] Calendar 참석자 검색 및 Migration 지정 테스트를 실행한다.
- [x] `backend`에서 `./gradlew spotlessCheck`, `./gradlew test`, `./gradlew build`를 실행한다.
- [x] `git diff --check`로 변경 Patch를 검증한다.

#### 완료 조건

- `BE-TEST-DB-003`, `BE-TEST-DB-005`, `BE-TEST-DB-006`을 충족해야 한다.
- 공유 기준 데이터를 삭제하거나 단언을 약화하지 않고 테스트 격리가 보장되어야 한다.
- 모든 검증이 통과하고 `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 기준 데이터를 제거하거나 제품 FK를 우회해 테스트를 통과시킴
- 테스트 순서에 따라 성공·실패가 달라짐
- 전체 테스트 또는 빌드 실패
- `quality_score`가 `90` 미만임

#### 제외 범위

- 운영 또는 공유 DB 직접 변경
- 제품 기능·API·Schema 변경

#### 작업 결과

공유 팀·사용자를 전부 삭제하던 Fixture를 테스트 소유 데이터만 정리하도록 변경하고, 고정 PK와 빈 테이블 개수 단언을 제거했다. 직원 등록의 조직 조회 예외 변환 회귀도 기존 계약으로 복구했다. 실패했던 지정 테스트, Calendar Migration·검색·인증 경계 테스트, 전체 테스트와 빌드가 모두 통과했다.

#### 남은 문제

Harness 품질 평가는 아직 재실행하지 않았다.

---

## 3. 전체 완료 조건

- Task 1과 Task 2의 구현 및 검증 항목이 모두 완료되어야 한다.
- H2는 보조 테스트로만 사용하고 PostgreSQL 계약은 Testcontainers에서 검증해야 한다.
- 기존 Migration과 제품 Runtime 설정을 변경하지 않아야 한다.
- 전체 Backend 테스트와 빌드가 통과해야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 검증이 실패함
- Migration·제약·단언을 약화하거나 기존 기준 데이터를 삭제함
- 수정 범위 밖 변경 또는 미실행 검증을 완료로 처리함
- 전체 `quality_score`가 `90` 미만임
