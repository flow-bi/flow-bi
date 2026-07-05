# ARCHITECTURE.md

이 문서는 그룹웨어 서비스 MVP1의 시스템 아키텍처를 정의한다. 코드 작성 전 반드시 이 문서를 기준으로 판단하며, 여기서 정하지 않은 사항은 임의로 결정하지 않고 질문한다.

---

## 1. 개요

- **레포 구조**: 모노레포 (`frontend/`, `backend/`)
- **아키텍처 스타일**: 백엔드 도메인 기반 계층형(Layered) 아키텍처, 프론트엔드 feature 기반 구조
- **인증 방식**: JWT (access + refresh)
- **API 계약 관리**: springdoc-openapi 자동 생성
- **캐시(Redis)**: MVP1 미사용

---

## 2. 저장소 구조

```
flow-bi/
├── AGENTS.md
├── ARCHITECTURE.md
├── docs/
│   ├── design-docs/
│   ├── exec-plans/
│   ├── generated/
│   │   └── db-schema.md
│   ├── product-specs/
│   └── references/
├── backend/
│   ├── src/main/java/com/company/groupware/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── schedule/
│   │   ├── meetingroom/
│   │   └── common/
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/seed/          # 직원/팀 시딩 데이터
│   └── src/test/java/...
└── frontend/
    ├── src/
    │   ├── features/
    │   │   ├── auth/
    │   │   ├── user/
    │   │   ├── schedule/
    │   │   ├── meetingroom/
    │   │   ├── theme/
    │   │   └── admin/
    │   ├── shared/         # 공통 컴포넌트, API client, 훅
    │   └── app/            # 라우팅, 전역 설정
    └── ...
```

---

## 3. 백엔드 아키텍처

### 3.1 계층 구조 (도메인별 공통)

```
Controller  →  Service  →  Repository  →  DB (PostgreSQL)
     ↓             ↓
    DTO         Entity
```

- **Controller**: 요청 검증(Bean Validation), DTO 변환, `common`의 `ApiResponse<T>` Envelope으로 응답 래핑만 담당. 비즈니스 로직 금지.
- **Service**: 실제 비즈니스 로직, 트랜잭션 경계(`@Transactional`). 도메인 규칙(예: 회의실 시간 중복 검증)은 여기에 위치.
- **Repository**: Spring Data JPA. 복잡한 조회는 QueryDSL 또는 `@Query`로 처리(세부 결정은 구현 중 팀 컨벤션으로 확정).
- **Entity**: ERD설계서의 테이블과 1:1 매핑.
- **DTO**: Request/Response 분리. Entity를 API 응답에 직접 노출하지 않는다.

### 3.2 도메인 경계와 의존성

```
auth  ──(참조)──▶  user
                     │
schedule ──(참조)──▶ user   (creator_id, schedule_targets.user_id)
                     │
meetingroom ──(참조)─▶ schedule  (room_reservations.schedule_id)
```

- `auth`는 로그인 시 `user` 도메인이 노출하는 조회 서비스(예: `UserQueryService.findByEmployeeNumber()`)를 통해 사용자 존재 여부만 확인한다. `auth`가 `user`의 Repository나 Entity를 직접 참조하지 않는다.
- `schedule`은 일정 생성자·공유 대상 검증을 위해 `user` 도메인의 조회 서비스를 사용한다.
- `meetingroom`은 예약 시 `schedule` 도메인에 일정을 자동 생성(FR-021)해야 하므로 `schedule` 도메인의 서비스를 호출한다. 역방향 의존(schedule → meetingroom)은 만들지 않는다.
- 도메인 간 호출은 항상 **서비스 레이어를 통해서만** 이루어지고, Repository/Entity를 다른 도메인 패키지에서 직접 import하지 않는다.

> 이 의존 방향은 순환 참조를 막기 위한 규칙이다. 새 기능 추가 시 이 방향을 거스르는 의존이 필요하다면, 먼저 이 문서를 갱신하고 팀 논의를 거친다.

### 3.3 공통(common) 패키지

