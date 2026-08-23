# BACKEND.md

## 1. 문서 목적과 범위

- 범위: Spring Boot 백엔드 구현 기준
- 목적: 아키텍처 문서의 상위 원칙을 구현 수준에서 구체화한다.

이 문서는 백엔드 구현 구조와 기술 기준을 다루며, 기능 요구사항과 UI 기준은 각각 Product Spec / Design Doc과 frontend 문서에 위임한다.

## 2. 기술 기준선

| 구분 | 기준 |
| --- | --- |
| Language | Java 17 |
| Framework | Spring Boot 3.5.7 |
| Build | Gradle Groovy DSL |
| Production Database | PostgreSQL |
| Current Test Database | H2 In-memory, MySQL Compatibility Mode |
| Cache | Redis |
| Persistence | Spring Data JPA |
| Authentication | Spring Security + Spring Session Redis |
| Authorization | RBAC |
| Formatting | Spotless 7.0.4 + Eclipse Formatter |
| Test | JUnit via Spring Boot Starter Test |

미확정 기술은 ADR 또는 승인된 Active Plan 없이 임의로 도입하지 않는다.

- 현재 Spring Security 의존성은 초기 테스트 편의를 위해 주석 처리되어 있지만 `SECURITY.md`의 요구사항은 완화되지 않는다. 인증 기능이나 보호 API를 완료하기 전에는 Spring Security를 활성화하고 관련 테스트를 통과해야 한다.
- H2는 테스트 전용이며 PostgreSQL과 SQL·제약 동작이 다르므로 H2 테스트만으로 운영 DB 호환성을 보장했다고 판단하지 않는다.
- H2 Console은 개발·테스트 Profile에서만 활성화하고 운영 환경에서는 노출하지 않는다.

## 3. 책임과 경계

백엔드는 다음을 담당한다.

- 인증·인가, 입력 검증, 비즈니스 규칙
- 트랜잭션과 데이터 정합성
- 조직, 일정, 회의실 예약, 알림, AI Assistant의 서버 측 실행
- 감사 가능하고 안정적인 오류 응답 제공

백엔드는 다음의 최종 책임자가 아니다.

- 사용자 화면 설계와 UI 흐름
- Product Spec의 기능 범위 결정
- 외부 서비스 도입 승인

## 4. 패키지 구조

```text
backend/src/
└── main/
    ├── java/com/flowbi/
    │   ├── global/
    │   │   ├── config/
    │   │   ├── common/
    │   │   ├── error/
    │   │   └── util/
    │   └── domain/
    │       ├── auth/
    │       ├── user/
    │       ├── schedule/
    │       └── room/
    └── resources/
        └── application.yml
```

- 기본 패키지 기준은 com.flowbi다.
- global에는 도메인 공통 기술 코드만 둔다.
- domain 아래에는 기능별 패키지를 추가하되, 각 도메인은 controller/service/repository/entity/dto 계층을 기본으로 한다.

## 5. 계층 원칙

- Controller는 HTTP 요청·응답 처리만 담당한다.
- Service는 Use Case, 비즈니스 규칙과 트랜잭션 경계를 담당한다.
- Repository는 영속성 접근을 담당한다.
- Entity와 DTO는 각각 영속 모델과 API 모델로 나눈다.
- Controller가 Repository를 직접 사용하지 않도록 한다.
- 한 도메인의 Service가 다른 도메인의 Repository를 직접 참조하지 않도록 하고, 필요한 경우 해당 도메인의 Service를 통해 협력한다.
- `global/`에는 기술 공통 기능만 두고 특정 도메인의 비즈니스 규칙·DTO·Entity·Repository를 두지 않는다.
- 사용하지 않는 계층이나 빈 패키지를 미리 만들지 않으며 역방향·순환 의존을 허용하지 않는다.

## 6. 데이터와 트랜잭션

- PostgreSQL을 기준 저장소로 사용한다.
- 스키마 변경은 마이그레이션과 문서 갱신을 함께 수행한다.
- 강한 정합성이 필요한 작업은 하나의 트랜잭션 경계로 처리한다.
- 외부 시스템 호출을 긴 DB 트랜잭션 안에서 수행하지 않는다.
- 동시성 제약은 사전 조회만으로 보장하지 않고 DB 제약 또는 승인된 동시성 제어를 함께 사용한다.
- DB 무결성 오류는 일반 서버 오류로 숨기지 않고 클라이언트가 처리할 수 있는 도메인 충돌로 변환한다.
- 데이터 삭제·비활성화 방식은 관련 Product Spec과 Design Doc을 따른다.
- DB 제약과 애플리케이션 검증을 함께 사용한다.
- 목록 조회는 N+1, 무제한 조회와 불필요한 대형 컬럼 로딩을 피한다.

