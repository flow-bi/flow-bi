# Harness 작업 실행자 준비 프롬프트

## discovery-guidance

`rg --files -g AGENTS.md`로 저장소 지침 파일을 찾는다. `build` 디렉터리나 Gradle 캐시 디렉터리를 재귀적으로 탐색하지 않는다.

## context-efficiency-guidance

초기 탐색에서 대상 파일과 필요한 구간을 확정한다. 변경되지 않은 구간을 다시 읽지 않는다. 관련 변경은 큰 패치 단위로 적용하고 전체 변경 내역은 마지막에 한 번만 확인한다. 실패 로그는 관련 원인을 확인하는 데 필요한 범위로 제한한다.

## execution-context

실행 컨텍스트이며 실행기가 검증한 값이다:

## execution-rerun

동일한 Task fingerprint에 대한 재실행이다. 전달받은 검증 완료 TDD 근거만 재사용하고 현재 회귀 검증을 실행한다. 재사용한 근거와 현재 검증 근거를 모두 기록한다.

## execution-new-or-changed

신규 또는 변경된 Task다. 과거 TDD 근거를 재사용하지 않는다. 현재 변경본을 대상으로 Red, Green, Refactor를 수행하고 각 단계와 현재 검증 근거를 기록한다.

## execution-existing-without-evidence

검증된 TDD 근거가 없는 기존 구현이다. Red 실패를 조작하거나 TDD를 PASS로 보고하지 않는다. 대신 필요한 사람 검토 결과를 보고한다.

## decision-correction

판정 교정 요청이다. 구현을 변경하거나 검증을 다시 실행하지 않는다. 전달받은 객관적 근거를 유지하고 교정된 JSON 객체 하나만 반환한다.

## result-contract

Markdown 코드 블록이나 추가 문장 없이 유효한 JSON 객체 하나만 반환한다.
{"task_id":"Task {{TASK_NUMBER}}","work_summary":"작업 요약","mandatory_gates":{"permission_security":{"result":"PASS | FAIL","evidence":"근거"},"scope":{"result":"PASS | FAIL","evidence":"근거"},"requirements":{"result":"PASS | FAIL","evidence":"근거"},"tdd":{"result":"PASS | FAIL | N/A","evidence":"근거","reason":"사유","reused_evidence":{"record_id":null,"fingerprint":null},"current_verification_evidence":"현재 검증 근거"},"automated_verification":{"result":"PASS | FAIL","evidence":"근거"},"contract_sync":{"result":"PASS | FAIL","evidence":"근거"},"critical_findings":{"result":"PASS | FAIL","evidence":"근거"}},"verification":{{VERIFICATION_ITEMS}},"remaining_issues":[],"decision":"PASS | PASS_WITH_FOLLOW_UP | RETRY | HUMAN_REVIEW_REQUIRED | FAILED | BLOCKED","final_status":"PASS | FAILED | BLOCKED","quality_score":0}
