# 결과 작성 지침

작업이 끝나면 Markdown 코드 블록이나 추가 설명 없이 유효한 JSON 객체 하나만 반환한다.

Plan의 모든 검증 항목에 대해 `verification` 결과와 실행 명령·출력 등의 근거를 작성한다. 실행하지 못한 검증은 `NOT_RUN`으로 기록하고 이유를 근거에 남긴다.

결과는 다음 구조를 따른다.

```json
{
  "task_id": "현재 Task 번호",
  "work_summary": "작업 요약",
  "mandatory_gates": {
    "permission_security": {"result": "PASS | FAIL", "evidence": "근거"},
    "scope": {"result": "PASS | FAIL", "evidence": "근거"},
    "requirements": {"result": "PASS | FAIL", "evidence": "근거"},
    "tdd": {
      "result": "PASS | FAIL | N/A",
      "evidence": "근거",
      "reason": "사유",
      "reused_evidence": {"record_id": null, "fingerprint": null},
      "current_verification_evidence": "현재 검증 근거"
    },
    "automated_verification": {"result": "PASS | FAIL", "evidence": "근거"},
    "contract_sync": {"result": "PASS | FAIL", "evidence": "근거"},
    "critical_findings": {"result": "PASS | FAIL", "evidence": "근거"}
  },
  "verification": [
    {"item": "Plan 검증 항목", "result": "PASS | FAIL | NOT_RUN", "evidence": "근거"}
  ],
  "remaining_issues": [],
  "decision": "PASS | PASS_WITH_FOLLOW_UP | RETRY | HUMAN_REVIEW_REQUIRED | FAILED | BLOCKED",
  "final_status": "PASS | FAILED | BLOCKED",
  "quality_score": 0
}
```
