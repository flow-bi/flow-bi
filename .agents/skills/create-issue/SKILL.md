---
name: create-issue
description: >-
  $create-issue, activePlan 기반 GitHub Issue 초안 작성과 Issue 번호 기반 브랜치 생성 요청에 사용한다.
  관련 activePlan, Issue Template, title-rules, checklist를 확인해 Issue 초안을 작성한다.
  사용자가 승인한 경우에만 GitHub Issue를 생성하고 해당 Issue 번호로 새 브랜치를 만든 뒤 이동한다.
---

# create-issue

## 목적

activePlan을 기준으로 GitHub Issue 초안을 작성하고, 승인 후 Issue를 생성한 뒤 Issue 번호 기반 작업 브랜치를 만든다.

기본 동작은 Issue 초안 작성이다.  
GitHub Issue 생성과 브랜치 생성은 사용자가 명시적으로 승인한 경우에만 수행한다.

## 사용 시점

다음 요청이 들어오면 사용한다.

- `$create-issue`
- `$create-issue {plan-id}`
- `{plan-id} 이슈 만들어줘`
- `이 작업으로 이슈 만들고 브랜치 파줘`

예시:

```text
$create-issue dashboard-01
$create-issue calendar-02
```

## 작업 흐름

1. 사용자 요청에서 Plan ID를 확인한다.
   - 형식: `{feature}-{NN}`
   - 예시: `dashboard-01`
2. 관련 activePlan을 읽는다.
   - `docs/plans/active/{feature}-{NN}.md`
3. 저장소 Issue Template을 읽는다.
   - `.github/ISSUE_TEMPLATE/`
4. 참고 규칙을 읽는다.
   - `.agents/skills/create-issue/references/checklist.md`
   - `.agents/skills/create-issue/references/title-rules.md`
5. activePlan 기준으로 작업 범위와 작업 유형을 판단한다.
6. Issue 제목과 본문 초안을 작성한다.
7. 생성 예정 브랜치명을 제안한다.
8. 사용자에게 초안을 보여주고 승인을 기다린다.
9. 사용자가 승인하면 GitHub Issue를 생성한다.
10. 생성된 Issue 번호로 브랜치를 만든다.
11. 새 브랜치로 이동한다.
12. 결과를 보고한다.

## activePlan 규칙

- Issue는 activePlan을 기준으로 만든다.
- 관련 activePlan이 없으면 Issue를 만들지 않는다.
- Plan ID가 애매하면 임의로 고르지 않고 사용자 확인을 요청한다.
- Issue 본문에는 activePlan의 작업 목적, Task 요약, 검증 기준을 반영한다.
- activePlan에 사람 검증 필요 항목이 있으면 Issue 본문에 남긴다.

## 작업 범위 규칙

범위는 아래 값 중 하나를 사용한다.

- `fe`: 프론트엔드
- `be`: 백엔드
- `all`: 프론트엔드와 백엔드 또는 전체 기능
- `docs`: 문서
- `infra`: 인프라, 배포, CI/CD
- `harness`: 하네스, Skill, Hook, 자동화 스크립트

범위가 애매하면 사용자 확인이 필요하다.

## 작업 유형 규칙

유형은 아래 값 중 하나를 사용한다.

- `feat`: 기능 추가 또는 기능 확장
- `bug`: 버그 수정
- `refactor`: 동작 변경 없는 구조 개선
- `docs`: 문서 작업
- `chore`: 설정, 빌드, 관리 작업

## 브랜치 규칙

Issue 생성 후 생성된 Issue 번호를 기준으로 브랜치를 만든다.

브랜치명 형식:

```text
{scope}/{type}/{issue-number}
```

예시:

```text
fe/feat/16
be/bug/17
all/refactor/18
docs/docs/19
harness/chore/20
```

규칙:

- 브랜치는 현재 브랜치에서 생성한다.
- 브랜치명에는 `#`을 넣지 않는다.
- Issue 번호는 GitHub에서 실제 생성된 번호를 사용한다.
- Issue 생성 전에 Issue 번호를 추측하지 않는다.
- 같은 이름의 브랜치가 있으면 새로 만들지 않는다.
- 원격 Push는 사용자가 따로 승인한 경우에만 한다.

브랜치 생성 명령:

```bash
git switch -c <scope>/<type>/<issue-number>
```

## GitHub Issue 생성

사용자 승인 전에는 GitHub Issue를 생성하지 않는다.

승인 문구 예시:

- `이대로 생성해줘`
- `GitHub에 올려줘`
- `Issue 만들고 브랜치 파줘`
- `ㅇㅋ 생성해줘`

GitHub CLI를 사용할 수 있으면 아래 방식을 우선한다.

```bash
gh issue create \
  --title "<검토된 제목>" \
  --body-file "<Issue 본문 파일>"
```

Issue 생성 후 반환된 Issue 번호로 브랜치를 만든다.

## 하지 말아야 할 것

- activePlan 없이 Issue를 만들지 않는다.
- 사용자 승인 없이 GitHub Issue를 생성하지 않는다.
- 사용자 승인 없이 브랜치를 생성하지 않는다.
- Issue 번호를 추측하지 않는다.
- 브랜치명에 `#`을 넣지 않는다.
- 기존 브랜치를 덮어쓰지 않는다.
- Issue Template을 무시하지 않는다.
- 관련 Plan이나 문서를 임의로 지어내지 않는다.
- 인증 정보를 출력하거나 저장하지 않는다.
- 원격 Push를 임의로 하지 않는다.

## 출력

초안 작성 후에는 아래를 보고한다.

- 관련 activePlan
- 작업 범위
- 작업 유형
- Issue 제목
- Issue 본문
- 생성 예정 브랜치명
- 사용자 승인 대기 여부

생성 완료 후에는 아래를 보고한다.

- 생성된 Issue 번호
- Issue URL
- 기준 브랜치
- 생성된 브랜치
- 현재 브랜치
