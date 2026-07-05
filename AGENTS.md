# AGENTS.md

이 문서는 AI 코드 어시스턴트(Claude 등)가 이 프로젝트에서 코드를 작성/수정할 때 반드시 지켜야 할 규칙을 정의합니다. 사람 개발자도 동일한 컨벤션을 따릅니다.

---

## 1. 프로젝트 개요

- **서비스명**: AI 기반 그룹웨어 서비스
- **MVP1 범위**: 로그인/인증, 사용자 프로필·조직도 조회, 일정 관리, 회의실 예약
- **MVP2 범위(현재 미착수)**: AI 챗봇, AI 오케스트레이션, 대시보드 AI 요약, 관리자 CRUD
- **팀 구성**: 3인 (도메인별 담당자 배정, 아래 8번 참고)
- **개발 방법론**: Harness Engineering — 이 저장소의 `docs/` 문서를 근거로 AI가 작업하며, 임의로 요구사항을 추정하지 않고 문서에 없는 내용은 반드시 질문한다.

MVP1과 MVP2 경계를 넘는 작업(AI 챗봇 연동, 관리자 CRUD API 신설 등)은 **명시적 승인 없이 진행하지 않는다.**

---

## 2. 기술 스택 (변경 금지, 변경 시 ARCHITECTURE.md 및 본 문서 동시 수정)

### Frontend
| 구분 | 기술 |
|---|---|
| Framework | React + TypeScript |
| 상태 관리 | Zustand |
| 서버 상태 관리 | TanStack Query |
| Form 관리 | React Hook Form + Zod |
| Styling | Tailwind CSS |
| Package Manager | npm |
| Architecture | Feature 기반 Page 분리 구조 |

### Backend
| 구분 | 기술 |
|---|---|
| Language | Java |
| Framework | Spring Boot |
| Database | PostgreSQL |
| Cache | Redis (MVP1 미사용, 필요 시 도입) |
| Authentication | JWT (access + refresh, refresh token은 PostgreSQL `user_tokens`에 저장) |
| Architecture | Domain 기반 패키지 구조 |
| API 문서화 | springdoc-openapi (자동 생성) |

### 저장소 구조
모노레포. `frontend/`, `backend/` 두 최상위 디렉터리를 가진 단일 저장소.

---

## 3. 백엔드 도메인 구조 (고정, 임의로 도메인 추가/병합 금지)

```
backend/src/main/java/com/company/groupware/
├── auth/            # 로그인/로그아웃/토큰 재발급만 담당
├── user/            # 프로필 조회·수정, 조직도·팀 조회
├── schedule/        # 일정 CRUD, 캘린더 조회
├── meetingroom/     # 회의실 조회/예약/취소
└── common/          # Envelope 응답, 전역 예외 처리, JWT 필터, 공통 유틸
```

각 도메인 패키지 내부는 다음 하위 구조를 따른다:
```
{domain}/
├── controller/
├── service/
├── repository/
├── entity/
└── dto/
```

**도메인 간 참조 규칙**: `auth`와 `user`는 같은 `users` 테이블 계열을 다루지만 서로 다른 도메인이다. `auth` 도메인은 `user` 도메인의 엔티티를 직접 참조하지 않고, 필요 시 `user` 도메인이 제공하는 서비스 인터페이스를 통해서만 접근한다. (구체적 연동 방식은 ARCHITECTURE.md에서 확정)

**MVP1에 없는 것**: `roles`, `permissions`, `role_permissions`, `user_roles` 등 RBAC 관련 엔티티/API는 MVP1 스코프 밖이다. ERD 문서에는 참고용으로 남겨두되, 코드로 구현하지 않는다. 직원/팀 데이터는 관리자 CRUD API 없이 **DB 시딩(seed data)**으로만 존재한다.

---

## 4. 프론트엔드 구조 (feature 기반, 백엔드 도메인과 매핑)

```
frontend/src/features/
├── auth/         # 로그인 페이지
├── user/         # 마이페이지(실기능), 조직도(실기능 - 시딩 데이터 GET)
├── schedule/     # 캘린더(실기능), 대시보드(AI 요약 부분은 디자인만)
├── meetingroom/  # 회의실(실기능)
├── theme/        # 색상 테마 선택 (백엔드 연동 없음, localStorage/프론트 상태만)
└── admin/        # 관리 탭 (디자인만, 실제 CRUD 없음)
```

**"디자인만" 화면 작업 시 규칙**: 대시보드 AI 요약, 조직도 화면의 확장 기능(사람 클릭 시 채팅 연결), 관리 탭은 정적 UI만 구현하고 실제 API 연동 코드를 작성하지 않는다. 더미 데이터는 명확히 `mock` 폴더나 파일명으로 구분하여, 나중에 실 API로 교체할 지점을 표시한다.

