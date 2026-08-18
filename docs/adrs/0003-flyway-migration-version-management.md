# ADR-0003: 협업 환경의 Flyway Migration 버전 관리

- 상태: `ACCEPTED`
- 작성일: 2026-08-12
- 결정 주체: 사람 승인
- 관련 Plan: `docs/plans/active/calendar-01.md`
- 관련 ADR: `docs/adrs/0002-calendar-migration-and-postgresql-verification.md`
- 관련 문서: `ARCHITECTURE.md`, `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/DB_SCHEMA.md`, `docs/quality/quality-model.md`

## Context

ADR-0002는 Flyway Versioned SQL과 Testcontainers PostgreSQL을 Migration 및 검증 방식으로 채택했다. 그러나 여러 팀원이 독립된 Feature Branch에서 `V1`, `V2`처럼 연속된 짧은 번호를 직접 선택하면 같은 Version을 동시에 사용할 수 있다.

현재 저장소에서는 다음 파일이 동일한 `V1`을 사용해 Flyway가 Migration을 해석하는 단계에서 중단된다.

- `V1__create_authentication_tables.sql`
- `V1__create_calendar_schema.sql`

이 충돌은 더 높은 Version의 보정 Migration을 추가하는 것만으로 해결되지 않는다. Flyway가 새 Migration을 적용하기 전에 중복 Version을 발견하기 때문이다. 또한 이미 적용된 Migration의 이름이나 내용을 변경하면 Schema History의 Version과 Checksum이 달라져 ADR-0002의 이력 보존 원칙을 위반할 수 있다.

팀원이 Migration 번호를 중앙에서 예약하지 않아도 충돌을 최소화하고, 모든 환경에서 동일한 적용 순서를 재현할 수 있는 전역 버전 규칙이 필요하다.

## 결정해야 할 사항

1. 병렬 개발에서 Migration Version을 생성하는 규칙
2. 동일 시각 또는 Branch 병합 시 충돌 처리 방식
3. 이미 배포된 Version보다 낮은 Migration이 뒤늦게 병합되는 경우의 처리 방식
4. 현재 중복 `V1`을 정리하는 전환 절차
5. CI와 PostgreSQL에서 검증할 항목

## 선택지

### 선택지 A. 전역 연속 번호를 사람이 조율한다

예: `V1`, `V2`, `V3`

장점:

- 적용 순서가 짧고 쉽게 보인다.
- 소수 인원이 순차적으로 작업할 때 단순하다.

비용과 위험:

- 팀원 간 번호 예약과 재번호 부여가 필요하다.
- 독립 Branch에서 같은 번호를 선택할 수 있다.
- 병합 직전에 파일명과 테스트를 반복해서 수정하게 된다.

### 선택지 B. 도메인별 번호 구간을 할당한다

예: Auth `1000`번대, Calendar `2000`번대

장점:

- 서로 다른 도메인 사이의 직접적인 번호 충돌이 줄어든다.
- 파일명만으로 도메인을 대략 구분할 수 있다.

비용과 위험:

- 같은 도메인 안에서는 여전히 번호 조율이 필요하다.
- 도메인 간 FK와 선행 Schema 의존성의 실제 적용 순서를 번호 구간이 왜곡할 수 있다.
- 새 도메인과 공유 Migration을 위한 번호 정책이 계속 늘어난다.

### 선택지 C. UTC Timestamp 기반 전역 Version을 사용한다 — 채택

모든 팀원이 UTC 시각과 충돌 방지 순번을 결합해 Version을 생성한다.

```text
VyyyyMMddHHmmss_NN__domain_description.sql
```

예:

```text
V20260812143527_00__calendar_add_schedule_participants.sql
V20260812143705_00__auth_add_login_audit_columns.sql
```

장점:

- 중앙 번호 예약 없이 독립적으로 Migration을 생성할 수 있다.
- 생성 시각이 달라 대부분의 Branch 충돌을 피할 수 있다.
- Version과 설명에서 대략적인 생성 시점과 소유 도메인을 확인할 수 있다.
- 기존 Flyway Versioned SQL 방식을 유지하므로 도구 교체가 필요 없다.

비용과 위험:

- 파일명이 길어진다.
- 같은 초에 여러 Migration을 만들면 보조 순번이 필요하다.
- 오래된 Branch가 늦게 병합되면 이미 배포된 Version보다 낮아질 수 있어 병합 정책이 필요하다.

