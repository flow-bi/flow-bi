# DECISIONS.md

## 목적

이 문서는 프로젝트 진행 중 발생한 주요 기술적, 구조적, 제품적 결정을 기록한다.

단순 작업 내역은 `progress.md`에 기록하고, 왜 그렇게 결정했는지 남겨야 하는 내용은 이 문서에 기록한다.

---

## 기록 기준

다음에 해당하는 내용은 이 문서에 기록한다.

- 폴더 구조 변경
- 상태 관리 방식 결정
- 라우팅 구조 결정
- API 응답 구조에 대한 프론트 기준 결정
- mock 데이터 운영 방식 결정
- UI 라이브러리 선택
- 캘린더 라이브러리 선택
- 날짜 처리 라이브러리 선택
- 테마 구조 결정
- 권한 처리 방식 결정
- 기존 방식에서 다른 방식으로 변경한 이유
- 팀 내 합의가 필요한 결정

---

## 기록 형식

```md
## YYYY-MM-DD - 결정 제목

### Context

어떤 상황에서 결정이 필요했는지 작성한다.

### Decision

무엇을 결정했는지 작성한다.

### Reason

왜 그렇게 결정했는지 작성한다.

### Alternatives

검토했지만 선택하지 않은 대안을 작성한다.

### Impact

이 결정이 코드, 문서, 작업 방식에 어떤 영향을 주는지 작성한다.

### Related Files

- 관련 파일 경로
```

---

## 2026-07-08 - 프론트엔드 작업 문서 역할 분리

### Context

`docs/plans/active/*.md` 문서에 작업 계획, Codex 프롬프트, 구현 결과, 확인 방법, 회고가 함께 누적되면서 문서의 목적이 불분명해졌다. active 계획 문서는 앞으로 진행할 작업 범위와 완료 기준을 확인하는 용도여야 하지만, 실제로는 진행 로그와 프롬프트 아카이브 역할까지 겸하고 있었다.

### Decision

프론트엔드 작업 문서를 역할별로 분리한다.

- `docs/plans/active/*.md`: 화면별 작업 계획, 범위, 제외 범위, 필요한 데이터, 구현 단계, 완료 기준
- `docs/plans/prompts/*-prompts.md`: 화면별 Codex 프롬프트 원문 보존
- `progress.md`: 실제 구현 결과, 변경 파일, 확인 방법, 날짜별 진행 로그
- `DECISIONS.md`: 문서 구조, 기록 방식, 아키텍처 등 의사결정 배경

### Reason

계획 문서가 실행 로그까지 포함하면 다음 작업자가 현재 남은 범위와 완료 기준을 빠르게 파악하기 어렵다. 프롬프트 원문은 보존 가치가 있지만 구현 결과와 섞이면 progress 문서가 불필요하게 길어지고, active 계획 문서도 변경 이력 중심으로 흐려진다. 문서 역할을 분리하면 계획, 실행 결과, 의사결정, 프롬프트 기록을 각각 다른 목적으로 읽을 수 있다.

### Alternatives

- active 계획 문서에 모든 기록을 계속 누적한다.
- 프롬프트 원문을 버리고 결과만 progress에 남긴다.
- 화면별 completed 문서를 만들어 모든 기록을 이동한다.

### Impact

앞으로 active 계획 문서에는 구현 완료 로그를 추가하지 않는다. 기능 구현이 끝나면 `progress.md`에 결과와 확인 방법을 기록하고, 프롬프트 보존이 필요한 경우 `docs/plans/prompts/` 하위 문서에 추가한다. 구조적 결정은 `DECISIONS.md`에 남긴다.

### Related Files

- `frontend/docs/plans/active/dashboard.md`
- `frontend/docs/plans/active/rooms.md`
- `frontend/docs/plans/active/calendar.md`
- `frontend/docs/plans/active/organization.md`
- `frontend/docs/plans/prompts/`
- `frontend/progress.md`
- `frontend/docs/DECISIONS.md`

---

## 2026-07-08 - Codex 프롬프트 기록 분리

### Context

화면별 active 계획 문서에 Codex 프롬프트 원문이 누적되어 있었다. 프롬프트는 작업 재현과 의도 확인에 유용하지만, 작업 계획 문서의 본문에 함께 있으면 계획과 실행 이력이 섞이고 문서 길이가 빠르게 늘어난다.

### Decision

Codex 프롬프트 원문은 `docs/plans/prompts/` 하위의 화면별 문서로 분리한다.

- `dashboard.md`의 프롬프트는 `docs/plans/prompts/dashboard-prompts.md`로 이동한다.
- `rooms.md`의 프롬프트는 `docs/plans/prompts/rooms-prompts.md`로 이동한다.
- `calendar.md`의 프롬프트는 `docs/plans/prompts/calendar-prompts.md`로 이동한다.
- `organization.md`의 프롬프트는 `docs/plans/prompts/organization-prompts.md`로 이동한다.

### Reason

프롬프트 원문은 가능한 그대로 보존해야 하지만, 진행 결과나 완료 기준과는 읽는 목적이 다르다. 별도 prompts 문서로 분리하면 프롬프트를 찾기 쉽고, active 계획 문서는 계획 문서로 유지할 수 있다. 또한 `progress.md`에는 프롬프트 원문 없이 구현 결과와 확인 방법만 남길 수 있다.

### Alternatives

- 프롬프트 원문을 active 계획 문서 하단에 계속 보존한다.
- 프롬프트를 `progress.md` 날짜별 로그에 함께 남긴다.
- 프롬프트 원문을 삭제하고 요약만 남긴다.

### Impact

프롬프트 기록을 추가해야 하는 경우 화면별 `*-prompts.md`에 추가한다. `progress.md`에는 프롬프트 원문을 남기지 않고, 실행 결과와 검증 내용만 기록한다. active 계획 문서는 계획 변경이 있을 때만 수정한다.

### Related Files

- `frontend/docs/plans/prompts/dashboard-prompts.md`
- `frontend/docs/plans/prompts/rooms-prompts.md`
- `frontend/docs/plans/prompts/calendar-prompts.md`
- `frontend/docs/plans/prompts/organization-prompts.md`
- `frontend/docs/plans/active/dashboard.md`
- `frontend/docs/plans/active/rooms.md`
- `frontend/docs/plans/active/calendar.md`
- `frontend/docs/plans/active/organization.md`
- `frontend/progress.md`
