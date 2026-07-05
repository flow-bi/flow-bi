# exec-plans/active/meetingroom-domain.md

**상태**: MVP1 기본 구현 완료 (성능/동시성 실측은 후속 검증 필요)
**담당자**: 미배정
**근거 문서**: `product-specs/meeting-room.md`

---

## 범위

회의실 목록/현황 조회, 예약, 예약 수정/취소. `schedule` 도메인과의 연동(자동 일정 생성/삭제)이 핵심 의존 지점이다.

## 선행 확인 필요

- [x] `schedule-domain.md`에서 "일정 자동 생성/삭제" 서비스 인터페이스가 먼저 노출되어야 이 도메인의 예약 생성/취소 로직을 완성할 수 있다. 두 도메인 작업 순서를 조율할 것.

## 백엔드 체크리스트

### DB / Entity
- [x] `rooms`, `rooms_reservations` 마이그레이션
- [x] `Room`, `RoomReservation` 엔티티 작성

### Repository
- [x] `RoomRepository` — 수용인원/상태 등 검색 조건에 따른 우선순위 재정렬 쿼리 (필터링이 아닌 정렬임에 주의, `meeting-room.md` 참고)
- [x] `RoomReservationRepository` — 특정 회의실의 특정 날짜 예약 목록(시간대 그리드용), 겹침 여부 조회 쿼리

### Service
- [x] 예약 생성: 겹침 검증(서비스 레이어, DB 제약 아님 — `db-schema.md` 확정 사항) → `schedule` 도메인 서비스 호출해 일정 자동 생성 → `rooms_reservations` 저장, `schedule_id` 연결
- [x] 예약 수정: 시간 변경 시 겹침 재검증 + 연동된 `schedules` 갱신
- [x] 예약 취소: `rooms_reservations.status='CANCELLED'`, `cancelled_at` 기록 + 연동된 `schedules` **하드 삭제** (`meeting-room.md` 확정 사항)
- [x] 예약 팀 표시용 조회: `schedules.creator_id → users.team_id → teams.team_name` join (`meeting-room.md` 확정 사항)

### Controller / DTO
- [x] `GET /api/v1/rooms?capacity=&date=&timeRange=&status=`
- [x] `GET /api/v1/rooms/{roomId}/reservations?date=`
- [x] `POST /api/v1/rooms/{roomId}/reservations`
- [x] `PATCH /api/v1/rooms/reservations/{reservationId}`
- [x] `DELETE /api/v1/rooms/reservations/{reservationId}`

## 프론트엔드 체크리스트

- [x] `features/meetingroom/list/` — 회의실 목록 + 검색(우선순위 재정렬 UX 주의)
- [x] `features/meetingroom/status-board/` — 시간대(9~18시) 가로축 예약 현황 그리드
- [x] `features/meetingroom/reservation/` — 예약 우측 배너(회의실 정보, 날짜, 시간대, 참석자 검색, 상세 설명)

## 테스트 (임시 항목)
- [x] 동일 시간대 중복 예약 시도 시 거부되는지 (동시 요청 포함)
- [x] 예약 취소 시 캘린더에서 일정이 실제로 사라지는지
- [x] 예약 수정 시 캘린더 일정도 함께 갱신되는지
