# Pull Request Title Rules

## 제목 형식

```text
[영역] - <이모지> <유형>: <작업명>
```

## 영역

- `FE`: Frontend 작업
- `BE`: Backend 작업
- `ALL`: Frontend와 Backend 공통 또는 프로젝트 전체 작업

## 유형

| 유형     | 제목 표기       |
| -------- | --------------- |
| 기능     | `✔ Feat:`       |
| 버그     | `🐞 Bug:`       |
| 리팩토링 | `💎 Refactor:`  |
| 문서     | `📚 Documents:` |

## 작성 규칙

- 제목은 가능하면 50자 이하로 작성한다.
- 브랜치명이 아니라 변경 결과를 작성한다.
- Issue 제목을 그대로 복사하지 않고 실제 변경 내용을 기준으로 작성한다.
- 요청형 표현과 마침표를 사용하지 않는다.

## 예시

```text
[FE] - ✔ Feat: 회의실 예약 화면 구현
[BE] - 🐞 Bug: 중복 예약 검증 오류 수정
[ALL] - 📚 Documents: create-issue Skill 구현
```
