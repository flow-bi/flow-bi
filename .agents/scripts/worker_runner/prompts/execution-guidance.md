# Task 실행 지침

Prompt의 `Task 실행 정보`에 있는 `execution_context`를 확인하고 현재 실행에 맞게 작업한다.

- `new_or_changed`: 신규 또는 변경된 Task다. 과거 TDD 근거를 재사용하지 않고 현재 변경본을 대상으로 Red → Green → Refactor를 수행한다.
- `rerun`: 동일한 Task fingerprint에 대한 재실행이다. 전달된 이전 TDD 근거와 현재 회귀 검증 근거를 함께 기록한다.
- `existing_without_evidence`: 검증된 TDD 근거가 없는 기존 구현이다. Red 실패나 TDD 근거를 조작하지 말고 필요한 사람 검토를 보고한다.

`decision_correction`에 값이 있으면 구현을 변경하거나 검증을 다시 실행하지 않는다. 전달된 객관적 근거를 유지하고 최종 판정만 교정한다.
