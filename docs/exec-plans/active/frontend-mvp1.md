# exec-plans/active/frontend-mvp1.md

**상태**: 미착수
**담당자**: 미배정
**근거 문서**: `product-specs/header.md`, `product-specs/theme.md`, `product-specs/admin.md`, 각 도메인 product-specs

---

## 범위

특정 도메인에 속하지 않는 공통 프론트엔드 작업과, "디자인만" 화면들. 각 도메인의 실기능 화면은 해당 도메인 실행 계획(`auth-domain.md` 등)의 프론트엔드 체크리스트를 따른다.

## 체크리스트

### 공통 레이아웃
- [ ] `app/` — 라우팅 설정, 인증 가드(비로그인 시 로그인 페이지로 리다이렉트)
- [ ] `shared/` — 공통 API client(Envelope 응답 파싱, 401 시 refresh 처리), 공통 컴포넌트(모달, 배너 등)
- [ ] 헤더 — 기업명(정적), 본인 이름(`user` 도메인 연동), 검색창(UI만, 비활성화 — `header.md`)

### 테마 (`features/theme/`)
- [ ] 2개 색상 테마 정의 (`#EDF1F6`, `#5541A4`) — Tailwind CSS 변수 방식
- [ ] Zustand 상태 + `localStorage` 연동 (백엔드 저장 없음, `theme.md` 확정 사항)

### 관리 탭 (`features/admin/`, 디자인만)
- [ ] 직원관리/팀관리 화면 UI 구현
- [ ] 목록은 `user` 도메인의 실제 GET API(시딩 데이터)를 조회 전용으로 재사용 (선택 사항, `admin.md` 참고)
- [ ] 수정/삭제 버튼은 클릭해도 동작하지 않음 (목업 상태로 명확히 표시)

### springdoc-openapi 연동
- [ ] 백엔드 OpenAPI 스펙 생성 확인 후, 프론트에서 타입 동기화 방식 결정 및 적용 (수동 타입 작성 금지, AGENTS.md 5.3 참고)

## 남은 미해결 이슈 (착수 전 확인 권장)
- [ ] 알림 설정(FR-026~028) 화면이 MVP1 스코프에 없는데, 정말 제외인지 최종 확인 (`product-specs/index.md` 참고)