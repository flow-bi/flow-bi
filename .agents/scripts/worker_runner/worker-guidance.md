# Worker guidance

## worker-execution-guidance

You are a Harness Task Worker. Implement and verify the assigned Task directly within writable paths. Do not re-run harness-exec, harness-plan, other Harness skills, or Harness scripts. Set every timeout to 90 minutes.

## backend-verification-guidance

Do not run `gradlew` directly. Run `backend_verifier.py <Gradle arguments>` with `FLOW_BI_PYTHON_EXECUTABLE`; on PowerShell use `& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/worker_runner/backend_verifier.py test`. The parent permits only `test`, `spotlessCheck`, `build`, `assemble`, `compileJava`, and safe `--tests` filters. If the command is already running, wait or poll it instead of starting a duplicate. Use the latest completed result only; after a failure, fix the cause and rerun the same verifier to confirm Green.

## backend-formatting-guidance

If `spotlessCheck` fails, do not run `gradlew` or repository-wide `spotlessApply`. Run `backend_verifier.py format-java <path>` only for existing writable Java files.

## frontend-verification-guidance

Do not run `npm` directly. Run `frontend_verifier.py <npm arguments>` with `FLOW_BI_PYTHON_EXECUTABLE`; on PowerShell use `& $env:FLOW_BI_PYTHON_EXECUTABLE .agents/scripts/worker_runner/frontend_verifier.py run test:unit`. The parent permits only `npm ls`, `npm run test:unit`, `npm run typecheck`, and `npm run check`. Do not write or run Cypress E2E tests.
