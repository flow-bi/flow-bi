# ADR-0002: Calendar Migration과 PostgreSQL 검증 전략

- 상태: `ACCEPTED`
- 작성일: 2026-08-06
- 결정 주체: 사람 승인 필요
- 관련 Plan: `docs/plans/active/calendar-01.md`
- 관련 문서: `ARCHITECTURE.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/DB_SCHEMA.md`, `docs/quality/quality-model.md`

## Context

Production Database는 PostgreSQL이지만 현재 Backend는 H2 `create-drop`을 사용한다. Migration 도구와 PostgreSQL 통합 Test 환경이 미확정이므로 H2 Test만으로 Calendar Schema, Constraint, Index와 기존 데이터 보존을 검증할 수 없다.

Harness Task 1은 다음 항목이 없어서 차단됐다.

- 승인된 Versioned Migration 방식
- PostgreSQL에서 Migration을 적용할 Test 환경
- Initial Baseline과 기존 일정 데이터를 표현하는 Fixture
- Migration 적용 후 FK·CHECK·UNIQUE·Index와 데이터 보존 검증

## 결정해야 할 사항

1. Versioned Migration 도구와 파일 형식
2. PostgreSQL 통합 Test 실행 환경
3. 기존 데이터 보존 Fixture와 검증 범위
4. Migration 실패 시 복구 원칙
5. Harness와 개발 환경에서의 실행 조건

## 선택지

### 선택지 A. Flyway SQL + Testcontainers PostgreSQL — 채택

- Flyway Versioned SQL Migration을 사용한다.
- Testcontainers로 실제 PostgreSQL Version의 임시 DB를 기동한다.
- Migration을 빈 DB와 Initial Baseline Fixture DB에 각각 적용한다.

장점:

- 실제 PostgreSQL SQL과 적용 순서를 직접 검토할 수 있다.
- Application Mapping, Constraint와 Transaction을 운영 DB와 같은 Engine에서 검증한다.
- 기존 데이터 보존을 자동 회귀 Test로 유지할 수 있다.

비용과 위험:

- Flyway, PostgreSQL Driver와 Testcontainers 의존성 추가 승인이 필요하다.
- Local 및 Harness 실행 환경에 Container Runtime이 필요하다.

### 선택지 B. Liquibase + Testcontainers PostgreSQL

- Liquibase ChangeSet으로 변경을 기술한다.
- PostgreSQL 검증은 Testcontainers를 사용한다.

장점:

- 구조화된 ChangeSet과 변경 Metadata를 관리할 수 있다.

비용과 위험:

- 현재 저장소에 Liquibase 규칙이 없고 초기 설정과 학습 비용이 더 크다.
- XML, YAML 또는 SQL 형식을 추가로 결정해야 한다.

### 선택지 C. 외부 PostgreSQL Test DB + 수동 SQL

장점:

- Container Runtime이 필요하지 않다.

비용과 위험:

- 개발자별 환경 차이와 공유 DB 상태 때문에 재현성이 낮다.
- Versioned Migration과 자동 격리가 약해 완료 전략으로 권장하지 않는다.

### 제외 선택지. Hibernate `ddl-auto`와 H2만 사용

Versioned Migration, PostgreSQL 호환성과 기존 데이터 보존을 증명할 수 없으므로 Production 완료 방식으로 채택하지 않는다.

## Decision

선택지 A를 채택한다.

- Migration: Flyway Versioned SQL
- Production/Test Driver: PostgreSQL JDBC Driver
- Integration Test: Testcontainers PostgreSQL
- 단위·Application Test: H2를 보조적으로 유지할 수 있으나 PostgreSQL 검증을 대체하지 않음
- Migration 파일: 이미 적용된 Version을 수정하지 않고 새 Version 추가

## Test Fixture 전략

### Migration 보존 Fixture

- Initial Baseline 구조와 최소 기존 일정 데이터를 Version 관리되는 Test Fixture로 준비한다.
- 개인·팀·프로젝트 일정, 상세, 대상과 기존 사용자 참조를 포함한다.
- 운영 개인정보나 운영 DB Dump를 사용하지 않는다.
- Migration 전후 Primary Key, 관계 수, 핵심 값과 취소되지 않은 상태를 비교한다.

### Constraint Fixture

- 허용·거부 상태와 색상 값
- 상세 1:1 및 참석자 중복
- Target Type과 FK 조합
- 시작·종료 시간 경계
- 취소 상태와 취소 주체·시각 조합

### 성능 Fixture

- 한 달 범위에 접근 가능한 일정 1,000건을 결정적으로 생성한다.
- 고정 Actor, 참석자, 다중 팀과 프로젝트 관계를 포함한다.
- 20회 Warm Run의 Server 응답과 Client settled 측정에 같은 Data Shape을 사용한다.

## Migration 실패와 복구 원칙

- Calendar MVP는 파괴적 변경을 포함하지 않는다.
- 실패한 Migration을 자동 Rollback 가능한 것으로 가정하지 않는다.
- Test DB는 폐기 후 재생성하고, 운영 적용은 사전 Backup·복구 절차와 별도 승인을 요구한다.
- 이미 적용된 Migration 파일을 수정하지 않고 보정 Migration을 추가한다.
- Migration 실패를 Application 성공으로 숨기지 않는다.

## Consequences

- `backend/build.gradle`, `backend/src/main/resources/db/migration`, JPA Mapping, `backend/DB_SCHEMA.md`가 함께 변경된다.
- Container Runtime이 없는 환경에서는 PostgreSQL 검증이 `BLOCKED`되며 H2 결과로 대체하지 않는다.
- Harness는 PostgreSQL 통합 Test가 실행되는 명령과 환경을 제공해야 한다.
- 새 의존성의 유지보수 상태, License와 알려진 취약점을 승인 과정에서 확인한다.

## 검증 방법

- 빈 PostgreSQL DB에 전체 Migration 적용
- Initial Baseline Fixture DB에 증분 Migration 적용
- 기존 데이터와 관계 보존 확인
- FK·CHECK·UNIQUE·Index와 JPA Mapping 검증
- Test 반복 실행 시 독립성과 결정성 확인
- Container Runtime 부재 시 명확한 `BLOCKED` 결과 확인

## 사람 승인 기록

- 선택: `A`
- 신규 의존성 승인: `APPROVED` — Flyway, PostgreSQL JDBC Driver, Testcontainers PostgreSQL
- PostgreSQL/Testcontainers 검증 전략 승인: `APPROVED`
- Fixture 전략 승인: `APPROVED`
- 승인자: 사용자 명시 승인
- 승인일: 2026-08-06
- 승인 의견: ADR-0002 Calendar Migration과 PostgreSQL 검증 전략 승인. 실제 Container Runtime 가용성은 실행 시 검증한다.
