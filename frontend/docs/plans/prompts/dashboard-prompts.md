# 대시보드 프롬프트 기록

- Source Plan: `docs/plans/active/dashboard.md`
- Purpose: active 계획 문서에서 분리한 Codex 프롬프트 원문 보존

---

## Codex 프롬프트 기록

### Prompt 1 - 작업 계획 작성

```txt
루트 AGENTS.md와 frontend/AGENTS.md를 읽고, frontend/docs 문서와 frontend/progress.md를 확인해줘.

이제 대시보드 화면 작업을 시작할 거야.

먼저 frontend/docs/plans/_template.md를 기준으로 frontend/docs/plans/active/dashboard.md 작업 계획 파일을 만들어줘.

계획 파일에는 작업 목적, 범위, 필요한 데이터, 구현 단계, 완료 기준, Codex 프롬프트 기록 영역을 포함해줘.

아직 코드는 수정하지 말고, 계획 파일만 작성해줘.
backend는 수정하지 마.
```

### Prompt 2 - 대시보드 구현

```txt
dashboard.md 파일 조금 수정했어. 이제frontend/docs/plans/active/dashboard.md 계획을 기준으로 대시보드 화면을 구현해줘.  작업 범위는 frontend 내부로 제한하고 backend는 수정하지 마.

작업 후 다음을 기록해줘.
1. frontend/docs/plans/active/dashboard.md의 작업 결과 기록
2. frontend/progress.md의 현재 진행 상황 요약

사용한 프롬프트도 dashboard.md의 Codex 프롬프트 기록 섹션에 남겨줘.
```

### Prompt 3 - AI 업무 비서 상단 배치

```txt
대시보드의 AI 업무 비서 부분을 젤 위에 가로로 길게 배치하고 그 밑으로 지금처럼 오늘의 일정목록, 팀원 상태 넣어주는데
화면 구조는 유지하고, backend는 수정하지 마.

수정 후 변경 파일과 확인 방법을 frontend/docs/plans/active/dashboard.md에 기록하고,
frontend/progress.md에는 한 줄 요약만 남겨줘.
```

---
