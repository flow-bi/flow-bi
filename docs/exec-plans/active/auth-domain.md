# exec-plans/active/auth-domain.md

**상태**: MVP1 범위 구현 완료 (비밀번호 변경은 MVP2 이월)
**담당자**: 미배정 (개인 실험 단계, AGENTS.md 8번 참고)
**근거 문서**: `product-specs/login.md`, `ARCHITECTURE.md` 4번(인증 흐름)

---

## 범위

로그인, 로그아웃, access token 재발급. `user` 도메인의 프로필/조직도는 포함하지 않는다(별도 `user-domain.md`).

> 2026-07-05 확인: 비밀번호 변경은 이번 auth 작업에서 제외하고 MVP2 다음 작업으로 이월한다. 비밀번호 규칙은 최소 8자 이상으로 확정한다.

## 선행 확인 필요 (착수 전 확정할 것)

- [x] Access token / refresh token 만료시간 값 (`SECURITY.md` 2번에서 확정: access 30분, refresh 14일)
- [x] 비밀번호 변경 플로우 위치 (MVP2 다음 작업으로 이월)

## 백엔드 체크리스트

### DB / Entity
- [x] `user_credentials`, `user_tokens` 마이그레이션 작성 (`db-schema.md` 기준)
- [x] `user_credentials.user_id`에 UNIQUE 제약 반영 확인
- [x] `UserCredential`, `UserToken` 엔티티 작성

### Repository
- [x] `UserCredentialRepository`
- [x] `UserTokenRepository` (device별 조회, 사용자별 전체 삭제 메서드 포함)

### Service
- [x] 로그인: 사번으로 `user` 도메인 조회 서비스 호출 → 비밀번호 해시 검증 → access/refresh 토큰 발급 → `user_tokens` 저장(device_info 포함)
- [x] 로그아웃: 현재 device의 `user_tokens` 레코드 삭제
- [x] 토큰 재발급: refresh token 검증 → 로테이션(재발급 후 기존 레코드 갱신)
- [ ] 비밀번호 변경 (플로우 확정 후 구현)

### Controller / DTO
- [x] `POST /api/v1/auth/login`
- [x] `POST /api/v1/auth/logout`
- [x] `POST /api/v1/auth/refresh`
- [ ] `PATCH /api/v1/auth/password` (확정 후)
- [x] 모든 응답 Envelope 패턴 적용 확인 (API설계 문서, AGENTS.md 5.1)

### 공통(common) 연동
- [x] `JwtAuthenticationFilter` 구현 및 로그인/로그아웃/refresh 엔드포인트 화이트리스트 등록
- [x] `GlobalExceptionHandler`에 인증 관련 `ErrorCode` 추가 (예: `AUTH_001` 비밀번호 불일치)

## 프론트엔드 체크리스트

- [x] `features/auth/` — 로그인 페이지 (아이디/비밀번호 입력, 비밀번호 변경 진입점은 MVP2 이월)
- [x] TanStack Query로 로그인 mutation, 성공 시 토큰 저장(스토리지 방식은 localStorage로 구현)
- [x] Zustand로 인증 상태(로그인 여부) 전역 관리
- [x] Axios(또는 fetch) 인터셉터에 access token 자동 첨부 + 401 시 refresh 시도 로직

## 테스트 (전략 확정 전 임시 항목)
- [x] 로그인 성공/실패(잘못된 비밀번호) 케이스
- [x] 로그아웃 후 refresh 시도 시 실패 확인
- [x] 다중 기기 로그인 시 각 device별 refresh token이 독립적으로 동작하는지 확인