## 7. API·인증·보안

- 클라이언트와 서버는 HTTPS 기반 JSON API로 통신한다.
- 요청 입력은 서버 경계에서 다시 검증한다.
- 인증이 필요한 API는 사용자 신원과 권한을 검사한다.
- 비밀번호는 복호화 가능한 형태로 저장하지 않는다.
- 브라우저에는 `HttpOnly`, `Secure`, `SameSite`가 적용된 Session Cookie만 전달하고, 세션 상태는 Redis에서 관리한다.
- 인증 이후 Principal 이름은 사번이 아니라 불변 내부 `userId` 문자열을 사용한다.
- 사용자별 세션 조회는 Spring Session의 Principal 인덱스를 사용하고 세션 무효화는 인증 Design Doc의 세대 기반 계약을 따른다.
- 내부 예외 메시지와 스택 트레이스는 API에 노출하지 않는다.

세부 기준은 backend/API.md와 SECURITY.md를 따른다.

### 7.1 OpenAPI 문서화

- Spring Boot 3.5.7 WebMVC의 OpenAPI 문서는 `springdoc-openapi-starter-webmvc-ui:2.8.17`로 자동 생성한다.
- 공통 metadata의 API 제목은 `Flow BI API`, 버전은 애플리케이션 빌드 버전을 사용한다.
- 기본 프로필에서는 OpenAPI JSON과 Swagger UI를 비활성화한다.
- `local`·`harness` 프로필에서만 `/v3/api-docs`와 `/swagger-ui.html`을 활성화하고 인증 없이 접근하도록 허용한다.
- OpenAPI JSON 형식과 공통 metadata, Swagger UI 진입점 및 기본 프로필 비노출 정책은 MockMvc 계약 테스트로 검증한다.

## 8. Redis와 외부 시스템

- Redis는 캐시, 짧은 수명의 상태, 분산 제어와 공용 Session Store에 사용한다.
- 영속 데이터의 유일한 기준 저장소로 사용하지 않는다.
- Redis 장애가 영속 데이터 손실로 이어지지 않아야 하며 Key, TTL과 무효화 정책을 명시한다.
- Spring Session 내부 Key와 직렬화 형식은 Repository가 소유하며 애플리케이션 코드가 직접 조회·수정·삭제하지 않는다.
- 외부 시스템 접근은 Service가 조정하고 Controller에 기술 세부사항을 노출하지 않는다.
- 외부 서비스의 구체적인 도입 방식은 Design Doc 또는 ADR에서 결정한다.

## 9. 테스트와 품질

- 구현과 버그 수정은 루트 `AGENTS.md`의 TDD 및 예외 규칙을 따른다.
- Domain, Service, API, Persistence Integration, Security, Concurrency 테스트 계층을 구분한다.
- 테스트는 구현 세부보다 사용자의 관찰 가능한 동작과 핵심 규칙을 검증한다.
- Controller 테스트만으로 도메인 규칙을 검증한 것으로 간주하지 않는다.
- Mock이 실제 권한·트랜잭션·쿼리 동작을 가리지 않도록 하고, PostgreSQL 고유 동작은 적용 가능한 통합 테스트로 검증한다.
- H2 기반 Spring 테스트는 빠른 보조 검증으로 사용하며 PostgreSQL 전용 Flyway Migration 이후 Schema는 JPA Mapping으로 격리 구성한다.
- Migration, PostgreSQL 제약, 영속·트랜잭션·동시성 계약은 전체 Migration과 기준 데이터가 적용된 PostgreSQL Testcontainers에서 검증한다.
- DB 통합 테스트 Fixture는 공유 기준 데이터를 삭제하거나 고정 ID와 빈 테이블을 가정하지 않고 테스트가 소유한 식별자만 조회·정리한다.
- 코드 스타일은 Spotless 규칙을 따른다.

## 10. 미결정 사항

- Migration 도구(Flyway/Liquibase)
- PostgreSQL 기반 통합 테스트 환경과 Testcontainers 도입 여부
- 세션 유휴·절대 만료 시간과 Cookie `SameSite` 값
- Redis 운영 가용성, 백업·복구와 Keyspace Event 구성
- 알림 채널과 Scheduler
- AI 모델, Vector Store, 문서 검색 방식
