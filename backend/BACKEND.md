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
| Cache | Redis |
| Persistence | Spring Data JPA |
| Authentication | JWT |
| Authorization | RBAC |
| Formatting | Spotless 7.0.4 + Eclipse Formatter |
| Test | JUnit via Spring Boot Starter Test |

미확정 기술은 ADR 또는 승인된 Active Plan 없이 임의로 도입하지 않는다.

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

## 6. 데이터와 트랜잭션

- PostgreSQL을 기준 저장소로 사용한다.
- 스키마 변경은 마이그레이션과 문서 갱신을 함께 수행한다.
- 강한 정합성이 필요한 작업은 하나의 트랜잭션 경계로 처리한다.
- 데이터 삭제·비활성화 방식은 관련 Product Spec과 Design Doc을 따른다.
- DB 제약과 애플리케이션 검증을 함께 사용한다.

## 7. API·인증·보안

- 클라이언트와 서버는 HTTPS 기반 JSON API로 통신한다.
- 요청 입력은 서버 경계에서 다시 검증한다.
- 인증이 필요한 API는 사용자 신원과 권한을 검사한다.
- 비밀번호는 복호화 가능한 형태로 저장하지 않는다.
- Access Token과 Refresh Token은 별도로 관리한다.
- 내부 예외 메시지와 스택 트레이스는 API에 노출하지 않는다.

세부 기준은 backend/API.md와 SECURITY.md를 따른다.

## 8. Redis와 외부 시스템

- Redis는 캐시, 짧은 수명의 상태, 분산 제어에만 사용한다.
- 영속 데이터의 유일한 기준 저장소로 사용하지 않는다.
- 외부 시스템 접근은 Service가 조정하고 Controller에 기술 세부사항을 노출하지 않는다.
- 외부 서비스의 구체적인 도입 방식은 Design Doc 또는 ADR에서 결정한다.

## 9. 테스트와 품질

- 구현과 버그 수정은 루트 `AGENTS.md`의 TDD 및 예외 규칙을 따른다.
- Domain, Service, API, Persistence Integration, Security, Concurrency 테스트 계층을 구분한다.
- 테스트는 구현 세부보다 사용자의 관찰 가능한 동작과 핵심 규칙을 검증한다.
- 코드 스타일은 Spotless 규칙을 따른다.

## 10. 미결정 사항

- Migration 도구(Flyway/Liquibase)
- PostgreSQL 기반 통합 테스트 환경과 Testcontainers 도입 여부
- OpenAPI 문서화 방식
- JWT 전달·저장·회전 정책
- Redis 초기 적용 범위
- 알림 채널과 Scheduler
- AI 모델, Vector Store, 문서 검색 방식
