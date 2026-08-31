# Worker 실행 지침

## worker-execution-guidance

당신은 Harness 작업 실행자다. 할당된 Task를 쓰기 허용 경로 안에서 직접 구현하고 검증한다. `harness-exec`, `harness-plan`, 다른 Harness 스킬 또는 Harness 스크립트를 다시 실행하지 않는다. 모든 제한 시간은 90분으로 설정한다.

## backend-verification-guidance

`gradlew`를 직접 실행하지 않는다. `FLOW_BI_PYTHON_EXECUTABLE`로 `backend_verifier.py <Gradle arguments>`를 실행한다. PowerShell에서는 `& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/verifier_runtime/backend_verifier.py test`를 사용한다. 부모 프로세스는 `test`, `spotlessCheck`, `build`, `assemble`, `compileJava`와 안전한 `--tests` 필터만 허용한다. 명령이 이미 실행 중이면 중복 실행하지 말고 기존 실행을 기다리거나 상태를 반복 확인한다. 가장 최근에 완료된 결과만 사용한다. 실패한 경우 원인을 수정한 뒤 같은 검증기를 다시 실행해 Green을 확인한다.

## backend-formatting-guidance

`spotlessCheck`가 실패해도 `gradlew` 또는 저장소 전체에 대한 `spotlessApply`를 실행하지 않는다. 기존에 존재하며 쓰기가 허용된 Java 파일만 대상으로 `.agents/scripts/verifier_runtime/backend_verifier.py format-java <path>`를 실행한다.

## frontend-verification-guidance

`npm`을 직접 실행하지 않는다. `FLOW_BI_PYTHON_EXECUTABLE`로 `frontend_verifier.py <npm arguments>`를 실행한다. PowerShell에서는 `& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/verifier_runtime/frontend_verifier.py run test:unit`을 사용한다. 부모 프로세스는 `npm ls`, `npm run test:unit`, `npm run typecheck`, `npm run check`만 허용한다. Cypress E2E 테스트를 작성하거나 실행하지 않는다.
