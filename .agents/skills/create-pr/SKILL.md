---
name: create-pr
description: >-
  $create-pr, PR 초안 작성, Pull Request 생성 요청에 사용한다.
  현재 브랜치의 커밋 diff, 관련 Issue/Plan, 저장소 PR Template을 확인해 PR 초안을 작성한다.
  사용자가 명시적으로 승인한 경우에만 GitHub PR을 생성한다.
---

# create-pr

## 목적

현재 브랜치의 변경 사항을 기준 브랜치와 비교해 Pull Request 초안을 작성한다.

기본 동작은 PR 초안 작성이다.  
GitHub PR 생성은 사용자가 명시적으로 승인한 경우에만 수행한다.

## 절차

1. 현재 브랜치와 기준 브랜치를 확인한다.
2. 기준 브랜치와 현재 브랜치가 같은지 확인한다.
3. 기준 브랜치 대비 커밋 내역과 diff를 확인한다.
4. 관련 Issue와 Plan을 확인한다.
5. `.github/PULL_REQUEST_TEMPLATE.md`가 있으면 읽는다.
6. 커밋 diff 기준으로 PR 제목과 본문 초안을 작성한다.
7. 사용자에게 초안을 먼저 보여준다.
8. 사용자가 명시적으로 승인한 경우에만 PR을 생성한다.

## 확인 명령

```bash
git branch --show-current
git status --short
git log <기준 브랜치>..HEAD --oneline
git diff <기준 브랜치>...HEAD --stat
git diff <기준 브랜치>...HEAD
```

## 작성 규칙

- PR 본문은 실제 PR에 포함될 커밋 diff 기준으로 작성한다.
- untracked 파일, unstaged 변경, upstream 미설정, gh 미설치 같은 로컬 상태는 PR 본문에 넣지 않는다.
- 로컬 상태 안내가 필요하면 사용자 보고에만 분리한다.
- 테스트나 빌드를 실행하지 않았으면 `미실행`으로 적는다.
- Issue 번호를 추측하지 않는다.
- 기존 PR Template이 있으면 섹션 이름과 순서를 따른다.
- 현재 브랜치가 기준 브랜치와 같거나 변경 사항이 없으면 PR을 생성하지 않는다.

## PR 생성 규칙

초안 작성 직후에는 GitHub PR을 생성하지 않는다.

아래와 같은 명시적 요청이 있을 때만 생성한다.

- `이대로 PR 만들어줘`
- `GitHub에 올려줘`
- `PR 생성해줘`
- `이 내용으로 등록해줘`

실제 PR 생성 전에는 다음을 확인한다.

- 현재 브랜치가 원격 저장소에 Push되어 있는가
- 기준 브랜치가 올바른가
- PR 제목과 본문이 비어 있지 않은가
- GitHub 인증 수단을 사용할 수 있는가

현재 브랜치가 Push되지 않았으면 임의로 Push하지 않는다.  
사용자가 Push까지 승인한 경우에만 실행한다.

```bash
git push -u origin <현재 브랜치>
```

## 하지 말아야 할 것

- 사용자 승인 없이 PR을 생성하지 않는다.
- 사용자 승인 없이 Push하지 않는다.
- PR 본문에 로컬 상태 안내를 넣지 않는다.
- 테스트나 빌드를 실행하지 않았는데 실행한 것처럼 쓰지 않는다.
- 인증 정보를 출력하거나 저장하지 않는다.

## 출력

초안 작성 후에는 아래 내용을 보고한다.

- Base
- Head
- PR 제목
- PR 본문
- 관련 Issue
- 관련 Plan
- 검증 결과
- 로컬 상태 안내
- 생성 가능 여부
