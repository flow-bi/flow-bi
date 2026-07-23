---
name: harness-plan
description: >-
  $harness-plan {기능명}, activePlan 생성, 작업 계획 작성 요청에 사용한다.
  프로젝트 공통 문서, 기능별 Product Spec, Design Doc, Quality 문서,
  docs/plans/_template.md를 읽고 docs/plans/active/{기능명}-{번호}.md 계획 문서를 생성하고 검증한다.
  코드는 구현하지 않는다.
---

# harness-plan

## 사용 목적

이 Skill은 구현 전에 검증 가능한 activePlan을 생성하기 위해 사용한다.

harness-plan은 계획 생성 전용이다.  
코드 구현, 실제 작업 수행은 harness-execute에서 처리한다.

## 사용 시점

다음 요청이 들어오면 이 Skill을 사용한다.

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
- `rooms`
- `organization`

기능명이 애매하면 `docs/product-specs/`와 `docs/design-docs/`에서 가장 가까운 문서를 찾아 판단한다.  
관련 문서를 찾을 수 없으면 임의로 만들지 말고 `없음`으로 표시한다.

## 작업 흐름

1. 사용자 요청에서 기능명 또는 작업명을 확인한다.

2. 프로젝트 공통 문서를 읽는다.
   - `AGENTS.md`
   - `ARCHITECTURE.md`
   - `SECURITY.md`
   - `CONVENTIONS.md`

3. 기능별 문서를 읽는다.
   - `docs/product-specs/{기능명}.md`
   - `docs/design-docs/{기능명}.md`

4. Product Spec 안에서 참조하는 관련 Design Doc을 추가로 확인한다.
   - `docs/design-docs/authentication-and-permission.md`
   - `docs/design-docs/schedule-and-notification.md`
   - `docs/design-docs/ai-action-routing.md`
   - `docs/design-docs/core-beliefs.md`

   기능명과 동일한 Design Doc이 없더라도 Product Spec에서 위 Design Doc을 참조하고 있으면 반드시 읽는다.  
   참조된 Design Doc을 읽지 않고 `Design Doc: 없음`으로 처리하지 않는다.

5. 품질 기준 문서를 읽는다.
   - `docs/quality/`

6. Plan 템플릿을 읽는다.
   - `docs/plans/_template.md`

7. Plan 파일명을 결정한다.
   - 파일명 형식: `docs/plans/active/{기능명}-{번호}.md`
   - 예시: `docs/plans/active/calendar-01.md`
   - 같은 기능명의 Plan이 없으면 `01`부터 시작한다.
   - 같은 기능명의 Plan이 이미 있으면 가장 큰 번호 다음 번호를 사용한다.
   - 기존 Plan 수정 요청이면 새 번호를 만들지 않고 기존 Plan을 수정한다.

8. 템플릿 형식에 맞춰 activePlan을 작성한다.
   - Plan 제목 형식: `# 작업 계획: {기능명}-{번호}`

9. 작성한 activePlan을 검증한다.

10. 검증에 실패하면 수정 후 다시 검증한다.

11. 검증 결과와 사람 검증 필요 항목을 보고한다.

## 작성 규칙

- activePlan은 반드시 `docs/plans/_template.md` 형식을 따른다.
- `docs/plans/_template.md` 내용을 Skill 안에 복사하지 않는다.
- activePlan 파일명은 `{기능명}-{번호}.md` 형식을 따른다.
- 번호는 두 자리 숫자로 작성한다.
  - 예시: `01`, `02`, `03`
- 같은 기능명의 Plan이 없으면 `01`부터 시작한다.
- 같은 기능명의 Plan이 이미 있으면 가장 큰 번호 다음 번호를 사용한다.
- Plan 제목도 파일명과 동일한 식별자를 포함한다.
  - 예시: `# 작업 계획: calendar-01`
