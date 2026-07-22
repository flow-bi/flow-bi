---
name: create-issue
description: >-
  $create-issue, Issue 생성, GitHub Issue 초안 작성 요청에 사용한다.
  사용자 요청, 관련 Plan, 관련 문서, 저장소의 Issue Template을 확인해 Issue 제목과 본문 초안을 작성한다.
  사용자가 명시적으로 승인한 경우에만 GitHub Issue를 생성한다.
---

# create-issue

## 목적

사용자 요청, Plan, 관련 문서를 분석하여 작업 유형을 판단하고  
저장소의 GitHub Issue Template에 맞는 Issue 제목과 본문 초안을 작성한다.

기본 동작은 Issue 초안 작성이다.  
실제 GitHub Issue 생성은 사용자 승인 후에만 수행한다.

## 지원 유형

- `feat`: 새로운 기능 추가 또는 기존 기능 확장
- `bug`: 기대 동작과 실제 동작이 다른 문제 수정
- `refactor`: 외부 동작을 유지하면서 코드 또는 구조 개선
- `documents`: 문서 추가, 수정, 규칙 정의 또는 문서 구조 정리

## 작업 흐름

1. 사용자 요청을 확인한다.
2. 작업 유형을 판단한다.
3. 관련 Plan을 찾는다.
   - `docs/plans/active/`
   - `docs/plans/completed/`
4. 관련 문서를 찾는다.
   - `docs/product-specs/`
   - `docs/design-docs/`
   - `docs/quality/`
5. 저장소의 Issue Template을 읽는다.
   - `.github/ISSUE_TEMPLATE/`
6. Template 형식에 맞춰 Issue 제목과 본문 초안을 작성한다.
7. 사용자에게 초안을 먼저 보여준다.
8. 사용자가 명시적으로 요청한 경우에만 GitHub Issue를 생성한다.
9. 생성 결과를 보고한다.

## 작성 규칙

- 저장소에 Issue Template이 있으면 그 형식과 섹션 순서를 따른다.
- Skill 내부에 별도 Issue Template을 복사해서 관리하지 않는다.
- 관련 Plan이 없으면 `없음`으로 표시한다.
- 관련 문서가 없으면 `없음` 또는 `확인되지 않음`으로 표시한다.
- Issue 번호를 추측하지 않는다.
- 동일하거나 유사한 열린 Issue가 있으면 새로 만들지 않는다.
- 제목과 본문이 비어 있으면 생성하지 않는다.

## 제목 규칙

기존 Issue 제목 규칙이 있으면 그 규칙을 따른다.

기존 규칙이 확인되지 않으면 아래 형식을 사용한다.

- `[FE] - ✔ Feat: {작업 내용}`
- `[BE] - ✔ Feat: {작업 내용}`
- `[ALL] - ✔ Feat: {작업 내용}`
- `[DOCS] - 📚 Documents: {작업 내용}`
- `[FIX] - 🐛 Bug: {문제 내용}`
- `[REFACTOR] - ♻ Refactor: {개선 내용}`

## GitHub Issue 생성 조건

Issue 초안을 작성한 직후에는 실제 Issue를 생성하지 않는다.

다음 조건을 모두 만족한 경우에만 생성한다.

- 제목과 본문 초안이 작성됨
- 사용자 검토가 완료됨
- 사용자가 `이대로 생성해줘`, `GitHub에 올려줘`, `Issue 생성해줘`처럼 명시적으로 요청함
- 대상 GitHub 저장소가 확인됨
- 사용 가능한 GitHub 인증 수단이 확인됨
- 동일하거나 유사한 열린 Issue가 없음

## GitHub 생성 방법

GitHub CLI를 사용할 수 있으면 아래 명령을 사용한다.

```bash
gh auth status

gh issue create \
  --title "<검토된 제목>" \
  --body-file "<Issue 본문 파일>"
```

GitHub CLI를 사용할 수 없으면 안전한 인증 수단을 이용해 GitHub REST API로 생성할 수 있다.

인증 정보는 출력하지 않는다.  
인증 정보를 파일에 저장하지 않는다.

## 하지 말아야 할 것

- 사용자 승인 없이 GitHub Issue를 생성하지 않는다.
- 저장소의 Issue Template을 무시하지 않는다.
- Skill 내부에 Issue Template 전문을 복사하지 않는다.
- 관련 Plan이나 문서를 임의로 지어내지 않는다.
- Issue 번호를 추측하지 않는다.
- 동일하거나 유사한 Issue가 있는데 새 Issue를 만들지 않는다.
- 인증 정보를 출력하지 않는다.
- 인증 정보를 파일에 저장하지 않는다.
- 실패 원인을 숨기지 않는다.

## 출력 형식

Issue 초안 작성 후에는 아래 형식으로 보고한다.

```text
Issue 초안 작성 완료

유형: <feat | bug | refactor | documents>
제목: <Issue 제목>
관련 Plan: <Plan 경로 또는 없음>
관련 문서: <문서 경로 또는 없음>
생성 여부: 사용자 승인 대기

본문:
<Issue 본문>
```

GitHub Issue 생성 성공 시 아래 형식으로 보고한다.

```text
GitHub Issue 생성 완료

제목: <Issue 제목>
Issue: #<Issue 번호>
URL: <생성된 Issue URL>
```

GitHub Issue 생성 실패 시 아래 형식으로 보고한다.

```text
GitHub Issue 생성 실패

단계: <실패 단계>
원인: <실패 원인>
조치: <필요한 조치>
```
