# 작업 계획: organization-chart-01

## 1. 기본 정보

### 사용자 요청

조직도 MVP 기능을 구현하여 인증된 사용자가 팀 계층을 탐색하고, 선택한 팀의 직원 목록과 선택한 직원의 기본 정보를 확인할 수 있게 한다.

### 작업 목적

현재 존재하는 팀 계층과 직원 데이터를 조직도 조회 흐름으로 연결한다. 조직도 화면에서 전체 팀 계층, 팀별 직원, 직원의 프로필 사진·이름·직급·소속팀·사내 내선번호·회사 이메일·계정 상태·근무 상태를 안전하고 접근 가능하게 제공한다.

### 작업 유형

- feature

### 관련 설계 문서

- Product Spec: `docs/product-specs/organization-chart.md`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `SECURITY.md`, `CONVENTIONS.md`, `frontend/FRONTEND.md`, `frontend/DESIGN.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`, `docs/quality/quality-model.md`

---

## 2. 실행 Task

### Task 1. 인증 사용자용 전체 팀 계층 조회 API

#### 선행 Task

- `없음`

#### TDD 정책

- REQUIRED

#### 작업 목적

기존 팀 계층 조회 서비스를 이용해 인증된 사용자가 조직도의 모든 최상위 팀과 하위 팀을 한 번에 조회할 수 있는 읽기 전용 API를 제공한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/team`
- `backend/src/test/java/com/flowbi/domain/team`
- `backend/API.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `backend/DB_SCHEMA.md`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red 단계에서 `GET /api/teams/tree`가 인증된 사용자에게 정렬된 전체 팀 계층을 반환하고, 미인증 요청을 거부하며, 손상된 계층은 안전한 오류로 실패해야 한다는 Controller·Service 실패 테스트를 먼저 작성해 의도한 이유로 실패함을 기록한다.
- [ ] Green 단계에서 기존 `TeamHierarchyService.findOrganizationTree()`를 재사용해 여러 최상위 팀과 임의 깊이의 하위 팀을 `teamId`, `teamName`, `depth`, `children` 구조로 반환하는 최소 읽기 API를 구현한다.
- [ ] 응답 순서는 각 계층에서 팀 이름과 팀 ID 기준으로 결정적으로 유지하고, 팀이 없으면 오류가 아닌 빈 배열을 반환한다.
- [ ] 모든 요청에서 서버가 제공한 인증 사용자 정보를 확인하고, 요청 값으로 사용자 신원이나 권한을 대체하지 않으며, 내부 계층 오류와 구현 정보를 응답에 노출하지 않는다.
- [ ] `backend/API.md`에 조직도 전체 팀 계층 Endpoint, 인증 조건, 응답 구조, 빈 결과와 오류 계약을 실제 구현과 일치하게 갱신한다.
- [ ] Refactor 단계에서 기존 단일 subtree Endpoint와 전체 조직도 Endpoint가 계층 조립·정렬 로직을 중복하지 않도록 현재 팀 도메인 내부에서만 정리하고 관련 테스트를 다시 통과시킨다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 허용 범위의 구현 또는 테스트를 수정해 재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/backend_verifier.py test --tests 'com.flowbi.domain.team.controller.TeamControllerTest' --tests 'com.flowbi.domain.team.service.TeamHierarchyQueryServiceTest'`로 전체 트리, 다중 root, 임의 깊이, 정렬, 빈 결과, 미인증 거부와 손상 계층 실패를 검증한다.
- [ ] `git diff --check -- backend/src/main/java/com/flowbi/domain/team backend/src/test/java/com/flowbi/domain/team backend/API.md`로 변경 범위의 patch 형식과 후행 공백을 검증한다.
- [ ] API 응답이 팀 계층 조회에 필요하지 않은 직원 개인정보나 내부 Closure 행을 포함하지 않는지 테스트로 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 인증된 사용자가 모든 root와 하위 팀을 결정적인 순서의 계층 구조로 조회할 수 있어야 한다.
- 미인증 요청과 손상된 계층은 데이터 또는 내부 구현을 노출하지 않고 안전하게 실패해야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 미인증 사용자가 조직 계층을 조회할 수 있음
- 전체 조직 트리에서 root·하위 팀이 누락되거나 중복됨
- Closure Table 내부 행 또는 불필요한 개인정보를 API로 노출함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 팀 생성, 이름 변경, 이동, 삭제 등 관리자 조직 관리 기능
- 팀 계층 저장 방식 또는 Closure Table 스키마 변경
- 직원 목록과 직원 상세 조회
- 조직도 Frontend 화면 구현

#### 작업 결과

`none`

#### 남은 문제

`none`

---

### Task 2. 팀별 직원 목록과 조직도 직원 상세 API

#### 선행 Task

- `Task 1`

#### TDD 정책

- REQUIRED

#### 작업 목적

선택한 팀의 직원 목록과 선택한 직원의 조직도 기본 정보를 제공하고, 계정 상태와 별개인 근무 상태를 Product Spec의 허용값으로 저장·조회한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/test/java/com/flowbi/domain/user`
- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`

#### 수정 금지 경로

- `frontend`
- `backend/src/main/java/com/flowbi/domain/team`
- `backend/src/test/java/com/flowbi/domain/team`
- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/test/java/com/flowbi/domain/auth`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red 단계에서 인증된 사용자의 `GET /api/users?teamId=:teamId`와 `GET /api/users/:userId` 조회, 활성·비활성 계정 표시, 직원이 없는 팀, 존재하지 않는 팀·직원, 미인증 요청, 허용되지 않은 근무 상태와 개인정보 최소화 시나리오를 실패 테스트로 먼저 작성해 의도한 이유로 실패함을 기록한다.
- [ ] Red 단계에서 PostgreSQL Migration이 기존 직원의 근무 상태를 `OFFLINE`으로 backfill하고 `WORKING`, `IN_MEETING`, `OUT_OF_OFFICE`, `ON_LEAVE`, `OFFLINE` 이외 값을 DB에서 거부하는 실패 통합 테스트를 작성한다.
- [ ] Green 단계에서 계정 상태와 분리된 근무 상태 Enum과 `work_status` 컬럼을 추가하고, 기존 행 및 신규 직원의 기본 근무 상태를 `OFFLINE`으로 보장하는 비파괴 Flyway Migration과 Entity Mapping을 구현한다.
- [ ] 팀별 직원 목록은 `userId`, `name`, `position`, `accountStatus`, `workStatus`, `profileImageUrl`만 반환하고 이름과 사용자 ID 기준으로 결정적으로 정렬하며, 직원이 없으면 빈 배열을 반환한다.
- [ ] 직원 상세는 Product Spec에 명시된 프로필 사진 URL, 이름, 직급, 소속팀, 사내 내선번호, 회사 이메일, 계정 상태와 근무 상태만 반환하고 사번·인증정보·역할·세션정보는 포함하지 않는다.
- [ ] 조직도 조회는 활성·비활성 계정을 모두 구분해 표시하되 인증된 사용자만 접근할 수 있게 하고, 존재하지 않는 팀·직원은 안전한 `404` 계약으로 처리하며 이메일과 내선번호를 로그에 남기지 않는다.
- [ ] 목록·상세 Query가 Entity의 지연 로딩이나 무제한 후속 Query에 의존하지 않도록 필요한 Projection 또는 전용 조회 경계를 사용하고 PostgreSQL 통합 테스트로 Mapping과 Query 결과를 검증한다.
- [ ] `backend/API.md`, `backend/DB_SCHEMA.md`와 Migration을 실제 목록·상세 응답 및 근무 상태 제약과 같은 Task에서 동기화한다.
- [ ] Refactor 단계에서 목록·상세 DTO와 상태 변환의 책임을 명확히 하고 중복된 조직도 직원 Mapping만 정리한 뒤 관련 테스트를 다시 통과시킨다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 허용 범위의 구현 또는 테스트를 수정해 재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/backend_verifier.py test --tests 'com.flowbi.domain.user.service.UserServiceTest' --tests 'com.flowbi.domain.user.repository.UserRepositoryIntegrationTest' --tests 'com.flowbi.domain.user.OrganizationChartUserApiTest' --tests 'com.flowbi.domain.user.OrganizationChartUserMigrationPostgresTest'`로 팀별 목록, 상세 필드, 활성·비활성 계정, 다섯 근무 상태, 빈 결과, 정렬, 404, 미인증 거부와 PostgreSQL 제약을 검증한다.
- [ ] `git diff --check -- backend/src/main/java/com/flowbi/domain/user backend/src/test/java/com/flowbi/domain/user backend/src/main/resources/db/migration backend/API.md backend/DB_SCHEMA.md`로 변경 범위의 patch 형식과 후행 공백을 검증한다.
- [ ] 목록·상세 응답과 오류·로그에 사번, 인증정보, 역할, 세션 식별자 또는 요청하지 않은 개인정보가 없는지 계약 테스트로 확인한다.
- [ ] Migration이 기존 사용자 행을 보존하고 PostgreSQL에서 `work_status`의 NOT NULL·기본값·CHECK 제약과 Entity Mapping이 일치하는지 확인한다.
- [ ] 기존 직원 상세 조회의 식별자·팀·직급 Mapping과 `404` 동작에 회귀가 없는지 Task 2의 User Service·Repository 테스트로 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 인증된 사용자가 팀별 직원 목록과 직원 기본 정보를 조회하고 계정 상태와 근무 상태를 서로 구분할 수 있어야 한다.
- API가 Product Spec에 필요한 정보만 반환하고 기존 직원 데이터가 손실되지 않아야 한다.
- API·DB 문서, Migration, Entity와 테스트가 동일한 계약을 표현해야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 미인증 사용자가 직원 개인정보를 조회할 수 있음
- 계정 상태와 근무 상태를 하나의 값으로 혼합함
- 허용되지 않은 근무 상태를 저장하거나 기존 사용자 행을 손실함
- 직원 응답에 사번, 인증정보, 역할, 세션 식별자 또는 요구되지 않은 개인정보가 포함됨
- API·DB 문서, Migration과 구현이 불일치함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 직원 등록, 수정, 삭제, 비활성화와 근무 상태 변경 UI·API
- 근무 상태를 일정·회의·로그인 여부로 자동 계산하는 정책
- 외부 인사·Presence 시스템과 근무 상태 동기화
- 직원 검색, 페이지네이션과 하위 팀 직원 통합 조회

#### 작업 결과

`none`

#### 남은 문제

- 근무 상태 변경 주체와 자동 동기화 정책은 별도 Product Spec 또는 Design Doc에서 확정해야 한다.

---

### Task 3. 조직도 화면 연동 및 통합 검증

#### 선행 Task

- `Task 1`
- `Task 2`

#### TDD 정책

- REQUIRED

#### 작업 목적

인증된 사용자가 반응형 조직도 화면에서 팀 계층을 탐색하고, 팀별 직원 목록과 선택한 직원의 기본 정보를 접근 가능하게 확인하도록 Frontend 흐름을 구현한다.

#### 수정 가능 경로

- `frontend/src/features`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/test/App.test.tsx`

