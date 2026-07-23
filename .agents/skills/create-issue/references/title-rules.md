# Issue Title Rules

## 제목 형식

```text
[영역] - <이모지> <유형>: <작업명>
```

예시:

```text
[FE] - ✔ Feat: 일정 등록 화면 구현
[BE] - 🐞 Bug: 예약 시간 검증 오류 수정
[ALL] - 📚 Documents: 하네스 엔지니어링 구축
```

## 영역

- `FE`: Frontend 작업
- `BE`: Backend 작업
- `ALL`: Frontend와 Backend 공통 작업 또는 프로젝트 전체 작업

다음 경로와 작업은 일반적으로 `ALL`로 분류한다.

- `docs/**` 공통 문서
- `.agents/**`
- `.github/**`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `CONVENTIONS.md`
- Harness 및 협업 규칙

Frontend 또는 Backend 전용 문서는 각각 `FE`, `BE`를 사용한다.

## 작업 유형

| 유형     | 제목 표기       |
| -------- | --------------- |
| 기능     | `✔ Feat:`       |
| 버그     | `🐞 Bug:`       |
| 리팩토링 | `💎 Refactor:`  |
| 문서     | `📚 Documents:` |

## 작성 규칙

- 제목은 가능하면 50자 이하로 작성한다.
- 작업 대상과 결과가 드러나도록 작성한다.
- 요청형 또는 명령형 표현을 사용하지 않는다.
- 제목 끝에 마침표를 붙이지 않는다.
- 실제 작업 범위와 일치하는 영역을 선택한다.
- Issue 템플릿과 일치하는 작업 유형을 사용한다.

## 예시

```text
[FE] - ✔ Feat: 회의실 예약 화면 구현
[BE] - ✔ Feat: 회의실 예약 API 구현
[ALL] - ✔ Feat: 회의실 예약 및 일정 등록 연동

[FE] - 🐞 Bug: 일정 날짜 선택 오류 수정
[BE] - 🐞 Bug: 중복 예약 허용 오류 수정

[FE] - 💎 Refactor: 예약 폼 상태 관리 분리
[BE] - 💎 Refactor: ScheduleService 책임 분리

[FE] - 📚 Documents: 프론트엔드 상태 관리 규칙 작성
[BE] - 📚 Documents: 일정 API 명세 작성
[ALL] - 📚 Documents: 하네스 엔지니어링 구축
```
