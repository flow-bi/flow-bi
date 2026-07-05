# exec-plans/active/schedule-domain.md

**상태**: 미착수
**담당자**: 미배정
**근거 문서**: `product-specs/schedule.md`, `product-specs/dashboard.md`, `design-docs/schedule-sharing-model.md`

---

## 범위

일정 CRUD, 캘린더 조회(월/주/일), 대시보드의 주간·오늘 일정 위젯(AI 요약 제외). 회의실 예약과의 연동 지점(자동 일정 생성)은 `meetingroom-domain.md`와 함께 조율한다.

## 선행 확인 필요

- [ ] "회의실 일정" 등록 흐름이 캘린더/회의실 중 어디서만 가능한지 최종 확정 (`schedule.md` 남은 이슈 3번)

## 백엔드 체크리스트

### DB / Entity
- [ ] `schedules`(`color_label` 컬럼 포함), `schedules_details`, `schedule_targets`, `projects`, `projects_members` 마이그레이션
- [ ] `schedule_targets`의 4개 FK 컬럼 Nullable 반영 확인 (`db-schema.md` 확정 사항)
- [ ] 엔티티 작성, `schedule_type`/`visibility` enum 매핑 (`PERSONAL`/`TEAM`/`PROJECT`, `PUBLIC`/`PRIVATE`/`TEAM_ONLY`)

### Repository
- [ ] `ScheduleRepository`, `ScheduleDetailRepository`, `ScheduleTargetRepository`
- [ ] 캘린더 조회용 복합 쿼리 (본인 등록 + USER 타겟 + TEAM 타겟(teams_closure 조인) + PROJECT 타겟(projects_members 조인)) — `schedule-sharing-model.md` "조회 시 성능 고려사항" 참고
- [ ] 위 쿼리에 필요한 인덱스 설계 (`schedule_targets(schedule_id, target_type, user_id)` 등)

### Service
- [ ] 일정 생성: `schedules` + `schedules_details` + (공유 대상 있으면) `schedule_targets` 동시 생성, 참석자 검증(`user` 도메인 조회 서비스 사용)
- [ ] 일정 수정/삭제: `creator_id` 권한 검증
- [ ] `meetingroom` 도메인이 호출할 "일정 자동 생성/삭제" 서비스 인터페이스 노출 (FR-021 연동)
- [ ] 대시보드용 주간/오늘 일정 조회는 기존 캘린더 조회 서비스 재사용 (신규 API 불필요, `dashboard.md` 확정 사항)

### Controller / DTO
- [ ] `GET /api/v1/schedules?view=month|week|day&date=`
- [ ] `GET /api/v1/schedules/{scheduleId}`
- [ ] `POST /api/v1/schedules`
- [ ] `PATCH /api/v1/schedules/{scheduleId}`
- [ ] `DELETE /api/v1/schedules/{scheduleId}`

## 프론트엔드 체크리스트

- [ ] `features/schedule/calendar/` — 월/주/일 캘린더 뷰, 날짜 클릭 시 우측 배너, 일정 클릭 시 모달
- [ ] 일정 추가 모달 — 기본 일정/회의실 일정 선택, 색상 라벨, 공개 범위(팀/프로젝트 선택 시 참석자 추가와 유사하게 처리 — `schedule.md` 참고)
- [ ] `features/schedule/dashboard-widgets/` — 주간 일정, 오늘의 일정 위젯 (실기능, 기존 API 재사용). AI 요약 자리는 정적 목업만 배치.

## 테스트 (임시 항목)
- [ ] 공유 대상(USER/TEAM/PROJECT) 조합별로 캘린더 조회에 정확히 포함되는지
- [ ] NFR-003(3초 이내) 기준 충족 여부 — 시딩 데이터 100명 + 임의 일정 대량 생성 후 측정
- [ ] `color_label`, `schedule_type`, `visibility` 값이 올바르게 저장/조회되는지