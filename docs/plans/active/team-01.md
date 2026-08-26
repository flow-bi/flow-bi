# 작업 계획: team-01

## 1. 기본 정보

### 사용자 요청

계층형 조직 팀과 Closure Table을 구현하고, 팀 생성·조회·이동·삭제 및 관리자 Controller API와 관련 테스트를 포함한 실행 계획을 작성한다.

### 작업 목적

기존의 단일 `teams` 모델을 계층형 조직 모델로 확장하고 `teams.parent_team_id`와 `teams_closure`를 일관되게 관리한다. 팀 생성, 이름 변경, 계층 조회, 하위 트리 이동과 삭제를 트랜잭션으로 제공하며, 인증된 사용자의 조직 조회 API와 관리자용 변경 API를 명확한 HTTP·오류·인가 계약으로 노출한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/organization-chart.md`, `docs/product-specs/admin.md`
- Design Doc: `docs/design-docs/authentication-and-permission.md`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `backend/AGENTS.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `docs/adrs/0003-flyway-migration-version-management.md`, `docs/quality/quality-model.md`, GitHub Issue `#51`

---

## 2. 실행 Task

### Task 1. 팀 계층 스키마와 영속 모델 구축

#### 선행 Task

- 없음

#### 작업 목적

기존 팀 데이터를 보존하면서 PostgreSQL에 계층 관계와 Closure 불변식을 추가하고, 이후 유스케이스가 사용할 JPA 영속 모델과 Repository 기반을 구축한다.

#### 수정 가능 경로

- `backend/src/main/resources/db/migration`
- `backend/src/main/java/com/flowbi/domain/team/entity`
- `backend/src/main/java/com/flowbi/domain/team/repository`
- `backend/src/test/java/com/flowbi/domain`
- `backend/DB_SCHEMA.md`

#### 수정 금지 경로

- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] Red: 빈 PostgreSQL과 기존 기본 팀이 있는 PostgreSQL에 증분 Migration을 적용하고 FK, CHECK, UNIQUE, Index, 기존 데이터 보존을 검증하는 `TeamHierarchyMigrationPostgresTest`를 먼저 작성해 의도한 이유로 실패시킨다. 요구사항: FR-005~FR-008 기반 스키마, 조직도 계층 조회 결정.
- [ ] ADR-0003의 UTC Timestamp 파일명 규칙으로 신규 Flyway Migration을 만들고, 기존 Migration 파일은 이름과 내용을 변경하지 않는다.
- [ ] `teams.parent_team_id`에 nullable 자기 참조 FK, `parent_team_id <> team_id` CHECK와 직속 하위 조회 인덱스를 추가한다.
- [ ] 같은 부모 아래의 정규화된 팀 이름 중복을 DB에서도 차단하고, `parent_team_id IS NULL`인 최상위 팀 이름 중복도 차단하는 PostgreSQL UNIQUE 구성을 추가한다.
- [ ] 기준 문서 명칭인 `teams_closure`에 `(ancestor_team_id, descendant_team_id)` 복합 PK, 양쪽 `teams` FK, `depth`, `created_at`, `updated_at`을 추가한다.
- [ ] Closure `depth`를 조상에서 자손까지의 간선 수로 고정하고 `(동일 팀 AND depth=0) OR (서로 다른 팀 AND depth>0)` CHECK를 적용한다.
- [ ] PK의 선두 컬럼과 중복되는 단일 인덱스를 무분별하게 추가하지 않고 `(ancestor_team_id, depth, descendant_team_id)`와 `(descendant_team_id, depth, ancestor_team_id)` 조회 경로를 PostgreSQL 메타데이터와 실행 계획으로 검증한다.
- [ ] 기존 `teams` 행은 최상위 팀으로 유지하고 각 팀의 `(self, self, 0)` Closure 행을 backfill한다.
- [ ] `Team`에 nullable LAZY `parentTeam`, `Instant` 기반 생성·수정 시각과 생성·이름 변경·부모 변경 도메인 메서드를 추가하고 무분별한 Setter나 `children` 컬렉션은 추가하지 않는다.
- [ ] `TeamClosureId`를 `@Embeddable` 복합키로, `TeamClosure`를 `@EmbeddedId`와 `@MapsId` 기반 연관관계로 구현한다.
- [ ] `TeamRepository`와 `TeamClosureRepository`의 기본 매핑·저장·조회 테스트를 Green으로 만들고 중복키, 음수 depth, 잘못된 자기 관계, 존재하지 않는 팀 FK 실패를 유지한다.
- [ ] `backend/DB_SCHEMA.md`를 실제 PostgreSQL 타입, 제약, 인덱스, backfill 및 Closure depth 정의와 동기화한 뒤 중복을 제거하는 범위로 Refactor한다.

