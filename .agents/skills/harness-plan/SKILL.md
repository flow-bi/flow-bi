---
name: harness-plan
description: >-
  $harness-plan {기능명}, activePlan 생성 요청에 사용한다.
  프로젝트 문서와 docs/plans/_template.md를 읽고
  docs/plans/active/{기능명}-{번호}.md 형식의 Plan을 생성한다.
  생성 후 harness/scripts/validate_plan.py로 검증한다.
  코드는 구현하지 않는다.
---

# harness-plan

## 목적

구현 전에 실행 가능한 activePlan을 생성한다.

harness-plan은 계획 생성 전용이다.  
코드 구현과 실제 실행은 실행 단계에서 처리한다.

## 사용 시점

다음 요청이 들어오면 사용한다.

- `$harness-plan {기능명} 만들어줘`
- `$harness-plan {기능명} 실행해줘`
- `{기능명} activePlan 생성`
- `{기능명} 작업 계획 작성`
- `docs/plans/_template.md 기준으로 계획 만들어줘`

## 입력

사용자는 기능명 또는 작업명을 제공한다.

예시:

- `dashboard`
- `calendar`
- `meeting-room`
- `organization`

기능명이 애매하면 `docs/product-specs/`와 `docs/design-docs/`에서 가장 가까운 문서를 찾아 판단한다.  
관련 문서를 찾을 수 없으면 임의로 만들지 말고 `없음`으로 기록한다.

## 작업 흐름

1. 사용자 요청에서 기능명 또는 작업명을 확인한다.
2. 프로젝트 공통 문서를 읽는다.
   - `AGENTS.md`
   - `ARCHITECTURE.md`
   - `SECURITY.md`
   - `CONVENTIONS.md`
3. 관련 기능 문서를 읽는다.
   - `docs/product-specs/{기능명}.md`
4. Product Spec에서 참조하는 주제별 Design Doc을 추가로 확인한다.
   - `docs/design-docs/authentication-and-permission.md`
   - `docs/design-docs/schedule-and-notification.md`
   - `docs/design-docs/ai-action-routing.md`
   - `docs/design-docs/core-beliefs.md`
5. 품질 기준을 확인한다.
   - `docs/quality/`
6. Plan 템플릿을 읽는다.
   - `docs/plans/_template.md`
7. Plan 파일명을 결정한다.
   - 형식: `docs/plans/active/{기능명}-{번호}.md`
   - 예시: `docs/plans/active/calendar-01.md`
   - 번호 확인은 `docs/plans/active/`의 파일명 목록만 사용한다.
   - 기존 activePlan 본문은 읽지 않는다.
8. 템플릿 형식에 맞춰 activePlan을 작성한다.
9. 생성한 Plan을 검증 스크립트로 검증한다.
10. 검증 실패 시 Plan을 수정하고 다시 검증한다.
11. 검증 결과와 사람 확인 필요 항목을 보고한다.

## Plan 파일명 규칙

- 파일명은 `{기능명}-{번호}.md` 형식을 따른다.
- 번호는 두 자리 숫자로 작성한다.
  - 예시: `01`, `02`, `03`
- 같은 기능명의 Plan이 없으면 `01`부터 시작한다.
- 같은 기능명의 Plan이 이미 있으면 가장 큰 번호 다음 번호를 사용한다.
- 기존 Plan 수정 요청이면 새 번호를 만들지 않고 기존 Plan을 수정한다.
- 새 Plan 생성 요청이면 기존 Plan을 덮어쓰지 않는다.
- 새 Plan의 번호를 정할 때 기존 Plan은 파일명만 확인하고 본문을 열지 않는다.
- Plan 제목은 파일명 식별자와 일치해야 한다.
  - 예시: `# 작업 계획: calendar-01`

## Plan 작성 규칙

- Plan 형식의 기준은 `docs/plans/_template.md` 하나로 고정한다.
- Skill 안에 Plan Template 전문을 복사하지 않는다.
- Task는 파일 단위가 아니라 책임 단위로 나눈다.
- Task 수는 고정하지 않는다.
- 각 Task에는 Task별 `수정 가능 경로`와 `수정 금지 경로`를 작성한다.
- 최상단에는 전체 수정 가능 경로와 수정 금지 경로를 작성하지 않는다.
- 각 Task에는 `선행 Task`를 작성한다.
- 선행 Task가 있는 Task는 검증 항목에 선행 Task 결과와의 충돌 또는 회귀 검증을 포함한다.
- 기능 구현 Task가 2개 이상이면 마지막에 통합 검증 Task를 추가한다.
- Product Spec의 미확정 사항은 임의로 확정하지 않는다.
- 미확정 사항은 `제외 범위`로 처리한다.
- 관련 문서가 없으면 있는 것처럼 쓰지 않는다.
- `worker`, `fe-worker`, `be-worker`, `frontend-worker`, `backend-worker` 형식은 사용하지 않는다.

## Context 사용 제한

- 기존 activePlan을 형식 예시, 내용 참고 또는 품질 비교 목적으로 읽지 않는다.
- Plan 형식은 `docs/plans/_template.md`와 검증 스크립트만 기준으로 삼는다.
- 사용자가 기존 Plan 수정을 명시적으로 요청한 경우에만 해당 Plan 본문을 읽는다.
- 새로 생성한 Plan은 작성 후 `cat`, `sed`, `git diff` 등으로 전체 본문을 다시 읽지 않는다.
- 생성 결과 확인은 검증 스크립트와 `git status --short`의 파일 경로로 수행한다.
- 검증에 실패하면 오류 메시지를 먼저 확인하고, 필요한 경우 오류와 직접 관련된 최소 구간만 읽는다.
- 파일 번호 확인이나 존재 여부 확인을 위해 문서 본문을 출력하지 않는다.

## 검증 규칙

Plan 생성 후 반드시 아래 명령으로 검증한다.

```bash
python .agents/scripts/validate-plan.py docs/plans/active/{기능명}-{번호}.md
```
