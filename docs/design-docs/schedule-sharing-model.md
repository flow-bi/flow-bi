# design-docs/schedule-sharing-model.md

이 문서는 `schedule_targets` 테이블의 설계 배경과, 관련해서 확정된 세부 규칙들을 한곳에 모아둔다. `schedule.md`, `db-schema.md`에 흩어져 있는 관련 결정들의 근거를 여기서 통합해서 본다.

---

## 왜 필요한가

하나의 일정은 다음 세 가지 방식으로 동시에 여러 대상에게 공유될 수 있어야 한다(프로젝트소개 문서의 "기술적 도전 과제 1"):

- 특정 개인 여러 명 (예: 1:1 면담, 특정 인원만 참석하는 회의)
- 특정 팀 전체 (하위 조직 포함/미포함)
- 특정 프로젝트 참여자 전체

세 가지 대상 유형이 각각 다른 테이블(`users`, `teams`, `projects`)을 참조해야 하는데, 이걸 `schedules` 테이블에 컬럼 3개(user_id, team_id, project_id)로 직접 두면 하나의 일정이 "개인 2명 + 팀 1개"처럼 여러 대상에 동시에 공유되는 경우를 표현할 수 없다. 그래서 **일정 하나 : 공유 대상 여러 개**의 1:N 관계를 갖는 매핑 테이블 `schedule_targets`를 둔다.

## 다형적(polymorphic) 구조

`schedule_targets`는 `target_type` 컬럼(`USER`/`PROJECT`/`TEAM`)에 따라 실제로 유효한 FK 컬럼이 달라지는 구조다:

| target_type | 유효한 컬럼 | 참조 테이블 |
|---|---|---|
| `USER` | `user_id` | `users` |
| `PROJECT` | `project_id` | `projects` |
| `TEAM` | `ancestor_team_id`, `team_id` | `teams_closure` (팀 + 하위 조직 포함 판별) |

**FK 컬럼은 모두 `Nullable`로 확정**했다(`db-schema.md` 참고). `target_type`에 맞지 않는 나머지 컬럼에 값이 들어가지 않도록 하는 규칙은 DB `CHECK` 제약이 아니라 **`schedule` 도메인 서비스 레이어에서 검증**한다. DB 제약으로 강제하지 않기로 한 이유는, JPA 엔티티 설계가 다형적 FK를 `CHECK` 제약과 함께 다루면 복잡도가 크게 늘어나는 데 비해, 서비스 레이어 검증만으로 실질적인 위험(잘못된 조합 저장)은 충분히 막을 수 있다고 판단했기 때문이다.

## TEAM 타입이 team_id와 ancestor_team_id를 함께 갖는 이유

팀 단위로 공유할 때 "해당 팀뿐 아니라 하위 조직도 포함할지"를 판별해야 한다. `teams_closure`(클로저 테이블)를 조인해서, 조회 시점에 로그인 사용자가 속한 팀이 공유 대상 팀의 하위 조직인지를 빠르게 확인한다. 자세한 클로저 테이블 원리는 `db-schema.md`의 `teams_closure` 설명을 참고.

## `visibility`와의 관계 (schedule.md 결정 통합)

`schedules.visibility`(`PUBLIC`/`PRIVATE`/`TEAM_ONLY`)와 `schedule_targets`는 서로 다른 역할을 한다:

- `visibility`: 일정 자체의 기본 열람 범위 성격 (예: 회사 전체에 공개된 일정인지, 비공개인지)
- `schedule_targets`: 그 일정을 실제로 "누구의 캘린더에 노출시킬지" 지정하는 대상 목록

화면설계서의 "공개 범위(개인/팀/프로젝트)" UI는 `visibility` 값을 바꾸는 것이 아니라, `schedule_targets`에 공유 대상을 추가하는 동작으로 구현한다(`schedule.md` 참고). 예를 들어 "팀"을 선택하면 `target_type='TEAM'`인 레코드가 `schedule_targets`에 하나 생성된다.

## 조회 시 성능 고려사항

로그인 사용자의 캘린더에 표시될 일정을 조회하려면 다음 네 가지를 모두 OR 조건으로 합쳐야 한다(`schedule.md`의 API 개요 참고):

1. `schedules.creator_id` = 본인
2. `schedule_targets`에 `target_type='USER'` and `user_id`=본인
3. `schedule_targets`에 `target_type='TEAM'` and (`teams_closure` 조인으로) 본인 팀이 포함
4. `schedule_targets`에 `target_type='PROJECT'` and (`projects_members` 조인으로) 본인이 참여

이 쿼리는 NFR-003(캘린더 조회 3초 이내)에 직접 영향을 준다. `schedule_targets.schedule_id`, `user_id`, `target_type` 조합 인덱스와 `teams_closure`의 `ancestor_team_id`/`descendant_team_id` 인덱스가 필수적이다. 실제 구현 시 쿼리 실행 계획을 확인할 것.