#### 검증 항목

- [ ] `./gradlew.bat test --tests "*TeamHierarchyMigrationPostgresTest"`가 Docker가 제공되는 PostgreSQL 16 Testcontainers 환경에서 통과한다.
- [ ] `./gradlew.bat test --tests "*TeamPersistenceTest"`가 JPA 매핑과 Closure 불변식을 검증하며 통과한다.
- [ ] `git diff --name-only -- backend/src/main/resources/db/migration`에서 기존 Migration 변경 없이 신규 팀 Migration만 확인된다.
- [ ] `backend/DB_SCHEMA.md`의 `teams`, `teams_closure` 정의가 Migration 및 Entity 매핑과 일치한다.

#### 완료 조건

- 모든 구현 항목과 검증 항목이 완료되고 Mandatory Gate G1~G7 중 적용 항목이 통과해야 한다.
- PostgreSQL에서 기존 팀 데이터가 보존되고 자기 Closure 관계가 backfill되어야 한다.
- TDD Red → Green → Refactor 실행 결과와 명령을 작업 결과에 기록해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않고 `수정 금지 경로`에 변경이 없어야 한다.
- DB Migration 및 데이터 정합성 작업이므로 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 기존 Migration을 수정하거나 기존 팀 데이터가 손실됨
- H2 결과만으로 PostgreSQL FK, CHECK, UNIQUE, Index 통과를 선언함
- Closure 자기 관계 또는 depth 제약이 DB에서 우회 가능함
- 테스트나 문서를 요구사항에 맞추기 위해 단언 또는 제약을 약화함
- 필수 검증 실패 또는 `quality_score`가 90 미만임

#### 제외 범위

- 팀 Service, DTO와 Controller 구현
- 기존 운영 DB의 수동 데이터 변경, `flyway repair`, 파괴적 Migration
- 신규 DB 또는 테스트 프레임워크 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 팀 생성과 이름 변경 구현

#### 선행 Task

- `Task 1`

#### 작업 목적

