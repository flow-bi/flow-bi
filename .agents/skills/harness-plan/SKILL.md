---
name: harness-plan
description: >-
  $harness-plan {기능명}, activePlan 생성 요청에 사용한다.
  프로젝트 문서와 docs/plans/_template.md를 읽고
  docs/plans/active/{기능명}-{번호}.md 형식의 Plan을 생성한다.
  생성 후 .agents/scripts/validate-plan.py로 검증한다.
  코드는 구현하지 않는다.
---

# harness-plan

## 목적

구현 전에 실행 가능한 activePlan을 생성한다.

harness-plan은 계획 생성 전용이다.  
코드 구현과 실제 실행은 실행 단계에서 처리한다.

## 작업 흐름

1. 사용자 요청에서 기능명 또는 작업명을 확인한다.
2. 다음 문서를 읽는다.
   - `AGENTS.md`
3. 확정된 MVP 범위만 실행 Task로 구성한다.
4. Plan 파일명을 결정한다.
   - 형식: `docs/plans/active/{기능명}-{번호}.md`
   - 기존 Plan은 파일명만 확인하고 본문은 읽지 않는다.
5. 템플릿 형식에 맞춰 activePlan을 작성한다.
6. 검증 스크립트로 검증한다.
7. 검증 실패 시 생성한 Plan만 수정하고 다시 검증한다.

## 사용자 요청 기록 규칙

- Plan의 `사용자 요청`에는 실제 작업 요구사항만 작성한다.
- `$harness-plan`, `$harness-execute`, `$create-issue` 등 Skill 호출문은 기록하지 않는다.
- Skill 이름, 파일명, 호출 옵션과 실행 문법은 제거한다.

예시:

- 입력: `$harness-plan calendar 만들어줘`
- 기록: `캘린더 MVP 기능 구현을 위한 실행 계획을 작성한다.`

## Plan 파일명 규칙

- 파일명은 `{기능명}-{번호}.md` 형식을 따른다.
- 번호는 두 자리 숫자로 작성한다.
- 같은 기능명의 Plan이 없으면 `01`부터 시작한다.
- 기존 Plan 수정 요청이면 해당 Plan을 수정한다.
- 그 외 추가 구현 요청은 새 번호의 Plan을 생성한다.
- Plan 제목은 파일명과 일치해야 한다.

## 브라우저 검증 규칙

- 화면 또는 사용자 흐름을 구현하는 Plan에는 Cypress E2E 검증을 포함한다.
- Cypress가 구성되지 않은 경우 최초 Plan에 환경 구축 Task를 생성한다.
- 환경 구축 이후에는 별도 공통 Task를 반복하지 않고 각 프론트엔드 기능 Task에 Cypress 테스트 작성을 포함한다.
- Cypress 테스트는 `frontend/cypress/e2e/{기능명}/**`에 작성한다.
- 프론트엔드 Task의 수정 가능 경로에는 해당 Cypress 테스트 경로를 포함한다.
- 백엔드 API가 필요한 프론트엔드 Task는 해당 백엔드 Task를 선행 Task로 지정한다.

## 실행 Task 생성 규칙

activePlan의 Task는 worker가 직접 수행할 수 있는 구현 작업이어야 한다.

허용:

- 애플리케이션 코드 구현
- 컴포넌트 또는 API 구현
- 테스트 코드 작성
- 구현 범위에 대한 검증

금지:

- 요구사항 확정
- 정책 또는 설계 결정
- Product Spec, Design Doc, 품질 문서 수정
- 실행 게이트 정의
- 사람 검토만 수행하는 Task
- 다른 Task의 구현 결과 재검증
- 구현 내용이 비어 있는 Task

다음 문서는 읽기 전용으로 사용한다.

