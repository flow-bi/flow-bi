# BACKEND.md

## 1. 문서 상태

- 상태: Initial Draft
- 범위: Spring Boot 백엔드 구조와 구현 기준
- 미확정: Migration 도구, API 문서화 도구, PostgreSQL 기반 통합 테스트 환경

미확정 기술은 ADR 또는 승인된 Active Plan 없이 임의 선택하지 않는다.

## 2. 기술 기준선

| 구분 | 기술 |
| --- | --- |
| Language | Java |
| Java Version | 17 |
| Framework | Spring Boot 3.5.7 |
| Build | Gradle Groovy DSL |
| Production Database | PostgreSQL |
| Test Database | H2 In-memory, MySQL Compatibility Mode |
| Cache | Redis |
| Persistence | Spring Data JPA |
| Authentication | JWT |
| Authorization | RBAC |
| Architecture | 도메인 기반 계층형 구조 |
| Formatting | Spotless 7.0.4 + Eclipse Formatter |
| Unit Test | JUnit Platform via Spring Boot Starter Test |

### 2.1 초기 Build 설정 검토 상태

전달받은 초기 Gradle 설정은 다음 상태로 기록한다. 이 문서는 설정 파일을 직접 변경하지 않으며, 실제 변경은 별도의 승인된 구현 Task에서 수행한다.

- Spring Security 의존성은 초기 테스트 편의를 위해 의도적으로 주석 처리되어 있다. 인증 기능 구현 전에는 Security 활성화 시점과 테스트 지원 방식을 Active Plan에서 정한다.
- PostgreSQL은 실제 서비스의 기준 DB다.
- H2는 테스트 전용 In-memory DB이며 운영·개발 데이터 저장소로 사용하지 않는다.
- H2와 PostgreSQL의 SQL 및 제약 동작 차이가 있으므로 H2 테스트만으로 PostgreSQL 호환성을 보장했다고 판단하지 않는다.
- `spring-boot-starter-test` 외의 세부 Test Starter는 Spring Boot 3.5.7에서 실제 해석되는지 검증해야 한다.
- Spotless가 `config/eclipse-formatter.xml`을 참조하므로 해당 파일의 존재와 Formatter 규칙을 확인해야 한다.
- Gradle Wrapper 버전과 파일 존재 여부를 확인해야 한다.

### 2.2 H2 테스트 접속 정보

```text
URL: jdbc:h2:mem:flowbi;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
User: sa
Password: 없음
```

- H2 DB 이름은 `flowbi`다.
- `MODE=MySQL`은 MySQL 호환 동작을 일부 활성화하기 위한 테스트 설정이다.
- 실제 서비스 기준 DB는 PostgreSQL이므로 MySQL 호환 모드의 동작을 운영 스키마 기준으로 간주하지 않는다.
- `DB_CLOSE_DELAY=-1`은 JVM이 살아 있는 동안 In-memory DB를 유지한다.
- `DB_CLOSE_ON_EXIT=FALSE`는 JVM 종료 Hook에 의한 자동 종료를 비활성화한다.
- H2 Console을 사용하는 경우 개발·테스트 Profile에서만 활성화하며 운영에서는 활성화하지 않는다.

## 3. 시스템 책임

백엔드는 다음의 최종 책임을 가진다.

- 인증과 객체·기능 수준 인가
- 입력 검증과 비즈니스 규칙
- 직원·팀·역할·권한 관리
- 일정의 상태, 공개 범위와 참여 관계
- 회의실 예약과 중복 방지
- 트랜잭션과 데이터 정합성
- 알림 정책과 발송 상태
- 추후 AI 작업의 권한 검증과 실제 실행

## 4. 디렉터리 및 패키지 구조

```text
backend/src/
└── main/
    ├── java/com/flowbi/
    │   ├── global/
    │   │   ├── config/       # Security, DB, API 문서화 등 설정
    │   │   ├── common/       # 공통 코드와 상수
    │   │   ├── error/        # 전역 예외 처리와 오류 코드
    │   │   └── util/         # JWT, 날짜 등 범용 유틸리티
    │   └── domain/
    │       ├── auth/
    │       │   ├── controller/
    │       │   ├── service/
    │       │   └── dto/
    │       ├── user/
    │       │   ├── controller/
    │       │   ├── service/
    │       │   ├── repository/
    │       │   ├── entity/
    │       │   └── dto/
    │       ├── schedule/
    │       │   ├── controller/
    │       │   ├── service/
    │       │   ├── repository/
    │       │   ├── entity/
    │       │   └── dto/
    │       └── room/
    │           ├── controller/
    │           ├── service/
    │           ├── repository/
    │           ├── entity/
    │           └── dto/
    └── resources/
        ├── application.yml
        └── mapper/            # MyBatis 채택 시에만 사용
```