### 선택지 D. 도메인별 Flyway Schema History를 분리한다

장점:

- 각 도메인이 독립된 Version 공간을 사용할 수 있다.

비용과 위험:

- 현재 시스템은 하나의 PostgreSQL Schema에서 사용자·팀·프로젝트와 Calendar가 FK로 연결된다.
- 여러 Flyway Instance의 실행 순서, History Table과 교차 도메인 의존성을 별도로 조정해야 한다.
- 단일 애플리케이션과 공유 Schema 구조에 비해 운영 복잡도가 크게 증가한다.

현재 구조에서는 채택하지 않는다. 도메인이 물리적으로 분리된 Database 또는 Schema를 소유하게 될 경우 별도 ADR로 재검토한다.

## Decision

선택지 C를 채택한다.

### 파일명과 Version 규칙

- 모든 새 Migration은 `VyyyyMMddHHmmss_NN__domain_description.sql` 형식을 사용한다.
- Timestamp는 개발자 Local Time이 아니라 UTC를 사용한다.
- `NN`은 같은 UTC 초에 생성된 Migration의 충돌 방지 순번이며 `00`부터 증가한다.
- `domain`과 `description`은 소문자 `snake_case`를 사용한다.
- Version은 저장소 전체에서 유일해야 하며 도메인마다 다시 시작하지 않는다.
- Migration 생성은 공용 생성 Script를 사용하고, Script는 동일 Version 파일이 있으면 생성을 거부하거나 같은 초의 다음 `NN`을 선택해야 한다.

파일명 검증 기준은 다음과 같다.

```regex
^V[0-9]{14}_[0-9]{2}__[a-z0-9]+_[a-z0-9_]+\.sql$
```

### 적용된 Migration의 불변성

- 하나 이상의 공유·검증·운영 환경에 적용된 Versioned Migration은 이름, Version, 설명과 SQL 내용을 변경하지 않는다.
- 적용된 Migration의 오류는 더 높은 Timestamp Version의 보정 Migration으로 수정한다.
- `flyway repair`는 실패한 History 정리 또는 승인된 Checksum 보정 절차에만 제한적으로 사용하며, Version 재번호 부여 수단으로 사용하지 않는다.
- 운영 Schema History의 수동 수정, 데이터 삭제 또는 파괴적 재구성은 이 ADR의 승인 범위에 포함하지 않는다.

### Branch와 배포 규칙

- Migration은 Feature Branch에서 생성할 때 Version을 부여한다.
- PR CI는 저장소 전체의 Version 중복과 파일명 규칙을 검사한다.
- 동일 Version이 병합 대상 Branch에 먼저 추가됐다면 아직 적용되지 않은 Feature Branch의 Migration만 새 UTC Version으로 다시 생성한다.
- 배포는 Migration이 병합된 장기 Branch를 기준으로 수행한다. 병합되지 않은 Feature Branch Migration을 공유 환경에 먼저 적용하지 않는다.
- Feature Branch의 Version이 공유 환경에 이미 적용된 최고 Version보다 낮아졌다면 기본적으로 새 현재 UTC Version으로 다시 작성한다. 단, 해당 Migration이 어떤 공유 환경에도 적용되지 않았다는 사실을 먼저 확인한다.
- Flyway `outOfOrder`는 기본값 `false`를 유지한다. 상시 활성화하거나 일반적인 Branch 병합 해결책으로 사용하지 않는다. 불가피한 일회성 적용은 영향 환경, 적용 순서와 복구 절차에 대한 별도 사람 승인이 필요하다.

### Repeatable 및 Baseline Migration 경계

- Table, Column, Constraint, Index와 기준 데이터 변경은 Versioned Migration으로 관리한다.
- Repeatable Migration은 재실행해도 안전하고 순서 의존성이 없는 View, Function 등으로 범위를 제한하며 Schema 변경 우회 수단으로 사용하지 않는다.
- 장기간 누적된 이력을 압축하기 위한 Flyway Baseline Migration은 현재 충돌 해결에 사용하지 않는다. 필요해지면 기존 환경과 신규 환경의 적용 차이를 포함한 별도 ADR로 결정한다.

## 현재 중복 V1 전환 절차

현재 충돌은 다음 순서로 한 번만 정리한다.