- 기존 Plan을 수정하는 요청이면 새 번호를 만들지 않고 기존 Plan을 검증한 뒤 수정한다.
- 새로운 작업 계획을 만드는 요청이면 기존 Plan을 덮어쓰지 않고 다음 번호로 생성한다.
- 관련 문서가 없으면 있는 것처럼 쓰지 않는다.
- 문서가 부족해 판단이 어려우면 사람 검증 필요 항목으로 남긴다.
- Task는 파일 단위가 아니라 책임 단위로 나눈다.
- Task 수는 고정하지 않는다.
- 작업 범위에 따라 필요한 만큼 Task를 생성한다.
- 각 Task에는 `선행 Task`를 반드시 작성한다.
- 선행 Task가 없으면 `없음`으로 작성한다.
- 후속 Task는 선행 Task의 완료 조건과 검증 항목이 통과된 뒤에만 실행될 수 있도록 계획한다.
- 각 Task에는 Task별 `수정 가능 경로`와 `수정 금지 경로`를 반드시 작성한다.
- 전체 수정 가능 경로와 전체 수정 금지 경로는 최상단에 작성하지 않는다.
- 각 Task에는 구현 항목, 검증 항목, 완료 조건, 실패 조건, 제외 범위를 포함한다.
- 각 Task와 전체 완료 조건에는 `quality_score` 기준을 포함한다.
- 기본 `quality_score` 기준은 `85`로 둔다.
- 보안, 인증, 인가, 권한, 결제, 정산, 데이터 정합성 관련 작업은 `90` 이상으로 둔다.
- 기능 구현 Task가 2개 이상이면 마지막에 통합 검증 Task를 추가한다.
- 통합 검증 Task는 이전 Task들의 결과가 서로 충돌하지 않는지 확인해야 한다.
- 문서 작업만 있는 경우에도 마지막 Task 또는 전체 완료 조건에서 문서 간 충돌 여부를 검증한다.
- Product Spec의 `미확정 사항`을 반드시 확인한다.
- 미확정 사항이 이번 구현 Task에 영향을 주면 임의로 확정하지 않는다.
- 미확정 사항은 `제외 범위`, `남은 문제`, 또는 `사람 검증 필요 항목` 중 하나로 반드시 처리한다.
- Product Spec이 참조하는 주제별 Design Doc이 있으면 관련 설계 문서에 포함한다.
- 기능명과 동일한 Design Doc이 없어도 참조된 Design Doc이 있으면 `Design Doc: 없음`으로만 처리하지 않는다.

## 검증 기준

사용자는 `$harness-plan {기능명} 만들어줘`만 입력해도 된다.  
문서 확인, Plan 작성, 검증, 재수정은 Skill 내부에서 수행한다.

### 1. 문서 읽기 검증

Plan을 작성하기 전에 읽어야 할 문서 목록을 만든다.

필수 확인 대상은 아래와 같다.