최상위 팀과 하위 팀을 생성하면서 adjacency와 Closure를 하나의 트랜잭션으로 기록하고, 같은 부모 범위의 이름 중복을 방지하며 팀 이름을 안전하게 변경한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/team/entity`
- `backend/src/main/java/com/flowbi/domain/team/repository`
- `backend/src/main/java/com/flowbi/domain/team/service`
- `backend/src/main/java/com/flowbi/domain/team/dto`
- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] Red: 최상위 팀 생성, 하위 팀 생성, 자기 depth 0 관계, 모든 조상 관계, 부모 없음, 같은 부모 이름 중복, 중간 실패 전체 rollback과 이름 변경 검증을 `TeamServiceTest`에 먼저 작성해 의도한 이유로 실패시킨다. 요구사항: FR-005, FR-007.
- [ ] `TeamCreateRequest`, `TeamNameUpdateRequest`, `TeamResponse`를 구현하고 팀 이름은 앞뒤 공백 제거 후 1~50자이며 제어문자를 허용하지 않도록 검증한다.
- [ ] 최상위 팀 생성 시 팀 저장 후 `(self, self, 0)`을 저장하고, 하위 팀 생성 시 부모를 잠금 조회한 뒤 자기 관계와 부모의 모든 조상에 대한 관계를 일괄 생성한다.
- [ ] 같은 부모의 이름 중복은 사전 검사와 DB UNIQUE 충돌 변환을 함께 적용하며 최상위 팀도 하나의 부모 범위로 처리한다.
- [ ] 생성과 이름 변경의 공개 Service 경계에 `@Transactional`을 적용하고 Closure 저장 실패 시 팀 저장도 rollback되도록 한다.
- [ ] 기존 사용자 등록 흐름의 `TeamService.findOrCreate(String)`은 이름이 같은 하위 팀과 혼동하지 않도록 최상위 팀 조회·생성 의미로 유지하고 기존 호출 계약의 회귀 테스트를 남긴다.
- [ ] 팀 없음, 상위 팀 없음, 이름 중복과 잘못된 입력을 안정적인 도메인 예외로 표현하고 내부 DB 예외를 그대로 노출하지 않는다.
- [ ] Green 이후 생성·변경 orchestration과 Closure 생성 책임을 명확히 분리하되 동일 트랜잭션 경계를 깨지 않는 범위로 Refactor한다.

#### 검증 항목

- [ ] `./gradlew.bat test --tests "*TeamServiceTest"`가 정상·경계·실패·rollback 시나리오와 TDD 단계를 포함해 통과한다.
- [ ] `./gradlew.bat test --tests "*EmployeeAccountRegistrationServiceTest"`가 선행 Task의 최상위 팀 `findOrCreate` 계약과 충돌 없이 통과한다.
- [ ] 생성 실패 후 `teams`와 `teams_closure` 양쪽에 부분 데이터가 남지 않는지 통합 테스트로 확인한다.
- [ ] 이름 중복 동시 요청에서 하나만 성공하고 나머지는 도메인 충돌로 변환되는지 검증한다.

#### 완료 조건

- FR-005와 FR-007의 생성·이름 변경 범위 및 모든 검증 항목이 완료되어야 한다.
- Mandatory Gate G1~G7 중 적용 항목과 TDD Red → Green → Refactor 증거가 통과해야 한다.
- 수정 범위가 `수정 가능 경로` 안에 있고 `수정 금지 경로`에 변경이 없어야 한다.
- 트랜잭션·동시성·DB 정합성 작업이므로 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 팀과 Closure가 서로 다른 트랜잭션에서 부분 저장됨
- 최상위 팀 또는 동일 부모 이름 중복이 허용됨
- 기존 `findOrCreate` 호출이 이름이 같은 하위 팀을 임의로 선택함
- 선행 Task의 스키마 계약과 충돌하거나 관련 테스트가 실패함
- 필수 검증 실패 또는 `quality_score`가 90 미만임

#### 제외 범위

- 계층 경로·트리 조회, 팀 이동과 삭제
- 공개 HTTP Controller와 OpenAPI 계약
- 사용자 등록 API 또는 인증 정책 변경

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 3. 팀 계층 조회 구현

#### 선행 Task

- `Task 2`

#### 작업 목적

adjacency와 Closure의 역할을 분리하여 직속 관계, 모든 조상·자손, 최상위 경로, 부분 트리와 전체 조직 트리를 안정적인 순서와 제한된 쿼리 수로 조회한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/team/repository`
- `backend/src/main/java/com/flowbi/domain/team/service`
- `backend/src/main/java/com/flowbi/domain/team/dto`
- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] Red: 본사→개발본부→백엔드팀과 복수 최상위 팀 fixture로 직속 부모·자식, 조상·자손, 경로, 부분 트리, 전체 트리, 빈 결과와 안정 정렬 테스트를 먼저 작성해 실패시킨다. 요구사항: FR-006과 조직도 하위 조직 조회 결정.
- [ ] 직속 부모·자식의 기준은 `teams.parent_team_id`로 조회하고 Closure `depth=1`은 같은 관계를 나타내는 파생 불변식으로 검증한다.
- [ ] `TeamRelationResponse`의 `distance`는 조회 기준 팀과의 간선 거리로 정의하고 조상·자손 목록에서는 자기 관계를 제외한다.
- [ ] `TeamPathResponse.depth`는 최상위 팀을 0으로 하는 표시 단계로 변환하고 경로는 최상위 팀부터 대상 팀까지 자기 자신을 포함해 반환한다.
- [ ] `TeamHierarchyResponse.depth`는 요청한 트리 루트를 0으로 하는 상대 표시 단계로 정의하고 `children`으로 트리를 구성한다.
- [ ] 전체 최상위 팀과 동일 depth 항목은 `teamName ASC, teamId ASC`로 보조 정렬하여 결과를 결정적으로 만든다.
- [ ] `TeamHierarchyService`가 Repository projection 또는 batch 조회 결과를 메모리에서 조립하게 하여 Entity를 노출하지 않고 N+1을 방지한다.
- [ ] 부분 트리, 전체 트리와 경로 조회가 각각 최대 2개의 영속성 쿼리로 완료되는지 검증한다.
- [ ] Closure 누락, 중복 거리 또는 adjacency의 직속 관계와 depth 1 관계가 불일치하면 `TeamHierarchyInconsistentException`으로 안전하게 실패하도록 한다.
- [ ] Green 이후 정렬·depth 변환·트리 조립 로직을 작은 순수 함수로 Refactor한다.