#### 수정 금지 경로

- `backend`
- `frontend/cypress`
- `frontend/cypress.config.ts`
- `frontend/package.json`
- `frontend/src/features/auth`
- `frontend/src/features/current-user`
- `frontend/src/features/meeting-room`
- `frontend/src/features/schedule-calendar`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red 단계에서 전체 팀 계층 표시, 팀 선택 후 직원 목록 조회, 직원 선택 후 상세 표시, 계정·근무 상태 구분, 로딩·빈 결과·오류·재시도·인증 만료, 키보드 탐색과 모바일 정보 흐름을 사용자 관찰 가능 컴포넌트 테스트로 먼저 작성해 의도한 이유로 실패함을 기록한다.
- [ ] Green 단계에서 `frontend/src/features/organization-chart` 공개 경계를 만들고 팀 트리, 팀별 직원 목록, 직원 상세 API 계약과 TanStack Query 조회를 실제 Backend 응답에 맞게 구현한다.
- [ ] App 탐색에 `조직도` 항목과 화면 전환을 추가하고 데스크톱·모바일 Sidebar에서 현재 위치와 포커스가 일관되게 동작하도록 기존 App Shell 흐름에 최소 범위로 연결한다.
- [ ] 조직도 영역은 임의 깊이의 팀 계층을 시맨틱한 트리 또는 중첩 목록으로 제공하고, 확장·축소 및 팀 선택을 키보드로 수행할 수 있으며 선택 상태를 색상에만 의존하지 않게 표현한다.
- [ ] 팀 선택 전 안내, 직원이 없는 팀의 빈 상태, 목록·상세 로딩, 조회 실패와 재시도, 존재하지 않는 직원, 인증 만료를 서로 구분해 표시하고 오래된 팀·직원 응답이 현재 선택을 덮어쓰지 않게 한다.
- [ ] 직원 목록에서 이름, 직급, 계정 상태와 근무 상태를 구분해 표시하고, 상세 영역에서 프로필 이미지 또는 접근 가능한 대체 표현, 이름, 직급, 소속팀, 내선번호, 이메일, 계정 상태와 근무 상태를 제공한다.
- [ ] 계정·근무 상태는 텍스트와 의미가 드러나는 시각 표시를 함께 사용하고, API의 다섯 근무 상태와 두 계정 상태를 빠짐없이 사용자용 한국어로 변환한다.
- [ ] 작은 화면에서는 팀 계층, 직원 목록, 직원 상세를 순차적으로 사용할 수 있게 하고 선택·뒤로 이동 후 초점이 논리적인 위치로 이동하도록 한다.
- [ ] Refactor 단계에서 API 응답 타입, 화면 모델 변환, Query Key와 표시 컴포넌트의 책임을 조직도 기능 내부에서 분리하고 기존 기능 내부 파일을 직접 참조하지 않도록 정리한다.
- [ ] 구현 문제로 검증이 실패하면 최대 3회까지 허용 범위의 구현 또는 테스트를 수정해 재검증하고, 계속 실패하면 우회하지 않고 실패 원인과 남은 문제를 기록한다.

