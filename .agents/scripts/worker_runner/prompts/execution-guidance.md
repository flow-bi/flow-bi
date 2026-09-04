# Task 실행 지침

Prompt의 `Task 실행 정보`에 있는 `execution_context`를 확인하고 현재 실행에 맞게 작업한다.

- `new_or_changed`: 신규 또는 변경된 Task다. 과거 TDD 근거를 재사용하지 않고 현재 변경본을 대상으로 Red → Green → Refactor를 수행한다.
- `rerun`: 동일한 Task fingerprint에 대한 재실행이다. 전달된 이전 TDD 근거와 현재 회귀 검증 근거를 함께 기록한다.

`execution_context.effective_tdd_policy`를 최종 TDD Gate의 `effective_policy`에 그대로 기록한다.
`REQUIRED`는 Red → Green → Refactor와 현재 검증 근거를, `REUSE_ALLOWED`는 동일 fingerprint의
`prior_evidence_id` 및 현재 Green·회귀 근거를 요구한다. `REGRESSION_ONLY`는 새로운 Red 없이 현재
회귀 검증 근거를 요구하고, `NOT_APPLICABLE`은 `N/A`, 비어 있지 않은 적용 제외 사유와 대체 검증
근거를 요구한다. 실행 Context와 모순되는 정책이나 증거를 제출하지 않는다.
- `existing_without_evidence`: 검증된 TDD 근거가 없는 기존 구현이다. Red 실패나 TDD 근거를 조작하지 말고 필요한 사람 검토를 보고한다.

`decision_correction`에 값이 있으면 구현을 변경하거나 검증을 다시 실행하지 않는다. 전달된 객관적 근거를 유지하고 최종 판정만 교정한다.

Worker phase를 명시적으로 전환할 때에는 부모가 제공한 loopback 수집 경로만 사용해
`"$FLOW_BI_PYTHON_EXECUTABLE" -m worker_runner.phase_marker <phase>`를 실행한다.
phase는 `analysis`, `test_code`, `implementation`, `implementation_and_test`, `refactor`,
`documentation`, `verification`, `finalization` 중 하나여야 한다. `.codex-logs`에 직접 쓰거나
`FLOW_BI_WORKER_EVENT_URL`, `FLOW_BI_WORKER_EVENT_TOKEN`을 출력하지 않는다.

`REQUIRED` 본 작업은 탐색 전에 `analysis`, Red 테스트 전 `test_code`, 구현 전 `implementation`
(불가분이면 `implementation_and_test`), 검증 전 `verification`, 결과 작성 전 `finalization` marker를
기록한다. 수행하지 않는 refactor·documentation phase는 만들지 않으며, 결과 수집·판정 교정은 허위 구현 phase를 기록하지 않는다.

각 전환 직전에 다음처럼 실제 phase 이름을 인자로 전달한다:
`"$FLOW_BI_PYTHON_EXECUTABLE" -m worker_runner.phase_marker analysis`,
`"$FLOW_BI_PYTHON_EXECUTABLE" -m worker_runner.phase_marker test_code`,
`"$FLOW_BI_PYTHON_EXECUTABLE" -m worker_runner.phase_marker implementation`,
`"$FLOW_BI_PYTHON_EXECUTABLE" -m worker_runner.phase_marker verification`,
`"$FLOW_BI_PYTHON_EXECUTABLE" -m worker_runner.phase_marker finalization`.
