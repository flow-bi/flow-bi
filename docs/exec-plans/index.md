# exec-plans/index.md

`exec-plans/`는 "이번에 뭘 만들 건지"를 실행 단위 체크리스트로 관리하는 폴더다. `product-specs/`가 "무엇을 만드는가", `design-docs/`가 "왜 이렇게 만드는가"라면, `exec-plans/`는 "지금 당장 어떤 순서로 만드는가"를 다룬다.

## 현재 운영 방식 (3인 개인 실험 단계 기준)

지금은 도메인별 담당자가 배정되지 않고, 3명이 각자 전체 구조를 한 번씩 구현해보며 검증하는 단계다(AGENTS.md 8번, ARCHITECTURE.md 8번 참고). 따라서 `active/`의 각 도메인별 계획 문서는 **특정 담당자 전용이 아니라, 누가 그 도메인을 작업하든 따라갈 수 있는 공통 체크리스트**로 작성한다.

담당자 배정이 확정되면:
1. 각 계획 문서 상단에 담당자를 명시한다.
2. 이 문서(`index.md`)에 담당자 배정 현황 표를 추가한다.

## 폴더 구조

| 폴더/파일 | 용도 |
|---|---|
| `active/` | 현재 진행 중인 도메인별 실행 계획 |
| `completed/` | 완료되어 더 이상 참조할 필요 없는 계획 (이력용 보관) |
| `tech-debt-tracker.md` | 구현하면서 미룬 결정, 알려진 이슈, 기술 부채 추적 |

## active/ 문서 목록

| 문서 | 대응 도메인 | 근거 product-specs |
|---|---|---|
| `auth-domain.md` | `auth` | `login.md` |
| `user-domain.md` | `user` | `user-profile.md`, `org-chart.md` |
| `schedule-domain.md` | `schedule` | `schedule.md`, `dashboard.md`(일부) |
| `meetingroom-domain.md` | `meetingroom` | `meeting-room.md` |
| `frontend-mvp1.md` | 프론트엔드 전체 | `header.md`, `theme.md`, `admin.md`, 각 도메인 화면 |

각 계획이 완료되면 `active/`에서 `completed/`로 옮기고, 완료일과 실제 담당자를 파일 상단에 기록한다.