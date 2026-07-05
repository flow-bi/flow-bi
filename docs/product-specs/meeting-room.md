# meeting-room.md

**대응 도메인**: `meetingroom`
**대응 화면**: 화면/기능 설계서 1-6. 회의실
**관련 FR**: FR-019(목록 조회), FR-020(예약), FR-021(일정 자동 생성), FR-022(예약 수정), FR-023(예약 취소)

## 기능 요구사항

### 회의실 목록/현황 조회 (FR-019)
- 회의실 목록: 이름, (사진), 수용 인원, 장비(텍스트).
- 회의실 현황: 목록과 함께 회의실별 예약 현황을 **시간대(9:00~18:00) 가로축**으로 표시. 표시 정보는 예약 제목, 시간대, 예약 팀.
- 검색: 수용인원/날짜/시간대/상태로 검색하며, **필터링이 아니라 우선순위 재정렬** 방식이다 (검색 조건에 안 맞아도 목록에서 사라지지 않고 순서만 밀림).

### 회의실 예약 (FR-020, FR-021)
- 회의실 선택 → 우측 배너에서 예약 입력: 선택된 회의실 정보, 날짜, 시간대, 참석자(이름 검색 추가), 회의 일정 상세 설명.
- 예약 완료 시 `schedules` + `rooms_reservations`가 동시에 생성되어 캘린더에도 표시된다(FR-021, `schedule.md` 참고).

### 예약 수정/취소 (FR-022, FR-023)
- 예약 정보 수정 시 연동된 `schedules`도 함께 갱신되어야 한다 (ARCHITECTURE.md 3.2 도메인 의존 방향: `meetingroom` → `schedule` 참고).
- 취소 시 `rooms_reservations.status`를 `CANCELLED`로, `cancelled_at`을 기록. 연동된 `schedules`도 삭제 또는 취소 처리한다(아래 미해결 이슈 참고).

## 미해결 이슈

### 1. 예약 취소 시 연동 일정(schedules) 처리 방식 (확정)

예약 취소 시 연동된 `schedules`도 **함께 삭제**한다. 캘린더에서도 해당 일정이 사라진다. 취소 이력 자체는 `rooms_reservations.status='CANCELLED'`, `cancelled_at`에만 남고, `schedules`/`schedules_details`는 하드 삭제한다.

### 2. "예약 팀" 표시 항목의 데이터 출처
회의실 현황판에 "예약 팀"을 표시해야 하는데, `rooms_reservations` 테이블에는 팀 정보 컬럼이 없다. 예약자(`schedules.creator_id`)의 소속팀(`users.team_id`)을 join해서 보여주는 것으로 추정된다.

**가정(확인 필요)**: 별도 컬럼 추가 없이, 조회 시 `rooms_reservations → schedules.creator_id → users.team_id → teams.team_name`을 join하여 표시한다.

## API 개요 (초안)

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/rooms?capacity=&date=&timeRange=&status=` | 회의실 목록 + 검색(우선순위 재정렬) |
| GET | `/api/v1/rooms/{roomId}/reservations?date=` | 특정 회의실의 일자별 예약 현황 (시간대 그리드용) |
| POST | `/api/v1/rooms/{roomId}/reservations` | 예약 생성 (내부적으로 `schedules` 도메인 서비스 호출하여 일정 자동 생성) |
| PATCH | `/api/v1/rooms/reservations/{reservationId}` | 예약 수정 (연동 일정도 함께 갱신) |
| DELETE | `/api/v1/rooms/reservations/{reservationId}` | 예약 취소 |

### 예약 시간 중복 검증
`db-schema.md`에서 확정한 대로, DB 제약이 아닌 서비스 레이어에서 동일 `room_id`의 겹치는 시간대를 조회 후 검증한다.