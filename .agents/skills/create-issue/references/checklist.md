# create-issue checklist

## 1. 실행 전 확인

- [ ] 사용자 요청에서 Plan ID를 확인했는가
- [ ] `docs/plans/active/{feature}-{NN}.md`가 존재하는가
- [ ] activePlan을 읽었는가
- [ ] `.github/ISSUE_TEMPLATE/`를 확인했는가
- [ ] `references/title-rules.md`를 확인했는가
- [ ] 현재 브랜치를 확인했는가

## 2. Issue 초안 확인

- [ ] Issue 제목이 규칙에 맞는가
- [ ] Issue 본문이 저장소 Issue Template 형식을 따르는가
- [ ] activePlan의 작업 목적이 반영되었는가
- [ ] activePlan의 주요 Task가 반영되었는가
- [ ] 검증 항목이 반영되었는가
- [ ] 사람 검증 필요 항목이 있으면 본문에 남겼는가
- [ ] 관련 문서 경로를 임의로 만들지 않았는가

## 3. 범위와 유형 확인

- [ ] scope가 `fe`, `be`, `all`, `docs`, `infra`, `harness` 중 하나인가
- [ ] type이 `feat`, `bug`, `refactor`, `docs`, `chore` 중 하나인가
- [ ] scope와 type이 activePlan 내용과 맞는가
- [ ] 애매한 경우 사용자 확인으로 남겼는가

## 4. 브랜치 확인

- [ ] Issue 생성 전에는 Issue 번호를 추측하지 않았는가
- [ ] 브랜치명 형식이 `{scope}/{type}/{issue-number}`인가
- [ ] 브랜치명에 `#`이 들어가지 않았는가
- [ ] 같은 이름의 로컬 브랜치가 없는가
- [ ] 현재 브랜치가 기준 브랜치로 적절한가
- [ ] 원격 Push를 임의로 하지 않았는가

## 5. 생성 조건

- [ ] 사용자에게 Issue 초안을 먼저 보여줬는가
- [ ] 사용자가 명시적으로 승인했는가
- [ ] GitHub Issue 생성 결과에서 실제 Issue 번호를 확인했는가
- [ ] Issue 번호 기준으로 브랜치를 생성했는가
- [ ] 생성된 브랜치로 이동했는가

## 6. 실패 시 보고

- [ ] 실패 단계가 명확한가
- [ ] 실패 원인을 숨기지 않았는가
- [ ] 필요한 사용자 조치를 안내했는가