- `AGENTS.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `CONVENTIONS.md`
- `docs/product-specs/{기능명}.md`
- `docs/design-docs/{기능명}.md`
- `docs/quality/`
- `docs/plans/_template.md`

각 문서는 아래 상태 중 하나로 기록한다.

- `읽음`
- `없음`
- `읽기 실패`

다음 경우는 검증 실패로 판단한다.

- 존재하는 문서를 읽지 않음
- `docs/plans/_template.md`를 읽지 않음
- `docs/product-specs/{기능명}.md`가 존재하는데 읽지 않음
- 프로젝트 공통 문서가 존재하는데 읽지 않음
- 문서 읽기 상태를 최종 보고에 포함하지 않음

다음 경우는 검증 실패가 아니라 `없음`으로 처리할 수 있다.

- 해당 기능의 Design Doc이 실제로 존재하지 않음
- `docs/quality/` 디렉터리 또는 관련 문서가 실제로 존재하지 않음
- 공통 문서가 아직 작성되지 않음

단, 없는 문서를 있는 것처럼 작성하지 않는다.  
없는 문서 때문에 판단이 어려우면 사람 검증 필요 항목으로 남긴다.

### 2. Plan 작성 전 검증

activePlan을 생성하기 전에 아래 항목을 확인한다.

- 기능명 또는 작업명이 확인되었는가
- `docs/plans/_template.md`를 읽었는가
- 관련 Product Spec의 존재 여부를 확인했는가
- 관련 Design Doc의 존재 여부를 확인했는가
- Product Spec이 참조하는 Design Doc을 확인했는가
- 공통 문서의 존재 여부를 확인했는가
- 품질 문서의 존재 여부를 확인했는가
- 동일 기능명의 기존 Plan 번호를 확인했는가
- 새 Plan 생성인지 기존 Plan 수정인지 판단했는가
- 새 Plan 생성이면 다음 번호를 올바르게 계산했는가

하나라도 누락되면 Plan을 작성하지 말고 다시 확인한다.

### 3. activePlan 파일명 검증

activePlan 파일명과 제목을 확인한다.

- Plan 파일명이 `{기능명}-{번호}.md` 형식인가
- Plan 번호가 두 자리 숫자인가
- Plan 경로가 `docs/plans/active/{기능명}-{번호}.md` 형식인가
- Plan 제목이 파일명 식별자와 일치하는가
- 기존 Plan을 실수로 덮어쓰지 않았는가
- 기존 Plan 수정 요청인데 새 번호를 생성하지 않았는가
- 새 Plan 생성 요청인데 기존 번호를 재사용하지 않았는가

다음 경우는 검증 실패로 판단한다.

- `{기능명}.md`처럼 번호 없는 파일명을 사용함
- 번호가 `1`, `2`처럼 한 자리로 작성됨
- 기존 Plan을 사용자 확인 없이 덮어씀
- 새 Plan 생성인데 기존 Plan 번호를 재사용함
- Plan 제목과 파일명이 불일치함

### 4. activePlan 구조 검증

activePlan 생성 후 아래 항목을 확인한다.

- `docs/plans/_template.md` 구조를 따르는가
- 사용자 요청이 원문에 가깝게 기록되었는가
- 작업 목적이 작성되었는가
- 작업 유형이 작성되었는가
- 관련 설계 문서가 `경로` 또는 `없음`으로 기록되었는가
- 최상단에 전체 수정 가능 경로와 수정 금지 경로를 두지 않았는가
- 모든 Task에 선행 Task가 있는가
- 모든 Task의 선행 Task가 실제 존재하는 Task를 참조하는가
- 선행 Task 순서에 순환 참조가 없는가
- 모든 Task에 Task별 수정 가능 경로가 있는가
- 모든 Task에 Task별 수정 금지 경로가 있는가
- 모든 Task에 작업 목적이 있는가
- 모든 Task에 구현 항목이 있는가
- 모든 Task에 검증 항목이 있는가
- 모든 Task에 완료 조건과 실패 조건이 있는가
- 모든 Task에 제외 범위가 있는가
- 후속 Task의 검증 항목에 선행 Task 결과와의 충돌 검증이 포함되어 있는가
- 기능 구현 Task가 2개 이상이면 통합 검증 Task가 있는가
- `작업 결과`의 기본값이 `none`인가
- `남은 문제`의 기본값이 `none`인가
- 실제 미해결 문제가 있으면 `남은 문제`에 기록되었는가
- 전체 완료 조건과 전체 실패 조건이 있는가
- `quality_score` 기준이 누락되지 않았는가

### 5. 관련 Design Doc 검증

기능명과 동일한 Design Doc이 없어도 Product Spec이 참조하는 주제별 Design Doc은 관련 설계 문서에 포함한다.

예를 들어 Product Spec에 아래 문서가 언급되어 있으면 반드시 읽고 Plan에 기록한다.

- `docs/design-docs/authentication-and-permission.md`
- `docs/design-docs/schedule-and-notification.md`
- `docs/design-docs/ai-action-routing.md`
- `docs/design-docs/core-beliefs.md`

다음 경우는 검증 실패로 판단한다.

- Product Spec에서 참조한 Design Doc을 읽지 않음
- 참조된 Design Doc이 존재하는데 `Design Doc: 없음`으로 처리함
- 일정, 회의실, 알림, AI 연동 정책이 있는데 `schedule-and-notification.md`를 확인하지 않음
- 인증, 권한, 관리자 접근 정책이 있는데 `authentication-and-permission.md`를 확인하지 않음
- AI action, AI 자동 실행, AI 기능 연결 정책이 있는데 `ai-action-routing.md`를 확인하지 않음

참조된 Design Doc이 실제로 존재하지 않으면 `없음`으로 표시한다.  
단, 없는 문서를 있는 것처럼 쓰지 않는다.

### 6. 미확정 사항 검증

Product Spec의 `미확정 사항`을 반드시 확인한다.

각 미확정 사항에 대해 아래를 판단한다.

- 이번 activePlan의 구현 Task에 영향을 주는가
- 구현 전에 결정이 필요한가
- 제외 범위로 처리할 수 있는가
- 관련 Design Doc의 미확정 사항으로 위임되어 있는가

다음 경우는 검증 실패로 판단한다.

- 미확정 사항이 구현 항목에 포함되어 있는데 `남은 문제`가 `none`인 경우
- 미확정 값을 임의 enum, 임의 정책, 임의 UI 선택지로 확정한 경우
- 관련 Design Doc에 위임된 정책을 읽지 않은 경우
- 미확정 사항이 있는데 사람 검증 필요 항목에 기록하지 않은 경우
- Product Spec의 미확정 사항과 충돌하는 구현 Task를 만든 경우

미확정 사항이 구현에 영향을 주는 경우 다음 중 하나로 처리한다.

1. 선행 Task로 `정책 확정` 작업을 추가한다.
2. 해당 구현 항목을 제외 범위로 이동한다.
3. `남은 문제`에 사람 검증 필요 항목으로 기록한다.

단, 구현에 직접 영향이 없는 미확정 사항은 Plan 생성을 막지 않는다.

### 7. Task 선행 관계 및 연쇄 검증

activePlan은 Task가 독립 세션에서 실행될 수 있다는 전제를 가진다.

따라서 각 Task는 자신의 작업 범위만 검증하는 것이 아니라, 선행 Task의 결과와 충돌하지 않는지도 확인할 수 있어야 한다.

각 Task에 대해 아래 항목을 확인한다.

- 선행 Task가 `없음` 또는 실제 존재하는 Task 번호로 작성되었는가
- 선행 Task 순서에 순환 참조가 없는가
- 후속 Task가 선행 Task의 결과를 전제로 작성되었는가
- 후속 Task의 검증 항목에 선행 Task 결과와의 충돌 여부 확인이 포함되어 있는가
- Task별 수정 가능 경로와 수정 금지 경로가 분리되어 있는가
- Task별 수정 가능 경로가 지나치게 넓지 않은가
- Task별 수정 금지 경로가 선행 Task 결과물을 보호할 수 있는가

다음 경우는 검증 실패로 판단한다.

- 선행 Task가 존재하지 않는 Task를 참조함
- 선행 Task 순서가 순환됨
- 후속 Task가 선행 Task 완료 전에 실행될 수 있게 작성됨
- 후속 Task가 선행 Task 결과와의 충돌 검증 없이 작성됨
- Task별 수정 가능 경로가 없어 실행 권한을 분리할 수 없음
- Task별 수정 금지 경로가 없어 다른 Task 결과를 보호할 수 없음
- 기능 구현 Task가 여러 개인데 통합 검증 Task가 없음

기능 구현 Task가 2개 이상이면 마지막에 통합 검증 Task를 추가한다.

통합 검증 Task는 아래 내용을 포함해야 한다.

- 선행 Task 결과가 서로 충돌하지 않는지 확인한다.
- Task별 수정 가능 경로 밖 변경이 없는지 확인한다.
- Task별 수정 금지 경로에 변경이 없는지 확인한다.
- Product Spec, Design Doc, 구현 결과가 서로 충돌하지 않는지 확인한다.
- 전체 테스트, 빌드, 정적 검증 명령을 확인한다.
- 미확정 사항이 사용자 확인 없이 구현 정책으로 확정되지 않았는지 확인한다.

문서 작업만 있는 경우에도 문서 간 충돌 검증 Task 또는 전체 완료 조건을 둔다.

### 8. 재검증 규칙

검증에 실패하면 아래 순서로 반복한다.

1. 실패 항목을 기록한다.
2. 누락 또는 오류를 수정한다.
3. activePlan을 다시 확인한다.
4. 검증 결과를 갱신한다.
5. 통과할 때까지 반복한다.

단, 문서가 없어서 판단할 수 없는 경우에는 임의로 통과시키지 않는다.  
해당 항목을 사람 검증 필요 항목으로 남긴다.

### 9. 기존 activePlan 처리

`docs/plans/active/{기능명}-{번호}.md` 형식의 기존 Plan이 존재하는지 확인한다.

기존 Plan을 수정하는 요청이면 해당 Plan을 먼저 검증한다.

- 템플릿 구조가 깨져 있으면 수정한다.
- 필수 항목이 누락되어 있으면 채운다.
- 관련 문서와 충돌하는 내용이 있으면 수정하거나 사람 검증 필요 항목으로 남긴다.
- 수정 후 다시 검증한다.

새로운 Plan을 생성하는 요청이면 기존 Plan을 덮어쓰지 않는다.

- 같은 기능명의 기존 Plan 중 가장 큰 번호를 찾는다.
- 다음 번호로 새 activePlan을 생성한다.
- 예시: `calendar-01.md`가 있으면 `calendar-02.md`를 생성한다.

## 하지 말아야 할 것

- 코드를 구현하지 않는다.
- worker를 실행하지 않는다.
- harness-execute 역할을 수행하지 않는다.
- activePlan 외의 파일을 수정하지 않는다.
- `docs/plans/_template.md` 내용을 Skill 안에 복사하지 않는다.
- 관련 문서가 없는데 있는 것처럼 쓰지 않는다.
- 기존 activePlan을 사용자 확인 없이 덮어쓰지 않는다.
- Plan 번호를 건너뛰거나 임의로 작성하지 않는다.
- `{기능명}.md`처럼 번호 없는 activePlan 파일명을 사용하지 않는다.
- 최상단에 전체 수정 가능 경로와 수정 금지 경로를 작성하지 않는다.
- Task별 수정 가능 경로와 수정 금지 경로 없이 Plan을 작성하지 않는다.
- 수정 가능 경로를 지나치게 넓게 잡지 않는다.
- 수정 금지 경로 변경이 필요한 계획을 통과 처리하지 않는다.
- 선행 Task를 무시하고 병렬 실행 가능한 것처럼 Plan을 작성하지 않는다.
- 여러 구현 Task가 있는데 통합 검증 Task 없이 Plan을 통과시키지 않는다.
- 후속 Task가 선행 Task 결과를 깨뜨릴 가능성을 검증하지 않고 완료 처리하지 않는다.
- 검증 실패를 숨기지 않는다.
- 테스트나 빌드를 실제로 실행한 것처럼 쓰지 않는다.
- `quality_score` 통과 여부를 구현 전에 임의로 판단하지 않는다.
- Product Spec의 미확정 사항이나 관련 Design Doc의 정책을 임의로 확정하지 않는다.

## 출력

작업 완료 후 사용자에게 아래 내용을 짧게 보고한다.

- 생성 또는 수정한 activePlan 경로
- 생성 또는 수정한 Plan 번호
- 읽어야 했던 문서 목록
- 실제로 읽은 문서 목록
- 없음으로 처리한 문서 목록
- 읽기 실패 문서 목록
- 생성한 Task 요약
- Task 선행 관계 검증 결과
- 통합 검증 Task 포함 여부
- 검증 결과
- 재검증 횟수
- 사람 검증 필요 항목
