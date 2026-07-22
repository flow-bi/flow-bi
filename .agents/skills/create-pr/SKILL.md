---
name: create-pr
description: >-
  $create-pr, Pull Request 생성, PR 초안 작성, 현재 브랜치 변경 사항으로 PR 만들기 요청에 사용한다.
  현재 브랜치, 기준 브랜치, Git 변경 사항, 관련 Issue와 Plan, 테스트 결과,
  저장소의 PR Template을 확인해 Pull Request 초안을 작성한다.
  사용자가 명시적으로 승인한 경우에만 GitHub Pull Request를 생성한다.
---

# create-pr

## 사용 목적

이 Skill은 현재 브랜치의 변경 사항을 분석해 프로젝트 규칙에 맞는 Pull Request 초안을 작성하기 위해 사용한다.

PR 초안 작성과 실제 GitHub PR 생성은 분리한다.

기본 동작은 PR 초안 작성이다.  
GitHub PR 생성은 사용자가 명시적으로 승인한 경우에만 수행한다.

## 사용 시점

다음 요청이 들어오면 이 Skill을 사용한다.

- `$create-pr`
- `PR 초안 작성해줘`
- `Pull Request 만들어줘`
- `현재 브랜치로 PR 만들어줘`
- `GitHub에 PR 생성해줘`
- `이 변경사항으로 PR 작성해줘`

## 입력

필요한 경우 다음 정보를 확인한다.

- 현재 브랜치
- 기준 브랜치
- Git 변경 사항
- 커밋 내역
- 관련 Issue
- 관련 Plan
- 테스트 및 빌드 결과
- 저장소의 기존 Pull Request Template

기준 브랜치가 명시되지 않으면 저장소의 기본 브랜치를 기준으로 사용한다.

## 작업 흐름

1. 현재 브랜치를 확인한다.
2. 기준 브랜치를 확인한다.
3. 기준 브랜치와 현재 브랜치가 같은지 확인한다.
4. 기준 브랜치와 비교한 변경 사항을 확인한다.
5. 커밋 내역을 확인한다.
6. 관련 Issue를 찾는다.
7. 관련 Plan을 찾는다.
8. 저장소의 PR Template을 읽는다.
9. 변경 목적과 주요 구현 내용을 정리한다.
10. 테스트 및 빌드 결과를 확인한다.
11. PR 제목과 본문 초안을 작성한다.
12. 사용자에게 초안을 먼저 보여준다.
13. 사용자가 명시적으로 승인한 경우에만 GitHub PR을 생성한다.
14. 생성 결과를 보고한다.

## 확인 명령

변경 사항은 다음 명령을 기준으로 확인한다.

```bash
git branch --show-current
git status --short
git log <기준 브랜치>..HEAD --oneline
git diff <기준 브랜치>...HEAD --stat
git diff <기준 브랜치>...HEAD
```