#### 검증 항목

- [ ] `./gradlew.bat test --tests "*TeamHierarchyQueryServiceTest"`가 모든 조회 결과, 포함·제외 기준과 정렬을 검증하며 통과한다.
- [ ] `./gradlew.bat test --tests "*TeamHierarchyRepositoryTest"`가 선행 Task 데이터 계약과 충돌 없이 방향별 Closure 조회와 depth 정렬을 검증한다.
- [ ] Hibernate 통계 또는 동등한 통합 검증으로 경로·부분 트리·전체 트리별 쿼리 수가 2회를 초과하지 않음을 확인한다.
- [ ] `본사(0) → 개발본부(1) → 백엔드팀(2)` 경로와 `개발본부(0) → 백엔드팀(1)` 부분 트리 응답을 명시적으로 확인한다.

#### 완료 조건

- FR-006과 조직도 계층 조회 요구 및 모든 검증 항목이 완료되어야 한다.
- DB distance와 API 표시 depth가 혼용되지 않고 DTO 계약으로 구분되어야 한다.
- Mandatory Gate G1~G7 중 적용 항목과 TDD 증거가 통과해야 한다.
- 수정 범위와 금지 범위를 준수하고 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 직속 관계를 Closure만으로 관리하여 `parent_team_id`와 불일치할 수 있음
- 경로의 최상위 팀이 가장 큰 응답 depth를 갖는 역방향 계약이 노출됨
- 동일 데이터에서 응답 순서가 비결정적이거나 N+1이 발생함
- 선행 Task의 생성 계약과 충돌하거나 관련 검증이 실패함
- 필수 검증 실패 또는 `quality_score`가 90 미만임

#### 제외 범위

- 팀 이동·삭제와 변경 API
- 직원 목록을 포함한 조직도 응답
- 대규모 조직 페이지네이션 또는 별도 캐시 도입

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 4. 하위 트리를 보존하는 팀 이동 구현

#### 선행 Task

- `Task 3`

#### 작업 목적

팀을 다른 부모 또는 최상위로 이동할 때 대상 하위 트리의 내부 관계를 보존하고 외부 조상 관계만 원자적으로 교체하며 순환 참조와 동시 이동 충돌을 차단한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/team/entity`
- `backend/src/main/java/com/flowbi/domain/team/repository`
- `backend/src/main/java/com/flowbi/domain/team/service`
- `backend/src/main/java/com/flowbi/domain/team/dto`
- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] Red: 다른 부모 이동, 하위 트리 이동, 최상위→하위, 하위→최상위, 자기 이동, 자손 아래 이동, 동일 부모 이동, 없는 부모, 중간 실패 rollback과 동시 이동을 검증하는 테스트를 먼저 실패시킨다. 요구사항: FR-007.
- [ ] `TeamMoveRequest.newParentTeamId`는 nullable로 두어 `null`이면 최상위 이동, 양수 ID이면 해당 부모 아래 이동으로 해석한다.
- [ ] 이동 대상 하위 트리와 새 부모를 `team_id` 오름차순의 결정적 순서로 pessimistic write lock하고, 잠금 획득 뒤 현재 부모·하위 트리·새 부모 조상 관계를 다시 조회해 순환 여부를 재검증한다.
- [ ] 자기 자신과 새 부모가 같거나, 새 부모가 이동 대상의 자손이거나, 현재 부모와 새 부모가 동일한 요청을 각각 안정적인 도메인 충돌로 거부한다.
- [ ] 이동 대상 하위 트리 내부 Closure는 유지하고, 하위 트리의 자손과 기존 외부 조상 사이의 Closure만 일괄 삭제한다.
- [ ] 새 외부 관계의 depth를 `depth(새 조상→새 부모) + 1 + depth(이동 루트→하위 자손)`으로 계산해 일괄 생성한다.
- [ ] 최상위 이동은 외부 조상 관계만 제거하고 `parent_team_id`를 `NULL`로 바꾸며 자기·내부 하위 트리 관계는 유지한다.
- [ ] Closure 일괄 삭제·생성, `parent_team_id` 변경과 정합성 검사를 하나의 `@Transactional` 경계에서 처리하고 실패 시 전체 rollback한다.
- [ ] Green 이후 native bulk query와 orchestration 책임을 Repository·Service 경계에 맞게 Refactor하고 같은 Entity를 행별로 반복 저장하지 않는다.

#### 검증 항목

- [ ] `./gradlew.bat test --tests "*TeamHierarchyMoveServiceTest"`가 정상·거부·rollback 시나리오와 정확한 depth 공식을 검증하며 통과한다.
- [ ] `./gradlew.bat test --tests "*TeamHierarchyMovePostgresTest"`가 선행 Task Closure 계약과 충돌 없이 PostgreSQL bulk query와 pessimistic lock을 검증한다.
- [ ] 두 트랜잭션이 겹치는 하위 트리 또는 서로의 새 부모를 동시에 이동할 때 deadlock 없이 하나의 일관된 결과 또는 명시적 충돌만 남는지 확인한다.
- [ ] 이동 전후 모든 팀에 자기 depth 0 관계가 하나씩 있고 adjacency와 Closure depth 1이 일치함을 확인한다.

#### 완료 조건

- FR-007의 조직 이동 범위와 모든 검증 항목이 완료되어야 한다.
- 순환 참조, 부분 반영과 동시 이동 정합성 훼손이 차단되어야 한다.
- Mandatory Gate G1~G7 중 적용 항목과 TDD 증거가 통과해야 한다.
- 수정 가능·금지 경로를 준수하고 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 이동 대상 내부 Closure를 삭제 후 재생성해 누락 또는 잘못된 depth가 발생함
- 자기·자손 이동 또는 동일 부모 이동이 허용됨
- 동시 이동에서 순환, 중복 Closure, 부분 관계가 남음
- 선행 Task의 조회·depth 계약과 충돌하거나 관련 검증이 실패함
- 필수 검증 실패 또는 `quality_score`가 90 미만임

#### 제외 범위

- 여러 팀을 한 요청으로 이동하는 bulk API
- 조직 변경 이력 및 감사 테이블 추가
- PostgreSQL 외 데이터베이스를 위한 별도 잠금 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 5. leaf 팀 삭제 구현

#### 선행 Task

- `Task 4`

#### 작업 목적

직속 하위 팀이 없는 팀만 삭제하고 관련 Closure를 함께 제거하며, 하위 팀 또는 소속 직원이 있는 팀의 데이터 손실을 안전하게 차단한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/team/repository`
- `backend/src/main/java/com/flowbi/domain/team/service`
- `backend/src/test/java/com/flowbi/domain`