#### 검증 항목

- [ ] `"$FLOW_BI_PYTHON_EXECUTABLE" .agents/scripts/worker_runner/frontend_verifier.py run test:unit`로 조직도 API 계약, 계층 탐색, 팀·직원 선택, 상태 표시, 로딩·빈 결과·오류·재시도·인증 만료, 키보드와 App 탐색 회귀를 검증한다.
- [ ] `git diff --check -- frontend/src/features frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/test/App.test.tsx`로 변경 범위의 patch 형식과 후행 공백을 검증한다.
- [ ] 컴포넌트 테스트에서 계정 상태와 근무 상태가 색상 없이도 구분되고, 프로필 이미지가 없거나 내선번호가 비어 있어도 이해 가능한 대체 표현을 제공하는지 확인한다.
- [ ] Cypress 파일·설정·Script를 추가하거나 수정하지 않았고 Cypress를 실행하지 않았음을 작업 결과에 기록한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- 인증된 사용자가 데스크톱과 모바일에서 팀 계층, 팀별 직원 목록과 직원 기본 정보를 순서대로 탐색할 수 있어야 한다.
- 로딩, 빈 상태, 오류, 인증 만료와 누락된 선택 정보가 명확히 구분되고 키보드만으로 핵심 흐름을 수행할 수 있어야 한다.
- 실제 Backend 계약과 다른 Mock 또는 임시 타입으로 테스트를 통과시키지 않아야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트 또는 빌드 실패
- 팀 또는 직원 선택 결과가 현재 선택과 다른 데이터를 표시함
- 계정 상태와 근무 상태를 구분하지 않거나 허용 상태 일부를 표시하지 못함
- 로딩·빈 결과·오류·인증 만료를 성공 데이터로 위장함
- 키보드로 팀과 직원을 선택하거나 상세를 확인할 수 없음
- 실제 Backend API와 다른 Mock 또는 임시 응답 계약으로 완료함
- Cypress를 추가·수정·실행함
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- 직원 등록·수정·삭제와 본인 개인정보 수정
- 직원 근무 상태 변경, 채팅 연결과 관리자 조직 편집 UI
- 직원 검색, 정렬 옵션, 페이지네이션과 가상화
- Cypress E2E 테스트 작성·환경 구축·실행

