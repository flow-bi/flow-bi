# schedule.md

**대응 도메인**: `schedule`
**대응 화면**: 화면/기능 설계서 1-4. 캘린더 (+ 1-2. 대시보드 일부, `dashboard.md` 참고)
**관련 FR**: FR-011~FR-013(조회), FR-014~FR-016(등록), FR-017(수정), FR-018(삭제)
**관련 NFR**: NFR-003(캘린더 조회 응답 3초 이내)

## 기능 요구사항

### 조회 (FR-011~013)
- 월간 / 주간 / 일간 단위로 일정을 조회할 수 있다.
- 캘린더 화면 첫 진입 시 **월간 캘린더**가 기본이며, 월간/주간/일간 전환 가능.
- 특정 날짜 클릭 → 해당 날짜의 일간 일정 목록을 우측 배너로 표시.
- 특정 일정 클릭(일간 뷰) → 일정 상세를 모달로 표시.

### 등록 (FR-014~016)
일정 추가 시 아래 두 종류 중 선택:
1. **기본 일정** — 순수 `schedules`/`schedules_details`만 사용
2. **회의실 일정** — 등록 시 회의실 예약이 함께 이루어짐 (`meeting-room.md`의 FR-021과 연동, 실제 입력은 회의실 화면에서 처리하고 캘린더에는 결과가 표시되는 흐름으로 이해됨 — 아래 미해결 이슈 참고)

일정 속성 (화면설계서 1-4 "일정 추가" 모달 기준):

| 속성 | 대응 테이블/컬럼 |
|---|---|
| 일정 타입(기본/회의실) | `schedules.schedule_type` 또는 회의실 연동 여부 판단 (아래 참고) |
| 제목 | `schedules.title` |
| 날짜, 시작/종료 시간, 하루종일 | `schedules.start_at` / `end_at` |
| 위치 | `schedules_details.location` |
| 일정 유형(개인/팀/프로젝트) | `schedules.schedule_type` |
| 공개 범위(개인/팀/프로젝트) | 개인 선택 시 `visibility='PRIVATE'`, 팀/프로젝트 선택 시 `schedule_targets`에 공유 대상 추가 (아래 미해결 이슈 1번 참고) |
| 색상 라벨 | `schedules.color_label` (신규 추가 컬럼, 아래 참고) |
| 참석자(이름 검색 추가) | `schedule_targets` (target_type='USER') |
| 일정 상세 설명 | `schedules_details.content` |

### 수정/삭제 (FR-017, FR-018)
- 등록자(`schedules.creator_id`)만 수정/삭제 가능하도록 권한 검증한다.

## 설계 확정 사항 및 남은 이슈

### 1. "일정 유형"과 "공개 범위" 처리 방식 (확정)

- `schedules.schedule_type`: 화면설계서의 "일정 유형(개인/팀/프로젝트)"에 대응. 값: `PERSONAL` / `TEAM` / `PROJECT`.
- `schedules.visibility`: ERD 원래 의도대로 **열람 가능 범위**를 뜻하는 컬럼으로 유지. 값: `PUBLIC` / `PRIVATE` / `TEAM_ONLY`.
- 화면설계서의 "공개 범위(개인/팀/프로젝트)" UI는 `visibility` 컬럼이 아니라 **공유 대상 지정**을 의미하는 것으로 재해석한다. 즉, 사용자가 "공개 범위"에서 "팀"을 선택하면 이는 `visibility='TEAM_ONLY'`를 설정하는 것이 아니라, 해당 팀을 `schedule_targets`(target_type='TEAM')에 공유 대상으로 추가하는 동작으로 처리한다. "프로젝트"를 선택하면 `schedule_targets`(target_type='PROJECT')에 추가한다. "개인"을 선택하면 별도 공유 대상 추가 없이 본인만 열람 가능(`visibility='PRIVATE'`)하게 처리한다.
- 프론트엔드 UI 라벨은 화면설계서의 "공개 범위"를 그대로 유지해도 되지만, 실제로는 참석자 추가와 유사하게 팀/프로젝트 단위로 `schedule_targets`를 생성하는 기능으로 구현한다.

### 2. 색상 라벨 컬럼 (확정 — ERD 변경 필요)

화면설계서의 "색상 라벨" 입력을 지원하기 위해 `schedules` 테이블에 컬럼을 추가하기로 확정했다.

- 추가 컬럼: `color_label VARCHAR(20) Nullable`
- `db-schema.md`의 `schedules` 테이블 정의에 반영 완료.

### 3. "회의실 일정" 등록 흐름 (남은 이슈)
화면설계서 1-4에서는 캘린더 화면의 "일정 추가" 모달에서 기본 일정/회의실 일정을 선택하게 되어 있으나, 화면설계서 1-6(회의실)에는 별도로 "회의실 예약하기" 플로우가 있다. 두 진입점이 같은 결과(회의실 예약 + 일정 자동 생성)를 만드는 것인지, 캘린더에서는 기본 일정만 만들고 회의실 예약은 반드시 회의실 화면에서만 하는 것인지 확인이 필요하다.

**가정(확인 필요)**: MVP1에서는 회의실 예약은 회의실 화면(1-6)에서만 하고, 캘린더의 "일정 추가"는 기본 일정만 지원한다. 캘린더에는 회의실 예약으로 자동 생성된 일정이 함께 조회되기만 한다.

## API 개요 (초안)

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/v1/schedules?view=month&date=2026-07-01` | 월/주/일 단위 조회 (`view` 파라미터로 구분) |
| GET | `/api/v1/schedules/{scheduleId}` | 일정 상세 조회 (schedules_details 포함) |
| POST | `/api/v1/schedules` | 일정 생성 |
| PATCH | `/api/v1/schedules/{scheduleId}` | 일정 수정 (등록자만) |
| DELETE | `/api/v1/schedules/{scheduleId}` | 일정 삭제 (등록자만) |

### 조회 시 공유 범위 필터링
`GET /api/v1/schedules`는 로그인 사용자 기준으로 다음을 모두 포함해 조회해야 한다:
- 본인이 등록자(`creator_id`)인 일정
- `schedule_targets`에 본인(`target_type='USER'`)이 대상으로 지정된 일정
- 본인 소속 팀이 대상(`target_type='TEAM'`, `teams_closure` 조인)으로 지정된 일정
- 본인이 참여 중인 프로젝트(`target_type='PROJECT'`, `projects_members` 조인)가 대상으로 지정된 일정

이 조회 로직은 성능(NFR-003, 3초 이내)에 직접 영향을 주므로 인덱스 설계 시 우선 검토 대상이다.