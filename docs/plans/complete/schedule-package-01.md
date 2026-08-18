# 작업 계획: schedule-package-01

## 1. 기본 정보

### 사용자 요청

Schedule 관련 Backend 파일이 도메인 루트에 모여 있는 구조를 역할별 하위 패키지로 정리한다.

### 작업 목적

`com.flowbi.domain.schedule` 루트에 혼재한 HTTP 경계, DTO, 서비스, 영속 모델과 Repository 구현을 현재 Backend 계층 원칙에 맞는 하위 패키지로 이동한다. 일정 API, DB Schema, 인증·인가 및 비즈니스 동작은 변경하지 않고 패키지 소유권과 의존 방향을 명확하게 만든다.

### 작업 유형

- refactor

### 관련 설계 문서

- Product Spec: `없음`
- Design Doc: `없음`
- Architecture: `ARCHITECTURE.md`
- 기타 참고 문서: `CONVENTIONS.md`, `backend/AGENTS.md`, `backend/BACKEND.md`

---

## 2. 실행 Task

### Task 1. Schedule Backend 패키지 구조 정리

#### 선행 Task

- `없음`

#### 작업 목적

Schedule 제품 코드와 테스트를 `controller`, `dto`, `service`, `entity`, `repository`, `port` 등 실제 책임에 맞는 하위 패키지로 재배치하고, 컴파일 시점의 패키지 소유권과 계층 의존 방향을 회귀 테스트로 고정한다.

#### 수정 가능 경로

- `backend/src/main/java/com/flowbi/domain/schedule`
- `backend/src/test/java/com/flowbi/domain/schedule`

#### 수정 금지 경로

- `backend/src/main/java/com/flowbi/domain/auth`
- `backend/src/main/java/com/flowbi/domain/user`
- `backend/src/main/java/com/flowbi/domain/team`
- `backend/src/main/java/com/flowbi/domain/position`
- `backend/src/main/resources/db/migration`
- `backend/API.md`
- `backend/DB_SCHEMA.md`
- `frontend`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `docs/product-specs`
- `docs/design-docs`
- `docs/quality`

#### 구현 항목

- [ ] Red: Schedule의 Controller, DTO·Command·Query, Service·Transaction, JPA Entity·값 타입, Repository·영속 Adapter와 Port가 책임별 하위 패키지에 존재하고 기존 Schedule 루트 패키지에 구체 클래스가 남지 않는다는 패키지 구조 테스트를 먼저 작성해 현재 평면 구조에서 의도한 실패를 확인한다.
- [ ] `ScheduleController`와 예외 응답 경계를 `controller`, API 입출력·Command·Query·조회 Projection을 `dto`, Use Case·트랜잭션·접근 정책을 `service`, JPA Aggregate·연관 Entity·영속 값 타입을 `entity`, JPA Repository와 JDBC 영속 Adapter를 `repository`로 이동하고 기존 `port` 계약은 하위 패키지로 유지한다.
- [ ] 도메인 예외와 감사 값처럼 위 계층에 속하지 않는 타입은 역할이 드러나는 최소 하위 패키지로 묶되, 새로운 계층이나 외부 의존성을 도입하지 않는다.
- [ ] 제품 코드 이동에 맞춰 모든 Package 선언, Import, Spring Component Scan, JPA 연관 Mapping과 접근 제한자를 정리하고 Schedule 테스트도 검증 대상 책임과 대응하는 하위 패키지로 이동한다.
- [ ] 중단된 이전 작업 또는 다른 작업자가 만든 미커밋 Schedule 변경을 되돌리거나 누락하지 않고 새 경로에 보존한다.
- [ ] Green 이후 불필요한 `.gitkeep`, 기존 Schedule 루트 Package 참조와 중복 Import를 제거하되 API 경로, JSON 계약, DB Schema, Flyway Migration, 인증 Principal 및 일정 동작은 변경하지 않는다.

#### 검증 항목