#### 작업 결과

`none`

#### 남은 문제

- 근무 상태 변경·동기화 기능이 도입되기 전까지 조직도는 Backend에 저장된 현재 값만 표시한다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Task 간 결과가 정상적으로 통합되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 수정 금지 경로에 변경이 없어야 한다.
- 관련 Product Spec, API, DB 문서와 실제 구현이 일치해야 한다.
- Harness 실행기가 모든 Task 완료 후 Backend `spotlessCheck`, 전체 `test`, `build`와 Frontend `npm run check`를 한 번씩 실행해 전체 정적 분석·테스트·빌드 회귀가 없어야 한다.
- PostgreSQL Migration 검증에서 기존 사용자 데이터가 보존되고 근무 상태 제약과 Entity Mapping이 일치해야 한다.
- 인증된 사용자가 전체 팀 계층에서 팀을 선택하고 직원 목록과 직원 기본 정보를 데스크톱·모바일 및 키보드 환경에서 확인할 수 있어야 한다.
- 직원 개인정보는 Product Spec에 필요한 범위로만 노출되고 미인증 요청은 서버에서 거부되어야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 관련 Product Spec 또는 Design Doc과 충돌함
- API, DB 문서, Migration, Backend와 Frontend 계약이 서로 불일치함
- 기존 사용자 데이터가 손실되거나 개인정보·인증정보가 필요 이상으로 노출됨
- 미인증 요청이 조직 또는 직원 정보를 조회함
- 계정 상태와 근무 상태가 혼합되거나 허용 상태를 검증할 수 없음
- Cypress가 Harness 검증 범위에 추가되거나 실행됨
- 남은 문제가 사용자 확인 없이 방치됨
