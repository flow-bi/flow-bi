# exec-plans/active/user-domain.md

**상태**: 미착수
**담당자**: 미배정
**근거 문서**: `product-specs/user-profile.md`, `product-specs/org-chart.md`

---

## 범위

본인 프로필 조회/수정(마이페이지), 조직도·팀 조회. 관리자용 직원/팀 CRUD는 포함하지 않는다(`admin.md`, MVP1 미구현).

## 선행 확인 필요

- [ ] `users.status` enum 값 확정 (가정: `WORKING`/`ON_LEAVE`/`BUSINESS_TRIP`) — `user-profile.md` 참고

## 백엔드 체크리스트

### DB / Entity / Seed
- [ ] `users`, `teams`, `teams_closure`, `positions` 마이그레이션 작성
- [ ] 시딩 스크립트 작성 (`backend/src/main/resources/db/seed/`) — 가상 A기업 약 100명 규모, 팀 계층 포함
- [ ] `User`, `Team`, `Position` 엔티티 작성 (`teams_closure`는 조회 전용 쿼리로 다룰지, 엔티티로 매핑할지 구현 시 결정)

### Repository
- [ ] `UserRepository` — 사번으로 조회(로그인용), ID로 조회, 팀별 목록 조회
- [ ] `TeamRepository`, `TeamClosureRepository` — 계층 트리 조회, 특정 팀의 하위 조직 전체 조회

### Service
- [ ] `UserQueryService` — 다른 도메인(`auth`, `schedule`, `meetingroom`)이 참조할 조회 전용 서비스 인터페이스 (ARCHITECTURE.md 3.2 도메인 경계 규칙 준수)
- [ ] 본인 프로필 조회/수정 서비스 (이메일/전화번호/활성상태만 수정 가능)
- [ ] 조직도 트리 조회 서비스 (`teams_closure` 활용)

### Controller / DTO
- [ ] `GET /api/v1/users/me`
- [ ] `PATCH /api/v1/users/me`
- [ ] `GET /api/v1/users/{userId}`
- [ ] `GET /api/v1/teams/tree`
- [ ] `GET /api/v1/teams/{teamId}/members`

## 프론트엔드 체크리스트

- [ ] `features/user/mypage/` — 마이페이지 화면 (조회 + 이메일/전화번호/활성상태 수정 폼, React Hook Form + Zod 검증)
- [ ] `features/user/org-chart/` — 조직도 트리 UI, 직원 상세 정보 표시
- [ ] 프로필 사진은 항상 기본 이미지로 렌더링 (변경 UI 없음, `user-profile.md` 확정 사항)

## 테스트 (임시 항목)
- [ ] 본인이 아닌 다른 사용자의 프로필을 수정하려 할 때 거부되는지
- [ ] 조직도 트리가 시딩된 계층 구조와 일치하는지