#### 수정 금지 경로

- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] Red: leaf 삭제, 직속 하위 팀이 있는 삭제 거부, 관련 Closure 제거, 없는 팀, 소속 직원 FK 충돌과 중간 실패 rollback 테스트를 먼저 작성해 실패시킨다. 요구사항: FR-008.
- [ ] 삭제 대상을 write lock으로 조회하고 `parent_team_id` 기준 직속 하위 팀 존재 여부를 검사해 하위 팀이 있으면 `TeamHasChildrenException`으로 거부한다.
- [ ] leaf 팀과 관련된 조상·자손 Closure를 일괄 삭제한 다음 팀을 삭제하고 flush까지 하나의 `@Transactional` 경계에서 수행한다.
- [ ] 소속 직원이 있는 팀은 기존 `users.team_id` FK로 삭제를 차단하고 DB 무결성 예외를 `TeamInUseException`으로 변환하되 직원 이동·연쇄 삭제는 수행하지 않는다.
- [ ] Closure 불일치 또는 삭제 중 실패 시 팀과 Closure가 삭제 전 상태로 rollback되도록 한다.
- [ ] Green 이후 삭제 순서와 예외 변환을 명확히 하고 Service 밖의 직접 팀 삭제가 유스케이스에 사용되지 않도록 Refactor한다.

#### 검증 항목

- [ ] `./gradlew.bat test --tests "*TeamDeletionServiceTest"`가 정상·거부·rollback 시나리오를 검증하며 통과한다.
- [ ] `./gradlew.bat test --tests "*TeamDeletionPostgresTest"`가 선행 Task의 FK·Closure 계약과 충돌 없이 실제 PostgreSQL 삭제 순서와 직원 FK 거부를 검증한다.
- [ ] 삭제 실패 뒤 대상 팀, 자기 Closure, 조상 Closure와 직원 참조가 모두 보존됨을 확인한다.
- [ ] leaf 삭제 뒤 다른 팀의 Closure와 adjacency 관계가 변경되지 않음을 확인한다.

#### 완료 조건

