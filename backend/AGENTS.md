# Backend AGENTS.md

## 1. 목적과 적용 범위

이 문서는 `backend/`에서 작업하는 사람과 Backend Agent가 따라야 하는 영역 규칙을 정의한다. 루트 `AGENTS.md`를 구체화하며 상위 보안·아키텍처·Active Plan 규칙을 완화하지 않는다.

적용 대상:

- Java 및 Spring Boot 제품 코드
- PostgreSQL 스키마와 마이그레이션
- Redis 연동
- JWT 인증과 RBAC 인가
- API, 비즈니스 규칙, 테스트와 백엔드 문서

## 2. 작업 전 필수 확인

Backend Agent는 변경 전에 다음을 MUST 확인한다.

1. 루트 `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CONVENTIONS.md`
2. 승인된 Active Plan과 담당 Task
3. 관련 Product Spec, Design Doc 및 ADR
4. `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md`
5. `docs/quality/quality-model.md`
6. 수정 가능·금지 경로와 완료·실패 조건

문서와 요구사항이 충돌하면 임의로 스키마나 API를 확정하지 않는다. 특히 현재 ERD는 Initial Baseline이므로 전체 문서 검토 전 구조 개선을 구현에 선반영하지 않는다.

## 3. 작업 범위

- Backend는 `backend/`만 수정한다.
- Frontend, Harness 및 루트 정책은 `backend/` 범위를 벗어나므로 직접 수정하지 않고, 기록해두었다가 담당 Agent가 수정한다.
- 공개 API 또는 DB 스키마 변경은 관련 문서와 마이그레이션을 같은 Task에서 갱신한다.
- 승인되지 않은 의존성, 외부 서비스, 저장소 또는 아키텍처 패턴을 도입하지 않는다.
- 다른 도메인의 테이블이나 내부 구현을 편의상 직접 조작하지 않는다.
- 범위 밖 문제는 기술 부채 또는 검토 대기 항목으로 기록한다.

## 4. TDD 실행 규칙

백엔드 구현과 버그 수정은 루트 TDD 규칙을 따른다.

- 도메인 규칙과 유스케이스의 실패 테스트를 제품 코드보다 먼저 작성한다.
- 정상, 경계, 검증 실패, 권한 거부와 상태 충돌을 검증한다.
- DB 제약, 트랜잭션, 동시성에 의존하는 규칙은 통합 테스트를 포함한다.
- Controller 테스트만으로 도메인 규칙을 검증한 것으로 간주하지 않는다.
- Mock이 실제 권한·트랜잭션·쿼리 동작을 가리지 않도록 한다.

## 5. 도메인 기반 계층 책임

백엔드는 Gradle Group과 일치하는 `com.flowbi.domain.{domain-name}`으로 도메인을 먼저 분리하고 각 도메인 내부를 다음 계층으로 구성한다.

- Controller: HTTP 입력 변환, 인증된 사용자 문맥 전달과 응답 조립
- Service: Use Case, 비즈니스 규칙과 트랜잭션 경계
- Repository: DB 접근과 영속성 Query
- Entity: JPA Entity와 도메인 상태
- DTO: API Request 및 Response

의존 방향은 `Controller → Service → Repository`를 따른다.

- Controller는 Repository에 직접 접근하지 않는다.
- Repository는 Service 또는 Controller에 의존하지 않는다.
- 한 도메인의 Service가 다른 도메인의 Repository를 직접 사용하지 않는다.
- Entity를 API DTO로 직접 노출하지 않는다.
- `global/`에는 기술 공통 기능만 두고 비즈니스 규칙을 이동하지 않는다.
- 순환 의존을 만들지 않는다.

## 6. 인증과 인가

- 초기 테스트 편의를 위해 Spring Security 의존성이 주석 처리되어 있어도 `SECURITY.md`의 요구사항은 완화되지 않는다.
- 인증 기능을 구현하거나 보호 API를 완료 처리하기 전에는 Spring Security를 활성화하고 관련 테스트를 통과해야 한다.
- 모든 보호 API는 백엔드에서 인증과 권한을 검증한다.
- 사용자 ID를 요청 Body 값만으로 신뢰하지 않고 인증 문맥과 대조한다.
- 관리자, 소유자, 참석자, 팀·프로젝트 소속 등 객체 수준 권한을 검증한다.
- 비밀번호와 토큰을 로그 또는 응답에 노출하지 않는다.
- 보안·Permission 위반은 Harness가 자동 재시도하지 않는다.
- 인증 방식 또는 토큰 정책 변경은 사람의 승인이 필요하다.