기본 Base Package는 `com.flowbi`다. 이후 Project, Notification, AI Assistant 등을 구현할 때 `domain/` 아래에 같은 계층 규칙으로 도메인 패키지를 추가한다.

## 5. 도메인 내부 계층

비즈니스 코드는 기술 계층보다 도메인을 먼저 기준으로 묶는다. 각 도메인은 필요한 계층만 다음 구조로 구성한다.

```text
domain/{domain-name}/
├── controller/      # HTTP Endpoint와 요청·응답 처리
├── service/         # Use Case, 비즈니스 규칙과 트랜잭션
├── repository/      # DB 접근
├── entity/          # JPA Entity와 도메인 상태
└── dto/             # Request와 Response DTO
```

원칙:

- Controller는 Service에 의존하며 Repository에 직접 접근하지 않는다.
- Service는 Use Case, 비즈니스 규칙과 트랜잭션을 담당한다.
- Repository는 영속성 접근을 담당하며 Controller에서 직접 사용하지 않는다.
- Entity를 API Request 또는 Response로 직접 노출하지 않는다.
- DTO는 도메인별 `dto/`에 두고 Request와 Response의 목적이 이름에 드러나야 한다.
- 한 도메인의 Service가 다른 도메인의 Repository를 직접 사용하는 것을 피하고 해당 도메인의 Service를 통해 협력한다.
- 작은 도메인에 사용하지 않는 계층이나 빈 패키지를 미리 만들지 않는다.

의존 방향은 다음과 같다.

```text
controller → service → repository → database
                 ↓
               entity
```

역방향 의존과 순환 의존은 허용하지 않는다.

## 6. Global 영역

`global/`은 특정 도메인에 속하지 않는 기술 공통 기능만 둔다.

- `config/`: Security, DB, CORS 및 API 문서화 설정
- `common/`: 여러 도메인이 공유하는 공통 코드와 상수
- `error/`: Global Exception Handler, 공통 오류 응답과 Error Code
- `util/`: 상태를 갖지 않는 범용 기술 유틸리티

`global/`에 비즈니스 규칙, 특정 도메인의 DTO, Entity 또는 Repository를 두어서는 안 된다. `JwtProvider`는 인증 기술 지원 코드로 `global/util/`에 둘 수 있지만 로그인 Use Case와 권한 규칙은 `domain/auth/service/`가 소유한다.

## 7. 핵심 도메인 규칙

### Identity & Authorization

- 사번은 로그인 식별자다.
- 사용자와 자격정보는 1:1 기준선이다.
- 한 사용자는 여러 역할과 여러 Refresh Token을 가질 수 있다. (todo:?)
- 직급과 시스템 역할은 분리한다.
- 관리자 작업은 명시적인 Permission을 요구한다.

### Organization

- 사용자는 기준선상 하나의 팀과 하나의 직급을 가진다.
- 팀은 상위 팀을 가질 수 있고 Closure Table로 계층을 표현한다.
- 재직 상태와 업무 상태는 서로 다른 개념이나 현재 ERD 반영 여부는 추후 검토한다.
- 직원과 팀의 삭제 요청은 비활성화로 처리하고 기존 참조 관계를 보존한다.

### Schedule

- 일정 작성자는 한 명이다.
- 일정 유형은 `PERSONAL`, `TEAM`, `PROJECT` 중 정확히 하나다.
- 일정은 여러 참석자와 연결될 수 있다.
- 팀 일정은 여러 팀, 프로젝트 일정은 여러 프로젝트와 연결될 수 있다.
- 개인 일정은 작성자와 참석자에게 공개한다.
- 팀 일정은 연결된 팀 소속 사용자와 참석자에게 공개한다.
- 프로젝트 일정은 연결된 프로젝트 참여자와 참석자에게 공개한다.
- 팀 일정에 프로젝트 대상을, 프로젝트 일정에 팀 대상을 연결하지 않는다.
- 시작 시각은 종료 시각보다 앞서야 한다.
- 시간 구간은 `[start, end)`를 기본으로 한다.
- 일정 삭제는 취소 상태 또는 Soft Delete로 처리하며 일반 기능에서 물리 삭제하지 않는다.

### Room Reservation

- 예약은 회의실과 일정에 연결된다.
- 취소되지 않은 동일 회의실 예약의 시간이 겹쳐서는 안 된다.
- 일정과 예약 변경은 정합성을 유지해야 한다.
- 예약 삭제는 취소 상태 또는 Soft Delete로 처리하며 기존 이력을 보존한다.
- 중복 예약의 최종 구현 방식은 현재 ERD 검토 후 확정한다.

### Notification

- 사용자별 사용 여부, 사전 알림 시간과 종류를 존중한다.
- 알림 전달 인프라는 미확정이며 도메인이 특정 공급자에 결합하지 않는다.