- FR-008의 안전한 leaf 삭제 범위와 모든 검증 항목이 완료되어야 한다.
- 하위 팀 또는 소속 직원의 암묵적 cascade 삭제가 없어야 한다.
- Mandatory Gate G1~G7 중 적용 항목과 TDD 증거가 통과해야 한다.
- 수정 가능·금지 경로를 준수하고 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 하위 팀이나 소속 직원이 있는 팀이 삭제됨
- Closure만 삭제되거나 팀만 삭제되는 부분 반영이 발생함
- DB 내부 오류 또는 SQL 정보가 도메인 오류로 정제되지 않음
- 선행 Task의 이동·잠금 계약과 충돌하거나 관련 검증이 실패함
- 필수 검증 실패 또는 `quality_score`가 90 미만임

#### 제외 범위

- 팀 논리 삭제, 하위 팀 cascade 삭제와 직원 자동 재배치
- 직원 비활성화 또는 삭제 정책 변경
- 삭제 복구와 조직 변경 이력

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 6. 팀 Controller 및 HTTP 통합 검증

#### 선행 Task

- `Task 5`

#### 작업 목적

팀 계층 유스케이스를 프로젝트 API·보안·오류·OpenAPI 규칙에 맞는 Controller로 노출하고 실제 HTTP 흐름에서 계층 정합성과 권한 경계를 통합 검증한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/team/controller`
- `backend/src/main/java/com/flowbi/domain/team/dto`
- `backend/src/main/java/com/flowbi/domain/team/service`
- `backend/src/test/java/com/flowbi/domain`
- `backend/API.md`

#### 수정 금지 경로

- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `SECURITY.md`
- `docs/product-specs`
- `docs/design-docs`
- `frontend`

#### 구현 항목

- [ ] `backend/API.md`에 팀 API의 Request·Response, DB distance와 표시 depth, 인증·인가, HTTP 상태와 오류 코드를 먼저 명시한다. 요구사항: FR-005~FR-008, NFR-001.
- [ ] Red: 인증 사용자 조회, 미인증 401, 일반 사용자 변경 403, 관리자 변경, CSRF, 입력 검증, 오류 응답, OpenAPI와 생성→조회→이동→삭제 HTTP 흐름 테스트를 먼저 작성해 실패시킨다.
- [ ] 조회 API로 `GET /api/teams`, `GET /api/teams/:teamId`, `/parent`, `/children`, `/ancestors`, `/descendants`, `/path`, `/tree`를 구현한다. `:teamId`는 실제 Spring 경로 변수 `teamId`를 뜻한다.
- [ ] 변경 API로 `POST /api/teams`, `PATCH /api/teams/:teamId/name`, `PUT /api/teams/:teamId/parent`, `DELETE /api/teams/:teamId`를 구현하고 각각 `201`, `200`, `200`, `204` 계약을 적용한다.
- [ ] 모든 API는 인증을 요구하고 변경 API는 현행 `AuthenticatedUser.Role.ADMIN`만 허용하며, Request Body의 사용자 ID나 role은 신뢰하지 않는다.
- [ ] 현행 `ADMIN`의 세부 RBAC 확장이나 역할 영속 모델 변경 없이 Controller와 Service 양쪽에서 팀 변경 권한을 fail-closed로 검증한다.
- [ ] `TeamCreateRequest`, `TeamMoveRequest`, `TeamNameUpdateRequest`에 Bean Validation과 도메인 검증을 적용하고 Entity를 응답으로 노출하지 않는다.
- [ ] `TeamApiExceptionHandler`가 입력 오류 400, 미인증 401, 권한 부족 403, 팀·부모 없음 404, 이름 중복·자기 부모·순환·동일 부모·자식 존재·사용 중 409를 안정적인 코드와 안전한 메시지로 반환한다.
- [ ] Closure 불일치는 500 `TEAM_HIERARCHY_INCONSISTENT`로 처리하고 SQL, 내부 클래스, 관계 ID와 stack trace를 응답에 노출하지 않는다.
- [ ] 팀 Endpoint, DTO, 응답 코드와 오류 응답을 OpenAPI에 문서화하고 `local`·`harness` 공개 및 기본 Profile 비노출 정책을 유지한다.
- [ ] Green 이후 인증·권한 경계, DTO 변환과 예외 매핑의 중복을 제거하는 범위로 Refactor한다.

#### 검증 항목

- [ ] `./gradlew.bat test --tests "*TeamControllerTest" --tests "*TeamSecurityIntegrationTest"`가 인증·ADMIN 권한·CSRF·입력·상태 코드 계약을 검증하며 통과한다.
- [ ] `./gradlew.bat test --tests "*TeamOpenApiContractTest"`가 API 문서와 실제 Controller 계약의 충돌이 없음을 검증하며 통과한다.
- [ ] `./gradlew.bat test --tests "*TeamHttpFlowIntegrationTest"`가 선행 Task의 공개 Service 계약을 통해 최상위·하위 생성, 트리 조회, 하위 트리 이동과 leaf 삭제를 실제 HTTP로 통합 검증한다.
- [ ] 일반 사용자와 미인증 요청이 변경 Service를 호출하지 않고, 관리자 요청도 유효한 CSRF 없이는 상태를 변경하지 못함을 확인한다.
- [ ] 오류 응답과 로그에 세션 ID, CSRF Token, 개인정보, SQL과 내부 예외 정보가 포함되지 않음을 확인한다.

#### 완료 조건

- FR-005~FR-008과 NFR-001의 API 범위 및 모든 검증 항목이 완료되어야 한다.
- `backend/API.md`, Controller, DTO, OpenAPI와 테스트 계약이 일치해야 한다.
- Mandatory Gate G1~G7과 TDD Red → Green → Refactor 증거가 통과해야 한다.
- 수정 가능·금지 경로를 준수하고 보안·권한 작업 기준 `quality_score`가 90 이상이어야 한다.

#### 실패 조건

- 미인증 또는 일반 사용자가 팀 상태를 변경할 수 있음
- CSRF, 오류 코드, HTTP 상태 또는 depth 응답 계약이 문서와 다름
- Request의 userId·role을 권한 근거로 사용하거나 내부 정보가 노출됨
- 선행 Task의 생성·조회·이동·삭제 계약과 Controller 통합이 충돌함
- Product Spec 또는 Design Doc의 관리자 책임 분리 의미를 확장하거나 변경함
- 필수 검증 실패 또는 `quality_score`가 90 미만임

#### 제외 범위

- `roles`, `permissions`, `user_roles`, `role_permissions` 영속 모델과 세부 RBAC Adapter 구현
- 시스템 관리자와 인사팀 관리자의 역할 마이그레이션 및 기존 세션 권한 전환
- Frontend 조직도·관리 화면
- 페이지네이션, 캐시, 조직 변경 감사 이력

#### 작업 결과

`none`

#### 남은 문제

`none`

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목과 검증 항목이 완료되어야 한다.
- 모든 Task에서 적용되는 Mandatory Gate G1~G7이 통과하고 Red → Green → Refactor 증거가 기록되어야 한다.
- Task 간 결과가 정상적으로 통합되고 `teams.parent_team_id`, `teams_closure`, Entity, Service, Controller, API·DB 문서가 일치해야 한다.
- 각 Task의 변경이 해당 수정 가능 경로 안에 있고 수정 금지 경로와 사용자 소유의 `backend/src/main/resources/application.yml` 변경을 침범하지 않아야 한다.
- PostgreSQL Testcontainers에서 Migration, FK, CHECK, UNIQUE, Index, bulk query, lock, rollback이 검증되어야 하며 Docker 미제공으로 해당 테스트가 skip되면 완료로 처리하지 않는다.
- Harness 최종 검증으로 `./gradlew.bat spotlessCheck`, `./gradlew.bat test`, `./gradlew.bat build`가 모두 통과해야 한다.
- 인증·인가, DB Migration, 트랜잭션과 동시성을 포함하므로 전체 `quality_score`가 90 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task 또는 검증 명령이 실패함
- 기존 Migration 또는 사용자 소유 변경을 덮어쓰거나 Task별 수정 가능 경로 밖·수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌하거나 상세 RBAC 모델을 승인 없이 확장함
- Closure depth, adjacency, 경로·트리 표시 depth 또는 이동 공식이 서로 불일치함
- 미인증·권한 부족·CSRF 실패 요청이 상태를 변경하거나 하위 팀·소속 직원 데이터가 암묵적으로 삭제됨
- PostgreSQL 고유 제약·동시성 검증을 H2 결과로 대체하거나 테스트 실패·skip을 숨김
- 관련 API·DB 문서와 구현이 불일치하거나 남은 문제가 사용자 확인 없이 방치됨
- 전체 `quality_score`가 90 미만임