## 7. 트랜잭션과 데이터

- 트랜잭션은 유스케이스 경계에서 명시한다.
- 조회 작업과 변경 작업의 의도를 구분한다.
- 회의실 예약과 일정 생성처럼 함께 성공해야 하는 변경은 하나의 일관된 경계에서 처리한다.
- 동시 예약 등 경쟁 조건을 사전 조회만으로 해결하지 않는다.
- DB 무결성 오류를 일반 서버 오류로 숨기지 않고 적절한 도메인 충돌로 변환한다.
- Redis는 PostgreSQL의 기준 데이터를 대체하지 않는다.

## 8. API와 오류

- `backend/API.md`의 경로, 요청, 응답과 오류 계약을 따른다.
- 입력은 Bean Validation 또는 승인된 검증 방식과 도메인 검증으로 확인한다.
- 예측 가능한 오류를 명시적인 오류 코드로 변환한다.
- 내부 예외와 Stack Trace를 클라이언트에 노출하지 않는다.
- 목록 조회는 기간 또는 Pagination 경계를 가진다.
- 날짜와 시간은 ISO 8601 및 명확한 시간대 표현을 사용한다.

## 9. 마이그레이션

- 스키마 변경은 버전 관리되는 마이그레이션으로 수행한다.
- 적용된 마이그레이션 파일을 수정하지 않고 새 마이그레이션을 추가한다.
- 파괴적 변경은 전환, 데이터 보존과 복구 계획 및 사람 승인이 필요하다.
- 마이그레이션과 `DB_SCHEMA.md`를 같은 Task에서 갱신한다.
- Initial Baseline의 개선은 별도 검토와 ADR 승인 후 수행한다.

## 10. 완료 조건

Backend Task는 다음을 충족해야 한다.

- Active Plan의 유스케이스와 인수 조건을 충족한다.
- TDD 증거가 있고, 적용 가능한 전체 테스트 통과한다.
- 인증·인가 및 객체 수준 접근을 검증한다.
- 트랜잭션, 상태 전이와 실패 시 데이터 정합성을 검증한다.
- 공개 API 또는 DB 변경 시 문서·마이그레이션을 동기화한다.
- 로그와 응답에 민감정보가 없음을 확인한다.
- 미실행 검증, 남은 위험과 기술 부채를 보고한다.

기본 검증 명령은 다음과 같다.

```text
./gradlew spotlessCheck
./gradlew test
./gradlew build
```

Gradle Wrapper가 아직 생성되지 않은 초기 단계에서는 Wrapper 생성과 버전 확정이 선행되어야 한다.

Repository를 Clone한 뒤 최초 한 번 다음 명령으로 Pre-commit Hook을 활성화한다.

```text
chmod +x scripts/pre-commit
git config core.hooksPath scripts
```

- Hook 설정은 해당 Local Repository에만 적용된다.
- Commit 전에 `git config --get core.hooksPath` 결과가 `scripts`인지 확인할 수 있다.
- Pre-commit Hook은 Staged Java 파일에 Spotless Formatting과 검사를 수행해야 한다.
- Hook 실행 후 파일과 Staged Diff가 변경되었는지 확인한다.
- Hook 성공만으로 테스트와 빌드가 통과했다고 판단하지 않는다.

## 11. 금지 사항

- 평문 또는 복호화 가능한 비밀번호 저장
- Entity의 API 직접 노출
- Controller에 핵심 비즈니스 규칙 구현
- 프런트엔드에만 의존한 권한 통제
- 문자열 연결 SQL 작성
- 트랜잭션 없이 상호 의존 데이터 변경
- 테스트 단언 약화 또는 예외 삼키기
- 현재 ERD의 미승인 개선 선반영
- 비밀정보 또는 원문 토큰 로그 출력

## 12. 작업 보고

Backend Agent는 결과에 다음을 포함한다.

- 구현한 유스케이스와 요구사항 ID
- Red, Green, 최종 테스트 결과
- 변경한 API, 스키마와 마이그레이션
- 권한·트랜잭션·동시성 검증 결과
- 남은 문제와 사람의 결정이 필요한 사항
