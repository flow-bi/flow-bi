# 조직도 프롬프트 기록

- Source Plan: `docs/plans/active/organization.md`
- Purpose: active 계획 문서에서 분리한 Codex 프롬프트 원문 보존

---

## Codex 프롬프트 기록

### Prompt 1 - 작업 계획 작성

```txt
루트 AGENTS.md와 frontend/AGENTS.md를 읽고, frontend/docs 문서와 frontend/progress.md를 확인해줘.

이제 Phase 2 작업으로 조직도 화면을 시작할 거야.

먼저 frontend/docs/plans/_template.md를 기준으로 frontend/docs/plans/active/organization.md 작업 계획 파일을 만들어줘.

조직도 화면의 범위는 다음과 같아.

- /organization 라우트 연결
- 공통 Layout 안에서 화면 표시
- 부서/팀 구조 표시
- 직원 목록 표시
- 직원 검색
- 팀 또는 부서별 필터링
- 직원 클릭 시 상세 정보 패널 또는 모달 표시
- mock 데이터 기반 화면 구성
- Loading, Empty, Error 상태 고려
- 주요 사용자 상호작용 구현

제외 범위는 다음과 같아.

- 실제 직원 API 연동
- 조직 변경/수정 기능
- 권한별 조직도 노출 제어
- 실시간 상태 연동

중요한 기록 규칙은 다음과 같아.

- organization.md는 작업 계획 문서로만 사용해.
- 구현 완료 기록, 변경 내역, 확인 결과는 반드시 frontend/progress.md에 기록해.
- rooms.md, calendar.md, dashboard.md 같은 active 계획 문서에는 진행 기록을 추가하지 마.
- 작업 중 계획이 변경될 경우에만 organization.md를 수정하고, 실제 작업 결과는 progress.md에 남겨.

계획 파일을 만든 뒤, 바로 구현하지 말고 먼저 계획 내용을 보여줘.
```