- `AGENTS.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `docs/product-specs/**`
- `docs/design-docs/**`
- `docs/quality/**`
- `docs/plans/_template.md`

위 경로를 Task의 `수정 가능 경로`에 포함하지 않는다.

## TDD 규칙

- 기능 구현 Task는 실패 테스트 작성, 최소 구현, 리팩터링 순서로 작성한다.
- 테스트와 해당 기능 구현은 같은 Task에 포함한다.
- 각 Task는 자신의 구현 범위에 해당하는 테스트만 실행한다.
- 구현 문제로 테스트가 실패하면 최대 3회까지 수정과 재검증을 반복한다.
- 3회 수정 후에도 실패하면 임의로 우회하지 않고 Task를 실패 처리하며 원인과 남은 문제를 기록한다.
- 전체 lint, test, build는 모든 Task 완료 후 Harness 실행기가 수행한다.

## 수정 가능 경로 규칙

- 현재 실제로 존재하는 디렉터리를 기준으로 지정한다.
- 새 하위 경로를 생성해야 하면 실제로 존재하는 가장 가까운 상위 디렉터리를 지정한다.
- 아직 존재하지 않는 파일이나 디렉터리를 직접 지정하지 않는다.
- 소스 코드와 테스트 코드 경로를 모두 포함한다.
- 기능 범위보다 지나치게 넓은 경로는 지정하지 않는다.

## Task 분할 규칙

- Plan은 사용자 기능을 완성하는 데 필요한 프론트엔드와 백엔드 작업을 모두 포함한다.
- 하나의 Task는 한 worker가 독립적으로 수행할 수 있는 범위로 작성한다.
- 프론트엔드와 백엔드 구현은 담당 worker가 다르면 별도 Task로 분리한다.
- 백엔드 Task와 이를 사용하는 프론트엔드 Task는 하나의 기능 흐름으로 연속 배치한다.
- 프론트엔드 연동 Task는 필요한 API 구현 Task를 `선행 Task`로 지정한다.
- 모든 백엔드 작업을 하나의 Task로 합치거나 모든 프론트엔드 작업을 마지막에 몰아서 작성하지 않는다.
- Task는 생성, 조회, 수정, 취소 등 테스트 가능한 사용자 동작을 기준으로 나눈다.

## 미확정 사항 처리 규칙

- 미확정 사항이 있다는 이유만으로 Plan 전체를 차단하지 않는다.
- MVP에서 제외 가능한 사항은 Task의 `제외 범위` 또는 `남은 문제`에 기록한다.
- 미확정된 기능은 빈 Task로 만들지 않는다.
- 미확정 기능을 제외해도 실행 가능한 Task가 있으면 Plan을 생성한다.
- 핵심 MVP를 수행할 실행 가능한 Task가 하나도 없을 때만 Plan을 생성하지 않고 `PLAN_BLOCKED`를 보고한다.
- worker가 미확정 사항을 임의로 결정하도록 작성하지 않는다.

## 선행 Task 처리 규칙

- 각 Task에는 `선행 Task`를 작성한다.
- 선행 Task는 실행 순서를 제어하는 정보로만 사용한다.
- 선행 Task의 성공 여부와 검증 통과 여부는 Harness 실행기가 확인한다.
- 후속 Task는 선행 Task의 로그나 결과를 다시 확인하지 않는다.
- 후속 Task의 구현 항목과 검증 항목에 선행 Task 재검증을 포함하지 않는다.
- 각 Task는 자신의 구현 범위만 검증한다.
- 전체 lint, test, build는 모든 Task가 끝난 후 Harness 실행기가 한 번 수행한다.

## Context 사용 제한

- 새 Plan 생성 시 기존 activePlan 본문을 읽지 않는다.
- 기존 Plan 수정 요청일 때만 해당 Plan을 읽는다.
- 새 Plan은 현재 사용자 요청, 프로젝트 문서, 현재 코드 상태만 기준으로 작성한다.
- 생성 후 전체 본문을 다시 읽지 않는다.
- 검증 실패 시 오류와 관련된 최소 구간만 확인한다.

## 검증 규칙

Plan 생성 후 반드시 실행한다.

```bash
python .agents/scripts/validate-plan.py docs/plans/active/{기능명}-{번호}.md
```