1. 모든 공유·검증·운영 Database의 `flyway_schema_history`와 실제 Schema를 확인한다.
2. 충돌한 Auth 및 Calendar Migration이 어떤 공유 환경에도 적용되지 않았음을 확인한다.
3. 적용 이력이 없다면 승인된 의존 순서로 다음 Timestamp Version을 부여한다.

```text
V20260812000001_00__auth_create_authentication_tables.sql
V20260812000002_00__calendar_create_calendar_schema.sql
V20260812000003_00__calendar_add_creation_constraints.sql
```

4. Calendar 기준 Migration은 Auth가 소유하는 `users`, `teams`를 다시 생성하지 않고 기존 Auth Schema를 참조한다.
5. `projects` 등 아직 별도 도메인 Migration이 없는 FK 대상의 임시 기준선은 소유권과 후속 이전 조건을 `backend/DB_SCHEMA.md`에 명시한다.
6. 빈 PostgreSQL과 Initial Baseline Fixture PostgreSQL에 전체 Migration을 적용한다.
7. Migration 전후 데이터, FK·CHECK·UNIQUE·Index, JPA Mapping과 Transaction Rollback을 검증한다.

충돌한 Migration이 하나 이상의 공유 환경에 이미 적용됐다면 2~7단계를 실행하지 않는다. 사전 Backup 후 신규 정규 Database로 데이터를 이전하거나 DBA가 통제하는 History 전환 절차를 별도로 설계하고 사람 승인을 받아야 한다.

## 자동화 및 CI 규칙

공용 Migration 생성 Script와 CI는 최소한 다음을 검증한다.

- 파일명 정규식과 UTC Timestamp 형식
- 저장소 전체 Version 중복
- 동일 PR에서 Migration과 `backend/DB_SCHEMA.md` 동기화 여부
- Flyway `validate`
- 빈 Testcontainers PostgreSQL에 전체 Migration 적용
- Initial Baseline Fixture에 증분 Migration 적용 및 기존 데이터 보존
- FK·CHECK·UNIQUE·Index와 JPA Mapping 검증
- 적용 실패를 성공으로 변환하지 않고 CI 실패로 보고

## Consequences

- 팀원은 다음 연속 번호를 예약하지 않고 독립적으로 Migration을 생성할 수 있다.
- Migration Version은 도메인 내부 번호가 아니라 전체 Database의 적용 순서를 나타낸다.
- 도메인 소유권은 Version 번호가 아니라 파일 설명, Schema 문서와 코드 경계로 표현한다.
- 생성 Script와 CI 검증을 추가하고 `CONVENTIONS.md`, `backend/BACKEND.md`, `backend/DB_SCHEMA.md`를 이 규칙과 동기화해야 한다.
- 현재 중복 `V1` 정리는 적용 이력 확인을 선행하며, 확인되지 않은 환경의 Migration History를 임의로 변경하지 않는다.
- Timestamp만으로 도메인 의존성을 해결할 수 없으므로 FK 또는 선행 Schema가 필요한 PR은 의존 Migration이 먼저 병합됐는지 Review해야 한다.

## 검증 방법

- 같은 초에 두 Migration을 생성해 서로 다른 `NN`이 부여되는지 확인
- 중복 Version 또는 잘못된 파일명을 CI가 거부하는지 확인
- 여러 도메인의 Migration을 섞어도 빈 PostgreSQL에 Version 순서대로 적용되는지 확인
- Initial Baseline Fixture에서 증분 Migration 후 기존 데이터가 보존되는지 확인
- 적용된 Migration 파일을 변경했을 때 Flyway `validate`가 실패하는지 확인
- 오래된 Branch Migration이 최고 적용 Version보다 낮을 때 CI 또는 Review 절차가 이를 발견하는지 확인
- `outOfOrder=false` 상태에서 모든 지원 환경이 동일한 Schema History를 갖는지 확인

## 사람 승인 기록

- 선택: `C`
- UTC Timestamp 기반 전역 Version 규칙: `APPROVED`
- 현재 중복 `V1`의 일회성 기준선 정리: `APPROVED`, 단 공유 환경 적용 이력 없음 확인이 선행 조건
- 적용된 Migration 불변성과 `outOfOrder=false` 원칙: `APPROVED`
- 승인자: 사용자 명시 승인
- 승인일: 2026-08-12
- 승인 의견: 팀원 간 연속 번호 조율을 반복하지 않도록 Migration 버전 관리 정책을 별도 ADR로 기록한다.
