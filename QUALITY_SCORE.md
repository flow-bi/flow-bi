# QUALITY_SCORE.md

이 문서는 "다 만들었다"를 판단하는 구체적이고 측정 가능한 기준을 정의한다. AI가 작업을 마쳤다고 보고하기 전에 아래 체크리스트를 스스로 확인해야 한다.

---

## 1. 성능 기준 (요구사항정의서 NFR 기준)

| 항목 | 기준 | 근거 |
|---|---|---|
| 캘린더 조회 응답 시간 | 3초 이내 | NFR-003 |
| AI 질의 응답 시간 | 평균 5초 이내 | NFR-004 (MVP2 대상이라 MVP1에서는 측정 불필요) |
| 회의실 현황 조회 | 명시적 NFR 없음, 캘린더와 동일하게 3초 이내를 잠정 목표로 적용 |  |

캘린더 조회는 `design-docs/schedule-sharing-model.md`에서 지적한 대로 USER/TEAM/PROJECT 공유 대상을 모두 합치는 쿼리라 성능 리스크가 크다. **시딩 데이터 100명 규모 + 일정 대량 생성 후 실측**하는 것을 MVP1 완료 조건에 포함한다(`exec-plans/active/schedule-domain.md` 테스트 항목과 연결).

## 2. Definition of Done (도메인별 기능 하나를 "완료"로 보는 기준)

아래 항목을 모두 만족해야 완료로 간주한다. 하나라도 빠지면 `exec-plans/tech-debt-tracker.md`에 등록하고 완료로 보고하지 않는다.

- [ ] API 응답이 Envelope 패턴(`success/data/message`, `error.code/message/details`)을 따른다 (AGENTS.md 5.1)
- [ ] 모든 컨트롤러 엔드포인트에 `@Operation` 어노테이션이 달려 springdoc 문서에 노출된다 (AGENTS.md 5.3)
- [ ] 도메인 간 참조가 서비스 레이어를 통해서만 이루어진다 — 다른 도메인의 Repository/Entity를 직접 import하지 않았는지 확인 (ARCHITECTURE.md 3.2)
- [ ] 프론트엔드 상태가 `FRONTEND.md` 3번 표의 기준대로 배치되었다 (임의로 Zustand에 서버 데이터를 두지 않았는지 등)
- [ ] 폼이 있다면 React Hook Form + Zod로 구현되었고, 백엔드 enum과 프론트 Zod enum 값이 일치한다
- [ ] `product-specs/`의 해당 기능 문서에 있는 "확정 사항"이 코드에 정확히 반영되었다 (예: `schedule.md`의 visibility/schedule_targets 처리 방식)
- [ ] 관련된 미해결 이슈가 있다면 `exec-plans/tech-debt-tracker.md`에 등록되어 있다

## 3. 코드 품질 게이트

- **타입 안전성**: TypeScript `any` 사용 금지(불가피한 경우 이유를 주석으로 명시). Java는 raw type 사용 금지.
- **Lint/포맷**: 프론트엔드 ESLint + Prettier, 백엔드는 팀 컨벤션에 맞는 포맷터(구체 도구는 `frontend-mvp1.md`/도메인별 exec-plan에서 착수 시 정한다 — 아직 미정)
- **네이밍**: `FRONTEND.md` 8번, `AGENTS.md` 6번 컨벤션 준수

## 4. 접근성 기준

`DESIGN.md` 7번, `FRONTEND.md` 10번에서 정의한 접근성 체크리스트를 기능 구현 시 함께 확인한다. 별도 접근성 감사 도구(axe 등) 도입 여부는 아직 정하지 않았다.

## 5. 리뷰 기준 (`AGENTS.md` 8번과 연결)

담당자 배정 전(현재 개인 실험 단계)에는 셀프 체크로 위 항목을 확인한다. 담당자 배정 후에는 PR 리뷰 시 이 문서의 체크리스트를 리뷰어가 함께 확인한다.

## 6. 아직 정하지 않은 것 (구현 착수 전 결정 필요)

- 테스트 커버리지 목표 수치 (`exec-plans/tech-debt-tracker.md`에 이미 등록됨)
- CI에서 이 체크리스트를 자동으로 강제할지, 수동 체크로 둘지
- 프론트엔드/백엔드 포맷터·린터 구체 도구 선택

이 항목들이 정해지면 이 문서를 갱신한다.