---

## 5. API 설계 규칙

### 5.1 응답 포맷 (Envelope Pattern) — 모든 API 필수 적용

성공:
```json
{
  "success": true,
  "data": { },
  "message": "요청이 성공적으로 처리되었습니다."
}
```

실패:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "비밀번호가 일치하지 않습니다.",
    "details": "비밀번호는 최소 8자 이상이어야 합니다."
  }
}
```

이 포맷은 `common` 패키지의 공통 응답 래퍼(`ApiResponse<T>` 등)와 전역 예외 핸들러(`@ControllerAdvice`)를 통해 일관되게 적용한다. 개별 컨트롤러에서 임의의 응답 구조를 만들지 않는다.

### 5.2 Request Body 설계 원칙

- **식별자 참조**: 연관 엔티티는 전체 객체가 아닌 ID만 전달한다. (예: `"creator_id": 1`, 금지: `"creator": {...}`)
- **DTO는 테이블 구조를 그대로 따르지 않는다**: 여러 테이블에 걸친 정보를 하나의 요청으로 받아야 할 경우(예: 회원가입 시 `users` + `user_credentials`), 프론트엔드 관점에서 자연스러운 단일 DTO로 설계한다.
- **응답 DTO에는 민감 정보를 포함하지 않는다**: `password_hash`, `refresh_token` 원문 등은 어떤 응답에도 노출하지 않는다.

### 5.3 API 문서화

springdoc-openapi를 사용해 컨트롤러의 어노테이션 기반으로 API 문서를 자동 생성한다. 프론트엔드는 생성된 OpenAPI 스펙을 기준으로 타입을 맞춘다. 수동으로 타입을 중복 작성하지 않는다.

---

## 6. 네이밍 컨벤션

- DB 컬럼: physical name(snake_case, 영문) + logical name(한글 설명)을 ERD 문서에 병기하는 기존 관례를 유지한다.
- Java: 클래스는 PascalCase, 필드/메서드는 camelCase, DB 컬럼(snake_case)과의 매핑은 JPA `@Column(name=...)`으로 명시한다.
- TypeScript: 컴포넌트는 PascalCase, 함수/변수는 camelCase, API 응답 필드가 snake_case로 온다면 프론트 경계(예: API client 레이어)에서 camelCase로 변환 후 내부에서 사용한다.

---

## 7. 보안/신뢰성 관련 AI 작업 시 주의사항

- 비밀번호는 반드시 해시(BCrypt 등)로 저장하며, 평문 비교/로깅을 절대 하지 않는다.
- 회의실 예약 시 동일 `room_id`에 대해 시간대(`start_at`~`end_at`)가 겹치는 예약은 DB 제약 또는 서비스 레이어 검증으로 반드시 차단한다.
- JWT access token 만료시간, refresh token 로테이션 정책은 SECURITY.md를 따른다. (미정 시 임의로 값을 정하지 말고 질문할 것)
- 로그인 사용자만 API 접근 가능하도록 인증 필터를 모든 신규 엔드포인트에 기본 적용한다. (공개 엔드포인트는 명시적 화이트리스트로만 예외 처리)

---

## 8. 협업 및 리뷰 규칙 (3인 팀)

- **현재 단계**: 도메인별 담당자는 아직 정하지 않았다. 각자 전체 구조를 한 번씩 만들어보고 검증하는 실험 단계이며, 담당자 배정은 추후 확정한다. (배정 후에는 아래 규칙 적용)
- 담당자가 정해지면, AI가 생성한 코드는 **해당 도메인 담당자의 리뷰를 거친 뒤 머지**한다.
- 도메인 간 경계를 넘는 변경(예: `common` 패키지 수정, ARCHITECTURE.md 변경)은 담당자 1인이 아닌 팀 전체 합의를 거친다.
- AI에게 작업을 맡길 때는 `docs/exec-plans/active/`에 있는 해당 도메인의 실행 계획 문서를 먼저 참조하도록 지시한다.
- 문서(`docs/product-specs/`, ERD, API 설계)와 실제 코드가 어긋나는 것을 발견하면, 코드를 문서에 맞추기 전에 먼저 팀에 확인한다 — 문서가 오래된 것일 수도 있다.

---

## 9. 참고 문서

- `ARCHITECTURE.md` — 시스템 아키텍처, 레포 구조, Redis/API 계약 정책
- `docs/design-docs/` — 설계 철학 및 복합 구조(일정 M:N 매핑 등) 설명
- `docs/product-specs/` — 기능별 요구사항 명세
- `docs/generated/db-schema.md` — ERD 상세
- `SECURITY.md`, `RELIABILITY.md`, `FRONTEND.md` — 각 영역별 세부 규칙