# login.md

**대응 도메인**: `auth`
**대응 화면**: 화면/기능 설계서 1-1. 로그인
**관련 FR**: FR-009(로그인), FR-010(로그아웃)
**관련 NFR**: NFR-001(로그인 사용자만 서비스 이용), NFR-002(비밀번호 암호화 저장)

## 기능 요구사항

### 로그인 (FR-009)
- 사용자는 **아이디(사번)**와 **비밀번호**로 로그인한다.
- 비밀번호는 초기 기본값이 부여되지만, 사용자가 변경할 수 있어야 한다(화면 1-1 "비밀번호 변경" 항목).
- 로그인 성공 시 access token + refresh token 발급 (ARCHITECTURE.md 4번 인증 흐름 참고).

### 로그아웃 (FR-010)
- 사용자는 로그아웃할 수 있다.
- 로그아웃 시 해당 device의 refresh token(`user_tokens` 레코드)을 삭제한다.

## 화면 요소 (1-1. 로그인)

| 요소 | 설명 |
|---|---|
| 아이디 입력 | 사번 |
| 비밀번호 입력 | 기본값 존재, 변경 가능 |
| 비밀번호 변경 | 별도 플로우 필요 (아래 참고) |
| 로그인 버튼 | |

## 비밀번호 변경 플로우 (미정 세부사항)

화면설계서에는 "비밀번호 변경(기본값이 있지만, 변경 가능)"이라고만 되어 있어 다음이 명확하지 않다:

- 로그인 화면에서 바로 변경하는 것인지, 로그인 후 별도 화면(마이페이지 등)에서 변경하는 것인지
- 최초 로그인 시 비밀번호 변경을 강제하는지 여부

**가정(확인 필요)**: 최초 로그인 시 강제 변경은 요구사항에 없으므로 강제하지 않는다. 비밀번호 변경은 로그인 화면의 별도 진입점 또는 `auth` 도메인의 `PATCH /api/v1/auth/password` 형태로 구현하는 것을 제안한다.

## API 개요 (초안, API설계 문서 Envelope 패턴 적용)

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/v1/auth/login` | 사번+비밀번호 로그인, access/refresh token 발급 |
| POST | `/api/v1/auth/logout` | 현재 device의 refresh token 폐기 |
| POST | `/api/v1/auth/refresh` | access token 재발급 |
| PATCH | `/api/v1/auth/password` | 비밀번호 변경 (경로/설계는 가정, 확정 필요) |

## 비기능 요구사항 반영
- NFR-001: 위 로그인/로그아웃 관련 API를 제외한 모든 API는 `JwtAuthenticationFilter`로 보호한다 (ARCHITECTURE.md 3.3 참고).
- NFR-002: `user_credentials.password_hash`는 BCrypt 등으로 해시 저장, 평문 저장/로깅 금지 (AGENTS.md 7번 참고).