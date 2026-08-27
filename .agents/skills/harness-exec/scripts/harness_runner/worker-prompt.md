# Harness worker prompt

## discovery-guidance

Find repository instruction files with `rg --files -g AGENTS.md`; do not recursively search build or Gradle cache directories.

## context-efficiency-guidance

Fix target files and required regions during initial discovery. Do not reread unchanged regions. Apply related changes in large patches, inspect a full diff only once at the end, and keep failure-log inspection bounded to the relevant cause.

## execution-context

Execution context (validated by the runner):

## execution-rerun

This is a rerun of the same Task fingerprint. Reuse supplied verified TDD evidence only, run current regression checks, and record reused and current verification evidence.

## execution-new-or-changed

This Task is new or changed. Do not reuse past TDD evidence. Perform Red, Green, and Refactor for this revision and record each stage and current verification evidence.

## execution-existing-without-evidence

This is existing implementation without verified TDD evidence. Do not manufacture a Red failure or report TDD PASS; report the required human review outcome instead.

## decision-correction

This is a decision-correction request. Do not change implementation or rerun validation. Preserve the supplied objective evidence and return only one corrected JSON object.

## result-contract

Return exactly one valid JSON object, with no Markdown fence or additional text.
{"task_id":"Task {{TASK_NUMBER}}","work_summary":"summary","mandatory_gates":{"permission_security":{"result":"PASS | FAIL","evidence":"evidence"},"scope":{"result":"PASS | FAIL","evidence":"evidence"},"requirements":{"result":"PASS | FAIL","evidence":"evidence"},"tdd":{"result":"PASS | FAIL | N/A","evidence":"evidence","reason":"reason","reused_evidence":{"record_id":null,"fingerprint":null},"current_verification_evidence":"evidence"},"automated_verification":{"result":"PASS | FAIL","evidence":"evidence"},"contract_sync":{"result":"PASS | FAIL","evidence":"evidence"},"critical_findings":{"result":"PASS | FAIL","evidence":"evidence"}},"verification":{{VERIFICATION_ITEMS}},"remaining_issues":[],"decision":"PASS | PASS_WITH_FOLLOW_UP | RETRY | HUMAN_REVIEW_REQUIRED | FAILED | BLOCKED","final_status":"PASS | FAILED | BLOCKED","quality_score":0}