- `ApiResponse<T>`: Envelope 응답 래퍼
- `GlobalExceptionHandler`: `@ControllerAdvice` 기반 예외 → 에러 코드 매핑
- `JwtAuthenticationFilter`: 모든 요청의 access token 검증 (화이트리스트 경로 제외)
- `ErrorCode`: 도메인별 에러 코드 enum (예: `AUTH_001`, `SCHEDULE_001`)

---

## 4. 인증/인가 흐름

1. 로그인 (`POST /api/v1/auth/login`): 사번+비밀번호 검증 → access token(단기) + refresh token(장기) 발급. refresh token은 `user_tokens` 테이블에 device 정보와 함께 저장(다중 기기 지원).
2. 이후 요청: `Authorization: Bearer {access_token}` 헤더로 인증. `JwtAuthenticationFilter`가 매 요청마다 검증.
3. Access token 만료 시: `POST /api/v1/auth/refresh`로 refresh token 검증 후 재발급(로테이션).
4. 로그아웃: 해당 device의 `user_tokens` 레코드 삭제. Access token 자체는 무효화하지 않고 만료시간에 의존한다(Redis 미사용이므로 블랙리스트 없음 — MVP1 한계로 SECURITY.md에 명시).

**미정 사항 (SECURITY.md에서 확정 필요)**: access token 만료시간, refresh token 만료시간 및 로테이션 정책.

---

## 5. 데이터베이스

- 상세 스키마는 `docs/generated/db-schema.md` (ERD설계서 원문 이관) 참고.
- MVP1에서 실제 사용하는 테이블: `users`, `user_credentials`, `user_tokens`, `teams`, `teams_closure`, `positions`, `schedules`, `schedules_details`, `schedule_targets`, `projects`, `projects_members`, `rooms`, `rooms_reservations`.
- **MVP1 미구현(스키마만 유지)**: `roles`, `permissions`, `role_permissions`, `user_roles` (RBAC, MVP2 이후 검토).
- 직원/팀/직급 데이터는 `backend/src/main/resources/db/seed/`의 시딩 스크립트로 초기 적재하며, 이를 등록/수정/삭제하는 관리자 API는 MVP1에 없다.

---

## 6. 캐시(Redis) 정책

- **MVP1: 사용하지 않는다.** Refresh token은 PostgreSQL에 저장되어 있어 Redis 없이도 다중 기기 로그인 관리가 가능하다.
- **도입 트리거(추후 판단 기준)**: 아래 상황 중 하나가 실제로 발생하면 그때 도입을 검토한다.
  - 로그아웃 즉시 access token 무효화가 필요해지는 경우 (블랙리스트)
  - 회의실 현황/조직도 등 조회가 잦은 데이터의 DB 부하가 실측으로 확인되는 경우 (캐싱)
- 도입 시에도 세션/refresh token 저장 용도로는 사용하지 않는다 (이미 PostgreSQL로 확정).

---

## 7. API 계약 관리

- 백엔드: springdoc-openapi로 컨트롤러 어노테이션 기반 OpenAPI 스펙 자동 생성 (`/v3/api-docs`, `/swagger-ui.html`).
- 프론트엔드: 생성된 스펙을 기준으로 타입을 동기화한다 (예: `openapi-typescript` 등 코드 생성 도구 사용 여부는 구현 단계에서 결정, 수동 타입 중복 작성 금지).
- 모든 신규 엔드포인트는 `@Operation`, `@ApiResponse` 등으로 문서화 어노테이션을 필수로 단다.

---

## 8. 미정 사항 (Open Items)

아래 항목은 아직 팀 논의가 필요하며, 임의로 정하지 않는다:

- **배포 환경/인프라**: 어디에 배포할지(클라우드, 온프레미스 등), CI/CD 파이프라인 여부 — 미정
- **테스트 전략**: 단위/통합 테스트 범위, 테스트 프레임워크(JUnit5는 기본이나 커버리지 목표 등은 미정)
- **환경 설정 관리**: `application.yml` 프로필 분리(local/dev/prod) 방식
- **도메인 담당자 배정**: 현재는 3인이 각자 실험적으로 전체 구조를 구현해보는 단계. 추후 확정.

이 항목들이 정해지면 이 문서와 `AGENTS.md`, `RELIABILITY.md`, `SECURITY.md`에 반영한다.