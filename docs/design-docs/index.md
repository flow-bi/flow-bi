# design-docs/index.md

`design-docs/`는 "무엇을 만드는가"(product-specs)가 아니라 "왜 이렇게 설계했는가"를 기록하는 폴더다. 코드나 스펙이 바뀌어도 여기 적힌 판단 근거는 쉽게 바뀌지 않아야 한다. AI가 새 기능을 설계하거나 기존 설계를 변경할 때, 여기 문서들과 충돌하는 방향으로 가려면 먼저 이 문서를 갱신하고 팀 합의를 거쳐야 한다.

## 문서 목록

| 문서 | 내용 |
|---|---|
| `core-beliefs.md` | 이 프로젝트 전반에 걸친 설계 원칙 |
| `schedule-sharing-model.md` | 일정-공유 대상(schedule_targets)의 다형적 구조와 그 이유 |