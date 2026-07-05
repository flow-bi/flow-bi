# dashboard.md

**대응 도메인**: `schedule` (일부), 프론트 전용 (일부)
**대응 화면**: 화면/기능 설계서 1-2. 대시보드
**관련 FR**: 명시적 FR 매핑 없음 (AI 요약 부분은 FR-029~035 AI 비서 영역과 연관되나 MVP2)

## 화면 구성 (확정)

| 요소 | MVP1 처리 |
|---|---|
| AI가 오늘 일정을 줄글로 정리 | **디자인만** (기능 없음) |
| 주간 일정 | **실기능** — `schedule` 도메인 API 재사용 |
| 오늘의 일정 | **실기능** — `schedule` 도메인 API 재사용 |
| 팀원들 상태 | **실기능** — `user` 도메인 API 재사용 |

## 구현 방식 (확정)

AI 요약을 제외한 세 위젯은 이미 존재하는 API를 그대로 재사용해 실데이터로 구현한다. 별도의 대시보드 전용 API를 새로 만들 필요는 없다(아래 참고).

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/schedules?view=week` | 주간 일정 (기존 `schedule.md` API 재사용) |
| GET | `/api/v1/schedules?view=day&date=today` | 오늘의 일정 (기존 API 재사용) |
| GET | `/api/v1/teams/{teamId}/members` | 팀원 상태 (기존 `org-chart.md` API 재사용) |

AI 요약 관련 API는 정의하지 않는다(MVP2 대상, `docs/product-specs/index.md`의 이연 목록 참고).