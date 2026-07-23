---
name: review-aggregator
description: 여러 Agent가 생성한 리뷰를 중복과 충돌을 정리한 하나의 최종 리뷰로 통합한다. Agent Review가 1개 이상 있고 Task 정보와 리뷰 결과가 전달되어, Orchestrator가 구현 변경 없이 최종 판정과 후속 조치를 정리해야 할 때 사용한다.
---

# Review Aggregator

## 사용 목적

Frontend Agent, Backend Agent 및 Review Agent가 생성한 리뷰 결과를 하나의 통합 리뷰로 정리한다.

기존 리뷰의 근거와 출처를 보존하면서 중복을 병합하고, 충돌을 식별하며, 개발자가 실행할 수 있는 Action Item과 최종 상태를 제시한다. 새로운 코드 리뷰를 수행하거나 제품 코드를 변경하지 않는다.

## 입력

필수 입력:

- Agent Review 1개 이상
- Task 정보

선택 입력:

- Verification 결과
- Scope Check 결과
- Doc Audit 결과
- Technical Debt

필수 입력이 없거나 읽을 수 없으면 추측으로 보완하지 말고 `BLOCKED`로 판정한 뒤 누락 항목을 명시한다.

## 작업 흐름

1. 모든 Agent Review와 전달된 선택 입력을 읽고 각 출처를 기록한다.
2. 각 리뷰 항목을 다음 필드로 정규화한다.
   - `source`
   - `severity`
   - `target`
   - `summary`
   - `evidence`
   - `recommendation`
3. 같은 원인과 대상을 가리키는 항목을 하나로 병합한다. 병합하더라도 모든 근거와 출처를 유지한다.
4. 리뷰 의견이 충돌하면 `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`를 확인해 판단한다. 문서로 판단할 수 없으면 `Decision Required`에 남긴다.
5. 각 항목의 심각도를 `Critical`, `High`, `Medium`, `Low`, `Info` 중 하나로 정리한다.
6. 수정이 필요한 항목을 대상, 문제, 근거와 기대 결과가 드러나는 Action Item으로 작성한다.
7. 미해결 필수 변경, 의사결정 필요 사항과 기술 부채를 구분한다.
8. 전체 근거를 바탕으로 `PASS`, `PASS_WITH_DEBT`, `CHANGES_REQUIRED`, `BLOCKED` 중 하나를 최종 상태로 결정한다.

## 출력

다음 형식을 유지한다.

```markdown
# Aggregated Review

## Overview

## Summary

## Required Changes

## Decision Required

## Technical Debt

## Suggestions

## Final Decision
```

내용이 없는 섹션도 생략하지 말고 `none`으로 표시한다. `Final Decision`에는 선택한 최종 상태와 그 근거를 함께 작성한다.

## 검증 기준

최종 출력 전에 다음을 확인한다.

- 전달된 모든 Agent Review를 반영했는가.
- 각 이슈에 추적 가능한 출처와 근거가 있는가.
- 중복 항목을 병합하면서 출처나 근거를 잃지 않았는가.
- 충돌하는 의견을 임의로 숨기지 않고 해결 근거 또는 `Decision Required`를 남겼는가.
- 심각도가 근거와 영향에 맞는가.
- Required Change가 개발자가 바로 실행할 수 있을 만큼 구체적인가.
- 필수 변경, 사람의 결정, 기술 부채와 제안을 서로 구분했는가.
- Final Decision이 미해결 항목 및 검증 결과와 모순되지 않는가.
- 출력 형식의 모든 필수 섹션이 존재하는가.

## 하지 말아야 할 것

- 제품 코드, 문서 또는 설정을 수정하지 않는다.
- 전달된 리뷰에 없는 새로운 리뷰 이슈를 생성하지 않는다.
- Agent를 실행하지 않는다.
- Git 상태, Branch, Commit 또는 파일을 변경하지 않는다.
- 근거가 없는 내용을 사실처럼 추측하지 않는다.
- 이슈를 병합하거나 요약하면서 반대 의견, 출처 또는 근거를 누락하지 않는다.
- 해결되지 않은 필수 변경이 있는데 `PASS`로 판정하지 않는다.
