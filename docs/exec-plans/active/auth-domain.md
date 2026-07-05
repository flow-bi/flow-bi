# exec-plans/active/auth-domain.md

**상태**: 미착수
**담당자**: 미배정 (개인 실험 단계, AGENTS.md 8번 참고)
**근거 문서**: `product-specs/login.md`, `ARCHITECTURE.md` 4번(인증 흐름)

---

## 범위

로그인, 로그아웃, access token 재발급. `user` 도메인의 프로필/조직도는 포함하지 않는다(별도 `user-domain.md`).

## 선행 확인 필요 (착수 전 확정할 것)

- [ ] Access token / refresh token 만료시간 값 (`SECURITY.md` 작성과 연결, 아직 미정)
- [ ] 비밀번호 변경 플로우 위치 (로그인 화면 vs 별도 화면) — `login.md` 미해결 이슈 참고

## 백엔드 체크리스트

### DB / Entity
- [ ] `user_credentials`, `user_tokens` 마이그레이션 작성 (`db-schema.md` 기준)
- [ ] `user_credentials.user_id`에 UNIQUE 제약 반영 확인
- [ ] `UserCredential`, `UserToken` 엔티티 작성

### Repository
- [ ] `UserCredentialRepository`
- [ ] `UserTokenRepository` (device별 조회, 사용자별 전체 삭제 메서드 포함)

### Service
- [ ] 로그인: 사번으로 `user` 도메인 조회 서비스 호출 → 비밀번호 해시 검증 → access/refresh 토큰 발급 → `user_tokens` 저장(device_info 포함)
- [ ] 로그아웃: 현재 device의 `user_tokens` 레코드 삭제
- [ ] 토큰 재발급: refresh token 검증 → 로테이션(재발급 후 기존 레코드 갱신)
- [ ] 비밀번호 변경 (플로우 확정 후 구현)

### Controller / DTO
- [ ] `POST /api/v1/auth/login`
- [ ] `POST /api/v1/auth/logout`
- [ ] `POST /api/v1/auth/refresh`
- [ ] `PATCH /api/v1/auth/password` (확정 후)
- [ ] 모든 응답 Envelope 패턴 적용 확인 (API설계 문서, AGENTS.md 5.1)

### 공통(common) 연동
- [ ] `JwtAuthenticationFilter` 구현 및 로그인/로그아웃/refresh 엔드포인트 화이트리스트 등록
- [ ] `GlobalExceptionHandler`에 인증 관련 `ErrorCode` 추가 (예: `AUTH_001` 비밀번호 불일치)

## 프론트엔드 체크리스트

- [ ] `features/auth/` — 로그인 페이지 (아이디/비밀번호 입력, 비밀번호 변경 진입점)
- [ ] TanStack Query로 로그인 mutation, 성공 시 토큰 저장(스토리지 방식은 FRONTEND.md에서 정의 예정)
- [ ] Zustand로 인증 상태(로그인 여부) 전역 관리
- [ ] Axios(또는 fetch) 인터셉터에 access token 자동 첨부 + 401 시 refresh 시도 로직

## 테스트 (전략 확정 전 임시 항목)
- [ ] 로그인 성공/실패(잘못된 비밀번호) 케이스
- [ ] 로그아웃 후 refresh 시도 시 실패 확인
- [ ] 다중 기기 로그인 시 각 device별 refresh token이 독립적으로 동작하는지 확인