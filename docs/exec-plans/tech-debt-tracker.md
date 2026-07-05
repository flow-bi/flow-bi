# exec-plans/tech-debt-tracker.md

구현하면서 "지금은 넘어가지만 나중에 다시 봐야 하는" 항목을 여기 모은다. 새로 발생하면 추가하고, 해결되면 완료일과 함께 하단 "해결됨" 섹션으로 옮긴다.

---

## 진행 중 / 미해결

| 항목 | 내용 | 관련 문서 | 심각도 |
|---|---|---|---|
| 알림 설정 화면 부재 | FR-026~028이 요구사항정의서엔 있으나 화면설계서 9개 화면 목록에 없음. MVP1 제외인지 누락인지 미확인 | `product-specs/index.md` | 중 |
| "회의실 일정" 등록 흐름 미확정 | 캘린더 "일정 추가"와 회의실 "예약하기"가 같은 결과인지, 진입점을 하나로 할지 | `product-specs/schedule.md` | 중 |
| 배포 환경/CI-CD 미정 | 어디에 배포할지, 파이프라인 여부 결정 안 됨 | `ARCHITECTURE.md` 8번, `RELIABILITY.md` 6번, `SECURITY.md` 9번 | 중 |
| 테스트 전략 미정 | 커버리지 목표, 통합 테스트 범위 등 | `ARCHITECTURE.md` 8번, `QUALITY_SCORE.md` 6번 | 중 |
| 도메인 담당자 배정 미정 | 현재 3인 개인 실험 단계 | `AGENTS.md` 8번 | 낮음 (의도적 보류) |
| 예약 팀 표시 로직 가정 | `rooms_reservations`에 팀 컬럼이 없어 join으로 추정 표시하기로 가정, 확정 아님 | `product-specs/meeting-room.md` | 낮음 |
| 로그인 시도 제한 미구현 | 무차별 대입 공격 방지 임계치/구현 여부 미정 | `SECURITY.md` 8번 | 낮음 (MVP1 필수 아님) |
| 회의실 예약 권한 범위 가정 | 수정/취소를 예약자 본인만 가능하게 할지, 팀 전체 가능하게 할지 확인 필요 | `SECURITY.md` 5번 | 낮음 |

## 알려진 성능 리스크 (구현 후 반드시 재확인)

| 항목 | 내용 | 관련 문서 |
|---|---|---|
| 캘린더 조회 쿼리 | USER/TEAM/PROJECT 공유 대상을 모두 OR로 합치는 쿼리, NFR-003(3초) 기준 실측 필요 | `design-docs/schedule-sharing-model.md` |
| 회의실 예약 동시성 | 겹침 검증을 서비스 레이어에서 하므로 동시 요청 시 레이스 컨디션 가능성. 대응 방안(비관적 락)은 `RELIABILITY.md` 3번에서 결정됨 — 실제 구현 후 재확인 필요 | `db-schema.md`, `product-specs/meeting-room.md`, `RELIABILITY.md` |

---

## 해결됨

- **Access/refresh token 만료시간 미정** — `SECURITY.md` 2번에서 확정 (access 30분, refresh 14일, 로테이션 + 재사용 탐지). 해결일: 문서 작성 시점(SECURITY.md 작성 완료).