- [ ] 새 패키지 구조 테스트에서 모든 Schedule 제품 타입이 지정된 책임 패키지에 존재하고 이전 루트 Package의 구체 타입이 제거됐으며 Controller → Service → Repository·Port 의존 방향에 역방향 또는 순환 의존이 없음을 확인한다.
- [ ] `cd backend && ./gradlew test --tests 'com.flowbi.domain.schedule.*'`로 일정 생성·조회·상세·수정·취소·참석자·권한·동시성·PostgreSQL Migration 회귀 테스트를 통과한다.
- [ ] `cd backend && ./gradlew spotlessCheck`로 이동·수정된 Java 파일의 Formatting과 Package·Import 정합성을 확인한다.
- [ ] `cd backend && ./gradlew compileJava compileTestJava`로 Spring Bean 탐색, JPA Mapping과 전체 Schedule 참조가 새 Package 구조에서 컴파일되는지 확인한다.
- [ ] `git diff --check`와 Schedule 기존 루트 Package 검색으로 충돌 표식, 공백 오류, 이전 Package Import와 루트의 잔여 Java 파일이 없음을 확인한다.

#### 완료 조건

- 모든 구현 항목이 완료되어야 한다.
- 모든 검증 항목이 통과해야 한다.
- Red → Green → Refactor 실행 결과가 작업 결과에 기록되어야 한다.
- Schedule의 API 경로·요청·응답, DB Schema·Migration, 인증·인가와 비즈니스 동작이 변경되지 않아야 한다.
- 중단된 이전 작업과 기존 미커밋 변경이 손실되지 않아야 한다.
- 수정 범위가 이 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 이 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- 기존 기능에 회귀 문제가 없어야 한다.
- `quality_score`가 `90` 이상이어야 한다.

#### 실패 조건

- 필수 구현 항목이 누락됨
- 테스트, Formatting 또는 컴파일 실패
- Schedule 루트에 구체 Java 타입이나 이전 Package Import가 남음
- API·DB·인증·인가 또는 일정 동작 계약이 변경됨
- 기존 미커밋 변경이 손실되거나 다른 작업자의 변경을 되돌림
- 이 Task의 수정 금지 경로 변경
- 이 Task의 수정 가능 경로 밖 변경
- 요구사항과 다른 동작 구현
- 3회 수정 후에도 동일한 검증 실패가 남음
- 검증할 수 없는 상태로 작업 종료
- `quality_score`가 기준 미달

#### 제외 범위

- Schedule 기능 추가 또는 비즈니스 규칙 변경
- 공개 API, DB Schema, Flyway Migration과 데이터 변경
- 인증 Principal, 권한 모델 또는 다른 도메인의 Package 구조 변경
- Frontend 파일과 사용자 화면 변경
- 의존성 또는 핵심 기술 스택 변경

#### 작업 결과

`none`

#### 남은 문제

- 실제 하위 패키지별 클래스 목록은 현재 클래스의 책임과 기존 의존 관계를 기준으로 확정하되, API·DB·인증 계약 변경이 필요해지는 분리는 이 Plan에서 수행하지 않는다.

---

## 3. 전체 완료 조건

- 모든 Task의 구현 항목이 완료되어야 한다.
- 모든 Task의 검증 항목이 통과해야 한다.
- Schedule 제품 코드와 테스트가 역할별 하위 패키지로 정리되어야 한다.
- 각 Task의 수정 범위가 해당 Task의 `수정 가능 경로`를 벗어나지 않아야 한다.
- 각 Task의 `수정 금지 경로`에 변경이 없어야 한다.
- API·DB·인증·인가와 일정 동작 계약에 회귀가 없어야 한다.
- 전체 `quality_score`가 `90` 이상이어야 한다.

## 4. 전체 실패 조건

- 하나 이상의 필수 Task가 실패함
- 필수 검증 명령이 실패함
- Task별 수정 가능 경로 밖의 변경이 발생함
- Task별 수정 금지 경로에 변경이 발생함
- 기존 미커밋 변경이 손실됨
- 관련 Architecture 또는 Backend 계층 원칙과 충돌함
- 관련 Product Spec 또는 Design Doc과 충돌함
- 남은 문제가 사용자 확인 없이 방치됨
