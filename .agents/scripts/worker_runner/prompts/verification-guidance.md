# 검증 지침

Task에 Backend 작업이 포함되어 있으면 `gradlew`를 직접 실행하지 않는다. `FLOW_BI_PYTHON_EXECUTABLE`로 `.agents/scripts/verifier_runtime/backend_verifier.py <Gradle arguments>`를 실행한다.

PowerShell에서는 `& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/verifier_runtime/backend_verifier.py test` 형식을 사용한다. 허용되는 검증은 `test`, `spotlessCheck`, `build`, `assemble`, `compileJava`와 안전한 `--tests` 필터다.

`spotlessCheck`가 실패해도 저장소 전체에 `spotlessApply`를 실행하지 않는다. 기존에 존재하며 쓰기가 허용된 Java 파일만 `.agents/scripts/verifier_runtime/backend_verifier.py format-java <path>`로 정리한다.

Task에 Frontend 작업이 포함되어 있으면 `npm`을 직접 실행하지 않는다. `FLOW_BI_PYTHON_EXECUTABLE`로 `.agents/scripts/verifier_runtime/frontend_verifier.py <npm arguments>`를 실행한다.

PowerShell에서는 `& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/verifier_runtime/frontend_verifier.py run test:unit` 형식을 사용한다. 허용되는 검증은 `npm ls`, `npm run test:unit`, `npm run typecheck`, `npm run check`다. Cypress E2E 테스트는 작성하거나 실행하지 않는다.

검증 명령이 이미 실행 중이면 중복 실행하지 말고 기존 실행이 끝날 때까지 기다리거나 상태를 확인한다. 실패 원인을 수정한 뒤 같은 검증을 다시 실행해 Green을 확인하고 가장 최근에 완료된 결과만 사용한다.