### AI Assistant

- 추후 기능이며 현재 실제 모델·검색 연동을 구현하지 않는다.
- AI는 인증된 Application Use Case를 통해서만 조회와 변경을 수행한다.
- 상태 변경은 사용자 확인과 감사 기록이 필요하다.

## 8. 영속성

- PostgreSQL을 기준 저장소로 사용한다.
- DB Schema 기준선은 `DB_SCHEMA.md`에 기록한다.
- Repository는 DB 접근을 캡슐화하며 Controller에 직접 노출하지 않는다.
- 목록 조회는 N+1, 무제한 조회와 불필요한 대형 컬럼 로딩을 피한다.
- DB 제약과 Application 검증을 상호 보완적으로 사용한다.
- 현재 ERD의 타입과 관계 개선은 Baseline 리뷰 전 구현하지 않는다.

초기 영속성 기술은 Spring Data JPA로 확정한다. `entity/`와 Repository를 기준으로 구성한다. `resources/mapper/`는 현재 생성하지 않으며, MyBatis 도입은 ADR과 사람의 승인이 있을 때만 허용한다. 승인 없이 JPA와 MyBatis를 혼합하지 않는다.

## 9. Redis

Redis 사용 후보:

- Refresh Token 또는 세션 보조 상태
- 단기 캐시
- 요청 제한
- 분산 환경의 예약·알림 보조 제어

사용 원칙:

- Redis 장애가 영속 데이터의 손실로 이어지지 않아야 한다.
- Key 형식, TTL, 무효화와 개인정보 포함 여부를 문서화한다.
- DB와 Cache의 정합성 전략 없이 Write-through 구조를 도입하지 않는다.

구체적인 Redis 역할은 기능 Design Doc에서 확정한다.

## 10. 트랜잭션과 동시성

- 변경 Use Case는 Service 계층에서 트랜잭션 경계를 가진다.
- 외부 시스템 호출을 긴 DB 트랜잭션 안에서 수행하지 않는다.
- 일정과 예약처럼 원자성이 필요한 변경의 소유권을 명확히 한다.
- 중복 예약은 동시 요청에서도 보장되어야 한다.
- Lock 또는 DB Constraint 선택은 측정과 ADR을 근거로 한다.
- 충돌은 클라이언트가 처리할 수 있는 명시적 오류로 반환한다.

## 11. 인증 흐름 기준

1. 사용자가 사번과 비밀번호를 제출한다.
2. 서버가 자격정보와 계정 상태를 검증한다.
3. Access Token과 Refresh Token을 발급한다.
4. 보호 API는 Access Token으로 사용자를 식별한다.
5. 갱신 시 Refresh Token의 유효성·만료·폐기 여부를 검증한다.
6. 로그아웃 시 대상 Refresh Token을 무효화한다.

Token 전달·저장, 만료 시간과 회전 방식은 인증 Design Doc에서 확정한다.

## 12. 오류 모델

오류 범주:

- 입력 검증 실패
- 미인증
- 권한 부족
- 리소스 없음
- 상태 또는 시간 충돌
- 요청 제한
- 외부 시스템 장애
- 내부 서버 오류

각 오류는 안정적인 Error Code를 가져야 한다. 내부 예외 메시지와 Stack Trace는 API에 노출하지 않는다.

## 13. 관측성과 감사

- 요청 추적을 위한 Correlation ID 도입을 검토한다.
- 인증·권한·관리·일정·예약의 중요 변경을 감사 가능하게 기록한다.
- 로그에 비밀번호, Token, Authorization Header와 과도한 개인정보를 남기지 않는다.
- 로그 포맷과 수집 플랫폼은 배포 환경 결정 후 확정한다.

## 14. 테스트 전략

- Domain Test: 상태와 핵심 규칙
- Service Test: Use Case, 권한과 트랜잭션 조정
- API Test: HTTP 계약, 검증과 오류
- Persistence Integration Test: Mapping, Query, Constraint
- Security Test: 미인증, 권한 거부, IDOR
- Concurrency Test: 회의실 중복 예약 등 경쟁 조건

구체적인 Test Framework와 Container 사용 여부는 미확정이다. 선택 전에도 TDD와 테스트 계층의 책임은 유지한다.

## 15. 미결정 사항

- Flyway 또는 Liquibase 등 Migration 도구
- PostgreSQL 기반 Integration Test 환경과 Testcontainers 도입 여부
- Spring REST Docs 또는 Springdoc OpenAPI
- JWT Token 전달·저장·회전 정책
- Redis의 초기 적용 범위
- 알림 채널과 Scheduler
- AI 모델, Vector Store와 문서 검색 방식
- 배포·관측 환경
