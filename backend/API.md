# API.md

## 1. 문서 상태

- 상태: Contract Draft
- 범위: API 공통 규칙과 기능별 Endpoint 후보
- 주의: 세부 Request·Response Schema는 기능별 Design Doc과 구현 Plan에서 확정

이 문서의 후보 Endpoint는 구현 승인이 아니다. Product Spec과 Design Doc이 확정된 기능만 Active Plan을 통해 구현한다.

## 2. 기본 원칙

- JSON 기반 HTTP API를 사용한다.
- 보호 API는 Redis에 저장된 서버 세션 인증을 요구한다.
- 서버는 모든 입력과 객체 수준 권한을 검증한다.
- Entity를 응답으로 직접 노출하지 않는다.
- 날짜·시간은 ISO 8601과 명확한 Offset을 사용한다.
- Collection은 복수 명사와 명확한 조회 범위를 사용한다.
- 성공·오류 형식을 기능마다 다르게 만들지 않는다.

API Base Path와 Versioning 방식은 아직 미확정이다. 예시는 `/api`를 사용한다.

## 3. 인증 Cookie

로그인 성공 시 서버는 사용자 정보를 포함하지 않는 불투명한 세션 식별자를 Cookie로 전달한다.

```http
Set-Cookie: SESSION={opaque-session-id}; Path=/; HttpOnly; Secure; SameSite=Lax
```

브라우저는 이후 동일 출처 요청에 Session Cookie를 자동으로 전달한다. JavaScript가 세션 식별자를 읽거나 별도 저장소에 복사하지 않는다. 운영 환경에서는 `Secure=true`이며, `local` Profile만 HTTPS 없이 개발할 수 있도록 `Secure=false`를 명시한다. 세션 유휴 만료는 1시간이고, 생성 시각 기준 절대 만료는 10시간이다.

### 3.1 CSRF와 인증 실패

- `GET /api/auth/csrf`는 인증 없이 CSRF Cookie를 발급한다. 응답 Body에는 CSRF Token 값을 포함하지 않는다.
- 상태 변경 요청(`POST`, `PUT`, `PATCH`, `DELETE`)은 `XSRF-TOKEN` Cookie 값과 같은 `X-XSRF-TOKEN` Header를 요구한다. 누락되거나 일치하지 않으면 `403`과 `CSRF_VALIDATION_FAILED`를 반환한다.
- 로그인 Endpoint와 CSRF bootstrap 외 `/api/**` 요청은 인증이 필요하다. 세션이 없거나 만료되면 `401`과 `UNAUTHENTICATED`를 반환한다.
- Redis Session Store에 연결할 수 없으면 인증을 허용하지 않고 `503`과 `AUTH_SESSION_UNAVAILABLE`를 반환한다. 오류 응답에는 Session ID, CSRF Token, Redis Key, 비밀번호를 포함하지 않는다.
- Credential을 포함하는 교차 출처 요청은 설정된 명시적 Origin에만 허용한다. 허용 Origin이 없으면 CORS 요청을 허용하지 않는다.

## 4. 공통 성공 응답

단일 리소스 예시:

```json
{
  "data": {
    "id": 1
  }
}
```

목록 예시:

```json
{
  "data": [],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

공통 Envelope 사용 여부는 구현 전 확정한다. 확정 후 모든 Endpoint가 같은 규칙을 따라야 한다.

## 5. 공통 오류 응답

```json
{
  "code": "ROOM_RESERVATION_CONFLICT",
  "message": "선택한 시간에 회의실을 예약할 수 없습니다.",
  "fieldErrors": [],
  "traceId": "optional-trace-id"
}
```

원칙:

- `code`: 클라이언트가 분기할 안정적인 식별자
- `message`: 사용자에게 노출 가능한 설명
- `fieldErrors`: 입력 필드별 오류가 있을 때 사용
- `traceId`: 운영 추적이 가능한 경우 제공
- Stack Trace, SQL, 내부 클래스명과 민감정보는 포함하지 않음

## 6. HTTP 상태 코드

| 상태                        | 용도                                 |
| --------------------------- | ------------------------------------ |
| `200 OK`                    | 조회·수정 성공                       |
| `201 Created`               | 리소스 생성 성공                     |
| `204 No Content`            | 응답 Body가 없는 성공                |
| `400 Bad Request`           | 형식·입력 검증 실패                  |
| `401 Unauthorized`          | 인증되지 않음 또는 Session 무효·만료 |
| `403 Forbidden`             | 인증되었으나 권한 부족               |
| `404 Not Found`             | 리소스가 없거나 노출할 수 없음       |
| `409 Conflict`              | 상태·시간·중복 충돌                  |
| `429 Too Many Requests`     | 요청 제한 초과                       |
| `500 Internal Server Error` | 예상하지 못한 서버 오류              |
| `503 Service Unavailable`   | 일시적 외부 의존성 장애              |

## 7. Collection 조회

- 무제한 목록 반환을 피한다.
- Page 방식은 `page`, `size`, 정렬 기준을 명시한다.
- 일정처럼 기간이 핵심인 목록은 `from`, `to`를 요구할 수 있다.
- 검색어는 길이와 허용 문자를 검증한다.
- 정렬 가능한 필드를 서버가 Allowlist로 제한한다.

## 8. 기능별 Endpoint 후보

### 8.0 Login contract

`POST /api/auth/login` requires the CSRF cookie from `GET /api/auth/csrf` and the matching
`X-XSRF-TOKEN` request header. Its JSON body is `{ "employeeNumber": "...", "password": "..." }`;
the employee number is 1-50 alphanumeric or hyphen characters and the password is 10-128 characters.

On success it returns `200 OK` with `{ "mustChangePassword": boolean }`, rotates the opaque
`SESSION` identifier, and stores only the internal user ID, minimal role, password-change state,
and session generation in the authenticated context. It never returns the password, hash, session
identifier, or CSRF value.

Unknown employee numbers, inactive users, and incorrect passwords all return the identical
`401 INVALID_CREDENTIALS` response: `Invalid employee number or password.` Failed attempts are
counted atomically by employee number plus request source. Five failures in 15 minutes return
`429 LOGIN_RATE_LIMITED` for 15 minutes; a successful login clears that employee/source failure
state. Redis or session-generation dependency failure returns `503 AUTH_DEPENDENCY_UNAVAILABLE`
and does not authenticate the request. Authentication audit events contain only a masked employee
identifier, result, timestamp, and trace ID.

### 8.0.1 Initial password change contract

`PUT /api/auth/password` requires an authenticated session whose `mustChangePassword` state is
`true`, the CSRF cookie, and the matching `X-XSRF-TOKEN` header. Its JSON body is
`{ "newPassword": "...", "confirmation": "..." }`. The two values must match; the new password
must be 10-128 characters and include a letter, a number, and a special character. Reusing the
temporary password is forbidden.

While password change is required, every authenticated `/api/**` endpoint is denied with
`403 PASSWORD_CHANGE_REQUIRED` except `GET /api/auth/csrf` (to issue the CSRF Cookie required
before password change or logout), `GET /api/auth/session`, `PUT /api/auth/password`, and
`POST /api/auth/logout`.
On success, the response is `200 OK` with `{ "mustChangePassword": false }`. The current session
is retained with its updated generation and every other session is logically invalidated before
best-effort physical deletion. The request and response never contain a password or password hash.

Invalid requests return `400` with one of `PASSWORD_CONFIRMATION_MISMATCH`,
`PASSWORD_POLICY_VIOLATION`, `PASSWORD_REUSE_FORBIDDEN`, or `PASSWORD_CHANGE_NOT_REQUIRED`.
Database or Redis/session failures return `503 PASSWORD_CHANGE_UNAVAILABLE` and retain the
fail-closed session-generation state.

### 8.0.2 Current session status contract

`GET /api/auth/session` requires a current authenticated server session and returns `200 OK` with
`{ "authenticated": true, "mustChangePassword": boolean }`. It is available to users who must
change their password so the client can route them from the server-provided state. The response has
`Cache-Control: no-store` and never contains an employee number, password, password hash, session
identifier, CSRF token, or profile data.

Missing, expired, or session-generation-mismatched sessions return `401 UNAUTHENTICATED`.
Redis or session-store failures return `503 AUTH_SESSION_UNAVAILABLE`; both error responses are
fail-closed, have `Cache-Control: no-store`, and omit session and credential data.

### 8.0.3 Logout contract

`POST /api/auth/logout` requires the `XSRF-TOKEN` cookie and matching `X-XSRF-TOKEN` header.
It invalidates only the current HTTP session and returns `204 No Content` with an expired
`SESSION` cookie using `Path=/`, `HttpOnly`, the configured `Secure` value, and `SameSite=Lax`.

An anonymous, expired, or repeated logout request with valid CSRF protection also returns
`204 No Content`; the response does not reveal account or prior-session state. A missing or
invalid CSRF token returns `403 CSRF_VALIDATION_FAILED`. Reuse of the expired session for a
protected API returns `401 UNAUTHENTICATED`. Logout audit records contain only the outcome and
never contain a session identifier, CSRF token, or authentication credential.

### 8.0.4 Current user name contract

`GET /api/me/header` requires an authenticated server session and returns `200 OK` with exactly the
header-display field `{ "name": "..." }`. The server derives the user only from the authenticated
`LoginPrincipal` immutable internal `userId`; the request accepts no user ID in its path, query,
header, or body and cannot select another user.

The lookup reads only the name of an `ACTIVE` user. Missing, inactive, or malformed Principal user
IDs return `404 Not Found` without profile data, so the response does not reveal whether a user
record exists. Missing or expired sessions return `401 UNAUTHENTICATED`, and sessions requiring an
initial password change return `403 PASSWORD_CHANGE_REQUIRED` under the existing protected API
filter contract. The successful response and the identity-safe `404` response include
`Cache-Control: no-store`; unauthenticated session failures retain the existing global no-store
contract.

The response never includes a user ID, employee number, email, team, position, role, credential,
password, session identifier, CSRF value, or any other profile data. The name is not copied into
the session or Redis; it is resolved from the authoritative user store for each request.

### 8.1 Authentication

| Method | Path                   | 목적                  |
| ------ | ---------------------- | --------------------- |
| `POST` | `/api/auth/login`      | 사번·비밀번호 로그인  |
| `POST` | `/api/auth/logout`     | 현재 Session 로그아웃 |
| `POST` | `/api/auth/logout-all` | 전체 Session 로그아웃 |
| `PUT`  | `/api/auth/password`   | 비밀번호 변경         |

### 8.2 Users and Organization

| Method   | Path                         | 목적                         |
| -------- | ---------------------------- | ---------------------------- |
| `GET`    | `/api/users`                 | 직원 목록·검색               |
| `POST`   | `/api/users`                 | 관리자 직원 등록             |
| `GET`    | `/api/users/{userId}`        | 직원 조회                    |
| `PUT`    | `/api/users/{userId}`        | 관리자 직원 수정             |
| `DELETE` | `/api/users/{userId}`        | 직원 삭제 또는 비활성화 요청 |
| `GET`    | `/api/teams`                 | 팀 목록 또는 조직도 조회     |
| `POST`   | `/api/teams`                 | 관리자 팀 생성               |
| `PATCH`  | `/api/teams/{teamId}/name`   | 관리자 팀 이름 변경          |
| `PUT`    | `/api/teams/{teamId}/parent` | 관리자 팀 이동               |
| `DELETE` | `/api/teams/{teamId}`        | 관리자 leaf 팀 삭제          |

직원과 팀은 물리 삭제하지 않으며 직원·팀 `DELETE` Endpoint를 제공하지 않는다. 직원 등록, 비밀번호 초기화와 계정 재활성화 요청은 임시 비밀번호를 받지 않는다. 서버가 CSPRNG로 대문자·소문자·숫자·특수문자를 포함한 20자 값을 생성하고 BCrypt 해시만 저장한다. 성공 응답은 다음 값을 한 번만 반환하며 `Cache-Control: no-store`를 적용한다.

```json
{
  "userId": 1,
  "temporaryPassword": "one-time-generated-value",
  "mustChangePassword": true
}
```

응답을 잃어버리면 평문을 복구하지 않고 비밀번호 초기화를 다시 요청한다. 비밀번호 초기화·계정 재활성화·비활성화·퇴직은 대상의 모든 기존 세션을 무효화한다. 퇴직 요청은 `employmentStatus=TERMINATED`만 허용하며 같은 트랜잭션에서 `accountStatus=INACTIVE`로 만든다. `TERMINATED`는 되돌릴 수 없다.

`ADMIN`, `SYSTEM_ADMIN`, `HR_ADMIN` 중 하나라도 가진 대상을 변경하거나 비밀번호를 초기화하려면 `USER_MANAGE`와 `PRIVILEGED_ACCOUNT_MANAGE`를 모두 요구한다. 역할은 `ACTIVE + EMPLOYED` 대상에게만 부여한다. 동일 역할 재부여와 미보유 역할 회수는 멱등 성공이고 성공한 역할 변경은 대상의 모든 세션을 무효화한다. 마지막 `ACTIVE + EMPLOYED + ADMIN`의 역할 회수·비활성화·퇴직은 `409 Conflict`와 `LAST_ADMIN_REQUIRED`로 거부한다. 역할 변경 이력 Endpoint는 제공하지 않는다.

팀 비활성화는 활성 사용자와 활성 하위 팀이 모두 없을 때만 성공한다. 그렇지 않으면 `409 Conflict`와 `TEAM_IN_USE`를 반환한다. 재활성화는 상위 팀이 없거나 활성 상태일 때만 허용하며 하위 팀과 사용자를 자동 재활성화하지 않는다.

#### Team hierarchy API (FR-005 to FR-008, NFR-001)

All team endpoints require an authenticated user. Read endpoints are available to every authenticated user. `POST`, `PATCH`, `PUT`, and `DELETE` additionally require the current server-provided `AuthenticatedUser.Role.ADMIN` and a valid CSRF token; request bodies never contain or establish the acting user or role.

| Method   | Path                              | Response                                 |
| -------- | --------------------------------- | ---------------------------------------- |
| `GET`    | `/api/teams`                      | `200` list of direct team responses      |
| `GET`    | `/api/teams/{teamId}`             | `200` team response                      |
| `GET`    | `/api/teams/{teamId}/parent`      | `200` direct parent, or `204` for a root |
| `GET`    | `/api/teams/{teamId}/children`    | `200` direct-child list                  |
| `GET`    | `/api/teams/{teamId}/ancestors`   | `200` ancestor list excluding self       |
| `GET`    | `/api/teams/{teamId}/descendants` | `200` descendant list excluding self     |
| `GET`    | `/api/teams/{teamId}/path`        | `200` root-to-team path                  |
| `GET`    | `/api/teams/{teamId}/tree`        | `200` requested subtree                  |
| `POST`   | `/api/teams`                      | `201` created team                       |
| `PATCH`  | `/api/teams/{teamId}/name`        | `200` renamed team                       |
| `PUT`    | `/api/teams/{teamId}/parent`      | `200` moved team                         |
| `DELETE` | `/api/teams/{teamId}`             | `204`                                    |

`TeamCreateRequest` is `{ "teamName": "Platform", "parentTeamId": 1 }`; `parentTeamId` may be `null` for a root. `TeamNameUpdateRequest` is `{ "teamName": "Platform" }` and `TeamMoveRequest` is `{ "newParentTeamId": 1 }`, where `null` moves the team to the root. Names are trimmed, must be 1-50 non-control characters, and IDs must be positive when present. The normal response is `{ "teamId": 1, "teamName": "Platform", "parentTeamId": null }`.

Ancestor and descendant entries return `{ "teamId", "teamName", "distance" }`; `distance` is the Closure Table edge distance (the direct relation is `1`). Path entries return `{ "teamId", "teamName", "depth" }`, where display `depth` starts at `0` for the root. Tree entries return `{ "teamId", "teamName", "depth", "children" }`, where display `depth` starts at `0` for the requested tree root. Thus Closure distance and display depth are distinct.

Errors use `{ "code", "message", "fieldErrors" }` without internal exception details. Malformed input is `400 TEAM_INVALID`; missing authentication is `401 UNAUTHENTICATED`; a non-admin mutation is `403 TEAM_ADMIN_REQUIRED`; missing team or parent is `404 TEAM_NOT_FOUND`; duplicate names, self/cyclic/same-parent moves, non-leaf deletion, and assigned users are `409` with `TEAM_NAME_CONFLICT`, `TEAM_MOVE_CONFLICT`, `TEAM_HAS_CHILDREN`, or `TEAM_IN_USE`. Detected Closure/adjacency inconsistency is `500 TEAM_HIERARCHY_INCONSISTENT`. OpenAPI is available only in the `local` and `harness` profiles; it remains unavailable by default.

### 8.3 Profile

| Method  | Path                            | 목적                                |
| ------- | ------------------------------- | ----------------------------------- |
| `GET`   | `/api/me`                       | 내 정보 조회 (마이페이지 확장 지점) |
| `GET`   | `/api/me/header`                | 현재 인증 사용자의 이름만 조회      |
| `PATCH` | `/api/me`                       | 이메일·전화번호·업무 상태 수정      |
| `GET`   | `/api/me/notification-settings` | 알림 설정 조회                      |
| `PUT`   | `/api/me/notification-settings` | 알림 설정 변경                      |

### 8.4 Schedules

| Method   | Path                                        | 목적                        |
| -------- | ------------------------------------------- | --------------------------- |
| `GET`    | `/api/schedules?from=&to=`                  | 기간별 일정 조회            |
| `GET`    | `/api/schedules/attendee-candidates?query=` | 일정 참석자 후보 검색       |
| `GET`    | `/api/schedules/target-options`             | 일정 대상 선택지 조회       |
| `POST`   | `/api/schedules`                            | 일정 생성                   |
| `GET`    | `/api/schedules/{scheduleId}`               | 일정 상세 조회              |
| `PUT`    | `/api/schedules/{scheduleId}`               | 일정 수정                   |
| `DELETE` | `/api/schedules/{scheduleId}`               | 일반 일정 취소(Soft Delete) |

일정 생성·수정 요청은 유형을 정확히 하나만 가져야 한다. 일반 `PERSONAL`/`PRIVATE` 일정은 등록자 전용이며 `participantIds`, `userTargetIds`, `teamTargetIds`, `projectTargetIds`가 모두 빈 배열이어야 한다. `TEAM` 일정은 하나 이상의 팀 ID, `PROJECT` 일정은 하나 이상의 프로젝트 ID를 가지며 여러 참석자 ID와 명시적 사용자 공유 대상 ID를 가질 수 있다. 유형과 맞지 않는 팀·프로젝트 대상 조합은 `400 Bad Request`로 거부한다.

일반 `PERSONAL`/`PRIVATE` 요청에 `participantIds` 또는 `userTargetIds`가 하나라도 포함되면 서버는 저장·관계 갱신 전에 `400 Bad Request`와 `SCHEDULE_PERSONAL_RELATIONS_FORBIDDEN`을 반환한다. 같은 요청에서 팀·프로젝트 대상이 포함된 경우도 같은 입력 오류로 거부한다. 이 오류는 생성과 전체 교체 수정에 동일하게 적용되며, 실패한 요청은 일정 행이나 기존 관계에 부분 변경을 남기지 않는다. (`CAL-11-R2`)

```json
{
  "code": "SCHEDULE_PERSONAL_RELATIONS_FORBIDDEN",
  "message": "개인 일정에는 참석자 또는 사용자 공유 대상을 지정할 수 없습니다.",
  "fieldErrors": [
    {
      "field": "participantIds",
      "message": "개인 일정에서는 빈 배열이어야 합니다."
    }
  ]
}
```

참석자와 명시적 사용자 공유 대상은 별도 관계로 관리한다. 명시적 사용자 공유 대상은 일정 조회 권한을 갖지만 참석 인원에는 포함하지 않는다. 같은 사용자가 참석자와 공유 대상에 모두 포함되면 조회 권한은 한 번만 판정한다.

일정 참석자 후보 검색은 인증된 사용자가 팀·프로젝트 일정 등록·수정 화면에서 접근 가능한 활성 사내 사용자를 찾는 용도로만 사용한다. 일반 `PERSONAL`/`PRIVATE` 일정 화면은 이 입력을 제공하지 않는다. (`CAL-11-R1`, `CAL-11-R4`)

- `query`는 연속 공백을 단일 공백으로 정규화한 1~50자 문자열이어야 하며 이름 또는 사번의 부분 일치 검색어로 사용한다.
- 결과는 최대 20건이며 서버가 정한 안정적인 순서로 반환한다.
- 응답 항목은 `userId`, `displayName`만 포함하고 이메일, 전화번호, 조직 내 민감정보는 반환하지 않는다.
- 현재 인증 사용자는 등록자 참석 여부를 나타내는 `creatorAttends`로 별도 관리하므로, 참석자 후보 결과에서 사용자 ID 기준으로 제외한다. 같은 이름의 다른 활성 사용자는 유지한다.
- 현재 사용자가 일정 참석자로 지정할 수 없는 비활성·퇴사·접근 불가 사용자는 결과에서 제외한다.
- 인증 주체가 없으면 `401 Unauthorized`, 팀·프로젝트 일정의 참석자 검색 권한이 없으면 `403 Forbidden`과 `SCHEDULE_ATTENDEE_SEARCH_FORBIDDEN`, 잘못된 검색어는 `400 Bad Request`를 반환한다. Client는 이 응답을 Loading·Empty·Error와 구분되는 Permission 상태로 표시한다.
- 검색 결과가 없으면 빈 배열을 반환하며, 사용자 존재 여부를 오류 응답으로 구분해 노출하지 않는다.

`GET /api/schedules/target-options`는 인증된 사용자가 일정 등록 화면에서 선택할 수 있는 대상의
최소 식별 정보만 반환한다.

```json
{
  "teams": [{ "id": 10, "name": "Platform" }],
  "projects": [{ "id": 20, "name": "Calendar" }]
}
```

- `teams`에는 현재 인증 사용자의 소속 팀만, `projects`에는 현재 인증 사용자가 참여 중인
  `ACTIVE` 프로젝트만 각각 이름 오름차순, ID 오름차순으로 반환한다.
- 각 항목은 선택에 필요한 `id`, `name`만 포함하며 직원 정보, 프로젝트 참여자 목록 또는 내부 상태는 포함하지 않는다.
- 인증되지 않은 요청은 `401 Unauthorized`와 `UNAUTHENTICATED`, 비활성 Actor는 `403 Forbidden`과
  `SCHEDULE_ACTOR_INACTIVE`를 반환한다. 빈 결과는 해당 배열을 빈 배열로 반환한다.
- 이 목록은 생성 권한의 대체 수단이 아니며, `POST /api/schedules`와 `PUT /api/schedules/{scheduleId}`는
  기존 대상 접근 검증을 다시 수행한다.

참석자 ID 목록에 같은 사용자가 반복되면 `400 Bad Request`와 `DUPLICATE_SCHEDULE_PARTICIPANT`로 거부한다. 접근할 수 없거나 비활성인 사용자 ID는 중복 여부와 관계없이 `400 Bad Request`로 거부한다.

`POST /api/schedules`의 등록자는 요청 Body에서 받지 않는다. 보호 Controller가 검증된 `LoginPrincipal`의
내부 사용자 ID를 Calendar Core의 `creatorId`로 전달하며, 클라이언트가 임의의 등록자 ID를 지정할 수 없다.
모든 Calendar Endpoint는 서버 Session Cookie를 사용하고 상태 변경 요청은 CSRF Token을 함께 검증한다.

```json
{
  "title": "스프린트 계획",
  "type": "TEAM",
  "visibility": "TEAM",
  "startAt": "2026-08-10T09:00:00+09:00",
  "endAt": "2026-08-10T10:00:00+09:00",
  "allDay": false,
  "colorLabel": "BLUE",
  "content": "이번 주 목표를 정리합니다.",
  "location": "회의실 A",
  "creatorAttends": true,
  "participantIds": [2, 3],
  "userTargetIds": [4],
  "teamTargetIds": [10],
  "projectTargetIds": []
}
```

`startAt`과 `endAt`은 Offset을 포함하는 ISO 8601 시각이며 `[startAt, endAt)` 구간으로 해석한다. `endAt`은 반드시 `startAt` 뒤여야 한다. `PERSONAL`/`PRIVATE`는 `participantIds`, `userTargetIds`, 팀·프로젝트 대상이 모두 빈 배열이어야 한다. `TEAM`/`TEAM`은 하나 이상의 팀 대상만, `PROJECT`/`PROJECT`는 하나 이상의 프로젝트 대상만 가져야 한다. 팀·프로젝트 일정의 참석자 검색·선택 결과는 `userId`, `displayName`만 사용하며 이름 또는 사번으로 검색하고 중복 없이 추가·개별 제거한다. 색상은 `RED`, `ORANGE`, `YELLOW`, `GREEN`, `BLUE`, `PURPLE` 중 하나다. 사용자·팀·프로젝트의 존재·활성·접근성은 Calendar Adapter가 실제 원장 데이터를 기준으로 판정하며 실패는 `SCHEDULE_REFERENCE_INVALID` 계약으로 변환한다.

조회 결과는 다음 공개 규칙을 적용한다.

- 일반 `PERSONAL`/`PRIVATE`: 작성자만. 과거 데이터에 남은 참석자·명시적 사용자 공유 관계는 등록자 외 공개 근거로 사용하지 않는다.
- `TEAM`: 연결된 팀 소속 사용자, 참석자와 명시적 사용자 공유 대상
- `PROJECT`: 연결된 프로젝트 참여자, 참석자와 명시적 사용자 공유 대상

기존 일반 개인 일정 관계는 승인 없는 Migration으로 삭제하지 않는다. 등록자가 해당 일정을 전체 수정·저장하면 `participantIds`, `userTargetIds`, `teamTargetIds`, `projectTargetIds`를 빈 배열로 제출하여 새 계약에 맞게 관계를 정리한다. 회의실 예약에서 관리되는 연결 일정은 예약자·참석자 연동과 공개 정책을 유지하는 예외이며 Calendar에서는 직접 수정할 수 없다. (`CAL-11-R9`, `CAL-11-R10`)

Calendar Core의 조회 경계 DTO는 검증 가능한 Actor ID를 명시적으로 받는다. 이 DTO는 HTTP Request나
인증 우회 수단이 아니며, 보호 Controller에서는 검증된 Principal만 Actor ID를 제공한다.

`GET /api/schedules?from=&to=`는 다음 Calendar Core 계약을 사용한다.

- `from`, `to`는 Offset을 포함한 ISO 8601 시각이고, 서비스는 `Asia/Seoul` 표시 Offset으로 정규화한다.
- 범위는 `[from, to)`이며 `from < to`, 최대 31일이다. 범위를 넘거나 형식이 잘못되면 `400 Bad Request`와
  `INVALID_SCHEDULE_PERIOD`를 반환한다.
- `ACTIVE` 일정 중 `startAt < to`와 `endAt > from`인 일정만 반환한다. 따라서 범위 시작 또는 종료를 넘는
  일정은 포함하고, `CANCELED` 일정은 포함하지 않는다.
- 목록 항목은 `id`, `title`, `startAt`, `endAt`, `allDay`, `type`, `colorLabel`만 반환한다. 상세·위치·참석자
  등은 목록에 포함하지 않는다.
- Calendar가 한 번의 기간 Query로 대상·참석자를 함께 읽고, Actor의 팀 소속과 프로젝트 참여는 각각 하나의
  Port 호출로 묶어 확인한다. 조회 범위 제한과 승인된 기간 Index를 함께 사용해 무제한 조회와 N+1을 피한다.

`GET /api/schedules/{scheduleId}`의 Calendar Core 상세 응답은 다음 필드를 반환한다.

```json
{
  "id": 1,
  "title": "스프린트 계획",
  "startAt": "2026-08-10T09:00:00+09:00",
  "endAt": "2026-08-10T10:00:00+09:00",
  "allDay": false,
  "type": "TEAM",
  "visibility": "TEAM",
  "colorLabel": "BLUE",
  "content": "이번 주 목표를 정리합니다.",
  "location": "회의실 A",
  "creatorAttends": true,
  "participantIds": [2, 3],
  "participants": [
    { "userId": 2, "displayName": "김하늘" },
    { "userId": 3, "displayName": "이바다" }
  ],
  "attendeeCount": 3,
  "userTargetIds": [4],
  "teamTargetIds": [10],
  "projectTargetIds": [],
  "meetingRoomManaged": false,
  "canManage": true,
  "roomReservationId": null,
  "canCancelRoomReservation": false
}
```

`participantIds`는 기존 Client 호환성을 위해 유지한다. `participants`는 화면 표시에 필요한 최소 객체 목록으로 `participantIds`와 같은 순서의 `{ "userId", "displayName" }`만 포함하며 이메일, 전화번호, 조직·직급·상태 등 추가 개인정보를 포함하지 않는다. `attendeeCount`는 중복 없는 다른 참석자 수에 등록자가 참석하는 경우의 1명을 더해 계산한다. 등록자는 다른 참석자와 중복 계산하지 않고, `creatorAttends`는 등록자의 참석 여부를 별도로 나타낸다. 따라서 상세 모달은 등록자 참석 여부를 별도 표시하고, 다른 참석자가 없을 때도 `attendeeCount`와 빈 목록 상태를 표시할 수 있다. (`CAL-11-R6`, `CAL-11-R7`)

`canManage`는 현재 Actor가 Calendar에서 일반 일정을 수정·취소할 수 있는지를 서버가 계산한 UI 계약이다.
등록자이면서 회의실 예약에서 관리하지 않는 일정에만 `true`이며, 실제 변경 요청은 서버에서 권한과 관리
상태를 다시 검증한다. 존재하지 않는 일정, `CANCELED` 일정 및 Actor에게 공개되지 않은 일정은 모두
동일하게 `404 Not Found`와 `SCHEDULE_NOT_FOUND`를 반환하며, 존재 여부·내부 예외·개인정보를 구분해 노출하지 않는다.

`roomReservationId`와 `canCancelRoomReservation`은 회의실 예약 연결 일정에서만 사용하는 취소 참조다.
연결된 `RESERVED` 예약의 일정 등록자에게만 각각 예약 식별자와 `true`를 반환한다. 다른 조회 가능 사용자,
일반 일정, 취소된 예약에는 `roomReservationId: null`, `canCancelRoomReservation: false`를 반환하며 예약 상세,
참석자 또는 추가 개인정보를 이 필드로 노출하지 않는다. 클라이언트는 `canCancelRoomReservation`이 `true`일 때만
`DELETE /api/room-reservations/{roomReservationId}`를 호출해야 한다. 이 경로는 캘린더 전용 우회가 아니며 기존
예약 취소의 인증, CSRF, 객체 수준 인가, 멱등성 및 트랜잭션 오류 계약을 그대로 적용한다.

`PUT /api/schedules/{scheduleId}`는 일반 일정의 등록자만 호출할 수 있다. Calendar Core는 검증 가능한
`actorId`를 경계 입력으로 받고, 보호 Controller는 검증된 Principal만 이 값을 제공한다.
요청 본문은 생성 요청에서 `creatorId`를 제외한 아래 수정 가능 필드를 모두 포함한다. 부분 수정은 제공하지
않으며, 유형·공개 범위·공유 대상·참석자와 시간 구간은 하나의 트랜잭션으로 함께 재검증한다.

```json
{
  "title": "수정된 스프린트 계획",
  "type": "TEAM",
  "visibility": "TEAM",
  "startAt": "2026-08-10T11:00:00+09:00",
  "endAt": "2026-08-10T12:00:00+09:00",
  "allDay": false,
  "colorLabel": "GREEN",
  "content": "수정된 목표입니다.",
  "location": "회의실 B",
  "creatorAttends": true,
  "participantIds": [2, 3],
  "userTargetIds": [4],
  "teamTargetIds": [10],
  "projectTargetIds": []
}
```

성공 시 `200 OK`와 `GET /api/schedules/{scheduleId}`의 상세 응답 형식을 반환한다. `TEAM` 또는 `PROJECT`에서 `PERSONAL`/`PRIVATE`로 유형을 바꾸는 Client는 참석자와 명시적 사용자 공유 대상을 제거했음을 사용자에게 알리고 `participantIds`, `userTargetIds`, `teamTargetIds`, `projectTargetIds`를 모두 빈 배열로 전송해야 한다. 비어 있지 않은 배열은 `400 Bad Request`와 `SCHEDULE_PERSONAL_RELATIONS_FORBIDDEN`으로 거부하며 기존 일정·관계에 부분 변경을 남기지 않는다. 잘못된 유형·대상·시간·색상·중복
참석자 또는 참조는 생성과 같은 `400 Bad Request` 계약으로 거부한다. 존재하지 않거나 Actor가 등록자가 아닌
일정, 이미 취소된 일정 및 공개 정책상 노출할 수 없는 일정은 모두 `404 Not Found`와 `SCHEDULE_NOT_FOUND`로
처리한다. 회의실 예약 연결 일정은 어떤 필드도 직접 수정하지 않으며 `409 Conflict`와
`ROOM_RESERVATION_MANAGED_SCHEDULE`을 반환한다.

일반 일정 삭제는 다음 계약을 적용한다.

- 일반 일정 등록자만 삭제를 요청할 수 있다.
- 삭제는 물리 삭제가 아니라 `CANCELED` 상태 전환이며 취소 시각과 취소 주체를 기록한다.
- 취소된 일정은 기간별 목록과 일반 상세 조회에서 제외한다.
- 등록자가 이미 취소한 동일 일정에 삭제를 반복 요청하면 `204 No Content`를 반환한다.
- 회의실 예약 연결 일정은 캘린더에서 직접 취소하지 않고 `409 Conflict`와 `ROOM_RESERVATION_MANAGED_SCHEDULE`을 반환한다.
- 인증되지 않은 요청은 `401 Unauthorized`, 존재하지 않거나 요청자에게 노출할 수 없는 일정은 동일하게 `404 Not Found`를 반환한다.
- 성공 응답은 `204 No Content`이며 응답 Body를 포함하지 않는다.
- 취소 감사 이벤트는 Actor, 취소 시각, 일정 ID와 결과(`CANCELED`, `ALREADY_CANCELED`, `NOT_FOUND`,
  `ROOM_RESERVATION_MANAGED`)만 포함한다. 제목, 상세, 위치, 참석자와 공유 대상은 감사 이벤트에 포함하지 않는다.

### 8.5 Rooms and Reservations

| Method   | Path                                     | 목적                                   |
| -------- | ---------------------------------------- | -------------------------------------- |
| `GET`    | `/api/rooms`                             | 인증 사용자 회의실 목록·예약 현황 조회 |
| `GET`    | `/api/rooms/{roomId}`                    | 인증 사용자 회의실 상세                |
| `GET`    | `/api/room-reservations/{reservationId}` | 인증 사용자가 소유한 예약 수정 상세    |
| `GET`    | `/api/room-reservations?from=&to=`       | 예약 현황 조회                         |
| `POST`   | `/api/room-reservations`                 | 회의실 예약과 일정 생성                |
| `PUT`    | `/api/room-reservations/{reservationId}` | 예약 수정                              |
| `DELETE` | `/api/room-reservations/{reservationId}` | 예약과 연결 일정 취소(Soft Cancel)     |

중복 예약은 `409 Conflict`와 안정적인 Error Code로 반환한다.

#### 구현된 조회 계약

`GET /api/rooms`는 `date`(필수, `YYYY-MM-DD`), `startTime`, `endTime`(선택,
`HH:mm[:ss]`), `minimumCapacity`(선택, 양의 정수), `availabilityStatus`(선택,
`AVAILABLE` 또는 `RESERVED`)를 받는다. 시간 조건이 없으면 해당 날짜의 영업 시간
`09:00`~`18:00`을 조회한다. 성공 시 회의실별 `id`, `name`, `capacity`, `location`,
`usesDefaultImage`와 해당 시간대 예약 요약을 반환한다. 예약 요약은 `id`, `title`,
`startAt`, `endAt`, `displayStatus`, `canEdit`만 포함한다. `canEdit`은 현재 인증 사용자가
예약 소유자이고 예약 상태가 `RESERVED`일 때만 `true`이며, 소유자 ID와 인증 사용자 ID는
목록 응답에 노출하지 않는다.

`GET /api/rooms/{roomId}`는 `id`, `name`, `capacity`, `location`,
`usesDefaultImage`만 반환한다.

`GET /api/room-reservations/{reservationId}`는 예약 수정 화면에 필요한
`reservationId`, `roomId`, `title`, `startAt`, `endAt`, `attendeeIds`, `attendees`,
`description`, `editable`만 반환한다. `attendees`의 각 항목은 `userId`와 `displayName`만
포함하며 `attendeeIds`와 같은 ID를 같은 순서로 제공한다. 연결 일정 ID, 예약 Entity, 인증
사용자 정보 및 이메일·전화번호·조직 정보·재직 상태 등 불필요한 개인정보는 반환하지 않는다.

```json
{
  "attendeeIds": [10, 11],
  "attendees": [
    { "userId": 10, "displayName": "김하늘" },
    { "userId": 11, "displayName": "이바다" }
  ]
}
```

세 Endpoint 모두 인증된 사용자 경계를 요구한다. 현재 실제 인증 Adapter가 없으므로
인증 사용자 공급 없이 실행되는 요청은 Use Case를 호출하지 않고 `401 Unauthorized`와
`AUTHENTICATION_REQUIRED`을 반환한다. 사용자 ID는 Query, Path, Body 또는 임시 Header로
받지 않는다.

예약 상세는 예약 소유자만 조회할 수 있다. 존재하지 않는 예약과 소유하지 않은 예약은
동일하게 `404 Not Found`와 `ROOM_RESERVATION_NOT_FOUND`를 반환하여 IDOR로 인한 존재 여부
노출을 막는다. 잘못된 조회 조건은 `400`과 `ROOM_QUERY_INVALID`, 존재하지 않는 회의실은
`404`와 `ROOM_NOT_FOUND`를 반환한다.

#### 구현된 예약 생성 계약

`POST /api/room-reservations`는 인증된 사용자만 호출할 수 있으며, 요청 본문은 다음과 같다.

```json
{
  "roomId": 1,
  "title": "분기 계획 회의",
  "startAt": "2026-08-10T10:00:00",
  "endAt": "2026-08-10T11:00:00",
  "attendeeIds": [10, 11],
  "description": "분기 계획을 논의합니다."
}
```

성공하면 `201 Created`와 연결된 예약 및 일정 식별자만 반환한다.

```json
{
  "reservationId": 5,
  "scheduleId": 9
}
```

`userId`, `role` 또는 그 밖의 인증 정보는 요청·응답에 포함하지 않는다. 서버는 인증 경계가
제공한 현재 사용자 ID만 예약 생성자로 사용한다. 실제 인증 Adapter가 없는 실행에서 인증
속성이 제공되지 않으면 Service를 호출하지 않고 `401 Unauthorized`와
`AUTHENTICATION_REQUIRED`를 반환한다.

입력 검증 오류는 `400`과 `ROOM_RESERVATION_INVALID`, 참석자 접근 권한 부족은 `403`과
`RESERVATION_PARTICIPANT_FORBIDDEN`, 존재하지 않는 회의실은 `404`와 `ROOM_NOT_FOUND`로
반환한다. 수용 인원 초과는 `409`와 `ROOM_CAPACITY_EXCEEDED`, 동일 회의실의 시간 충돌은
`409`와 `ROOM_RESERVATION_CONFLICT`로 반환한다.

#### 구현된 예약 수정 계약

`PUT /api/room-reservations/{reservationId}`는 인증된 예약 소유자만 호출할 수 있으며,
경로의 `reservationId`와 다음 요청 본문을 수정 Command로 변환한다. 본문에는 `reservationId`,
`userId`, `role`을 받지 않으며, 예약 Actor는 인증 경계의 `AuthenticatedUser.userId`만 사용한다.

```json
{
  "roomId": 1,
  "title": "분기 계획 회의",
  "startAt": "2026-08-10T10:00:00",
  "endAt": "2026-08-10T11:00:00",
  "attendeeIds": [10, 11],
  "description": "분기 계획을 논의합니다."
}
```

성공 시 `200 OK`와 다음을 반환한다.

```json
{
  "reservationId": 5,
  "scheduleId": 9
}
```

인증 정보가 없으면 Service 호출 전에 `401 Unauthorized`와 `AUTHENTICATION_REQUIRED`를
반환한다. 입력 오류는 `400`과 `ROOM_RESERVATION_INVALID`, 참석자 접근 권한 부족은 `403`과
`RESERVATION_PARTICIPANT_FORBIDDEN`, 회의실 없음은 `404`와 `ROOM_NOT_FOUND`로 반환한다.
존재하지 않는 예약과 소유하지 않은 예약은 모두 `404 Not Found`와
`ROOM_RESERVATION_NOT_FOUND`를 반환해 IDOR에 따른 존재 여부 노출을 막는다. 수정 불가 상태는
`409`와 `ROOM_RESERVATION_NOT_EDITABLE`, 수용 인원 초과는 `409`와
`ROOM_CAPACITY_EXCEEDED`, 시간 충돌은 `409`와 `ROOM_RESERVATION_CONFLICT`를 반환한다.

#### 구현된 예약 취소 계약

`DELETE /api/room-reservations/{reservationId}`는 인증된 예약 소유자만 호출할 수 있다. 성공 시
응답 Body 없이 `204 No Content`를 반환하며, 예약과 연결 일정은 하나의 트랜잭션에서 각각
`CANCELED` 및 취소 시각으로 전환된다. 취소된 예약은 회의실 예약 현황과 충돌 검사에서,
취소된 일정은 기본 Calendar 기간·상세 조회에서 제외된다.

인증 정보가 없으면 Service 호출 전에 `401 Unauthorized`와 `AUTHENTICATION_REQUIRED`를
반환한다. 존재하지 않는 예약과 소유하지 않은 예약은 모두 `404 Not Found`와
`ROOM_RESERVATION_NOT_FOUND`를 반환한다. 이미 취소된 예약은 같은 소유자의 반복 요청에
상태를 다시 변경하지 않고 `204`를 반환한다. 동시 취소·연결 일정 상태 충돌 등 상태 전이
충돌은 `409 Conflict`와 `ROOM_RESERVATION_CANCEL_CONFLICT`로 반환한다. 취소 감사는 Actor,
시각, 예약·일정 식별자와 결과만 기록하며 제목·설명·참석자·Session 정보는 포함하지 않는다.

### 8.6 Roles and Permissions

고정 역할과 권한은 다음과 같다. 역할 상속이나 `ADMIN` 우회는 없으며 최종 권한은 보유 역할에 명시적으로 매핑된 권한의 합집합이다.

| 역할           | 권한                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN`        | `SYSTEM_MONITOR`, `ACCOUNT_STATUS_READ`, `THEME_MANAGE`, `ROOM_RESOURCE_MANAGE`, `USER_MANAGE`, `TEAM_MANAGE`, `ROLE_MANAGE`, `PRIVILEGED_ACCOUNT_MANAGE` |
| `SYSTEM_ADMIN` | `SYSTEM_MONITOR`, `ACCOUNT_STATUS_READ`, `THEME_MANAGE`, `ROOM_RESOURCE_MANAGE`                                                                           |
| `HR_ADMIN`     | `USER_MANAGE`, `TEAM_MANAGE`                                                                                                                              |

시스템 운영 v1 Endpoint 계약은 다음 권한 경계를 사용한다. 상세 Request·Response Schema는 각 기능 구현 Active Plan에서 확정하되 반환 범위를 넓힐 수 없다.

| Method          | Path                           | 목적                       | 권한                   |
| --------------- | ------------------------------ | -------------------------- | ---------------------- |
| `GET`           | `/api/system/status`           | 서비스 상태 조회           | `SYSTEM_MONITOR`       |
| `GET`           | `/api/system/logs`             | 필터링된 시스템 로그 조회  | `SYSTEM_MONITOR`       |
| `GET`           | `/api/system/errors`           | 오류 상태 조회             | `SYSTEM_MONITOR`       |
| `GET`           | `/api/system/account-statuses` | 사번·계정·재직 상태만 조회 | `ACCOUNT_STATUS_READ`  |
| `GET`, `PUT`    | `/api/system/theme`            | 회사 대표 테마 조회·변경   | `THEME_MANAGE`         |
| 기능별 Endpoint | 회의실 사진·장비 자원          | 조회·변경                  | `ROOM_RESOURCE_MANAGE` |

기능 토글, 임의 전역 설정, 직원·팀·비밀번호·역할 변경은 `SYSTEM_ADMIN` 범위가 아니다.

### 8.7 AI Assistant

AI 모델과 Action Routing이 미확정이므로 Endpoint를 아직 확정하지 않는다. 도입 시 조회와 상태 변경을 구분하고, 상태 변경에는 사용자 확인용 Preview와 실행 API를 분리하는 방식을 검토한다.

## 9. Request 검증 공통 기준

- String 길이와 공백 정규화
- Enum Allowlist
- Email 등 형식
- `startAt < endAt`
- 날짜 조회 범위 제한
- 참석자와 대상 ID의 존재 및 접근 권한
- 회의실 수용 인원과 시간 충돌
- 변경 대상의 현재 상태와 소유권

## 10. 멱등성과 동시성

- 조회·수정·삭제는 HTTP 의미에 맞는 멱등성을 유지한다.
- 네트워크 재시도로 중복 생성 위험이 큰 작업은 Idempotency Key 도입을 검토한다.
- 회의실 예약은 동시 요청에서 단 하나만 성공해야 한다.
- 충돌 응답에는 재조회 또는 대안 선택이 가능한 정보를 제공한다.

## 11. API 변경 관리

- Path, Method, 필수 Field, Field 의미 또는 Error Code 변경은 계약 변경이다.
- 호환성을 깨는 변경은 사람 승인과 전환 계획이 필요하다.
- 구현과 `API.md`를 같은 Task에서 갱신한다.
- Frontend Mock과 실제 API 계약이 다른 상태를 완료로 처리하지 않는다.

## 12. OpenAPI 문서화

- 자동화 도구는 Spring Boot 3.5.7 WebMVC용 `springdoc-openapi-starter-webmvc-ui:2.8.17`을 사용한다.
- OpenAPI 공통 metadata의 제목은 `Flow BI API`, 버전은 애플리케이션 빌드 버전을 사용한다.
- 기본 프로필에서는 OpenAPI JSON과 Swagger UI를 비활성화한다.
- `local`·`harness` 프로필에서만 OpenAPI JSON을 `/v3/api-docs`, Swagger UI를 `/swagger-ui.html`로 인증 없이 제공한다.
- Harness MockMvc 테스트는 OpenAPI JSON 형식과 공통 metadata 및 Swagger UI 진입점을 검증한다.
- 기본 프로필 MockMvc 테스트는 두 문서 경로가 성공 응답을 반환하지 않는지 검증한다.

## 13. 미결정 사항

- `/api/v1` 등 Versioning
- 공통 성공 Envelope 사용 여부
- Cursor와 Page Pagination 선택
- Session Cookie 이름, `SameSite` 값과 CSRF Token 전달 방식
- 상세 DTO와 Error Code 목록

## Development employee account adapter

`GET /api/dev/auth/employee-account-options` and `POST /api/dev/auth/employee-accounts` exist only when the active profile is `local` or `test` and `auth.dev-employee-account.enabled=true` (or `AUTH_DEV_EMPLOYEE_ACCOUNT_ENABLED=true`). They are not production employee-management APIs; when either condition is absent, no controller is registered and both paths return `404 Not Found`.

The options response contains only persisted team and position `{ id, name }` values. Creation accepts `employeeNumber`, `email`, `name`, `teamId`, `positionId`, `initialPassword`, and `confirmation`. `email` is required and must be supplied explicitly; the adapter never derives it. It retains normal CSRF protection and returns `201 Created` with only the user ID, employee number, name, referenced team and position, and `mustChangePassword: true`.

The shared employee-account registration use case requires existing team and position IDs, unused employee number and email values, matching passwords, and the existing password policy. It persists an `ACTIVE` user and an encoded credential in one transaction; `mustChangePassword` is always true and cannot be supplied by callers. Invalid input (including a missing email), missing references, duplicates, and persistence failures produce a safe `400 EMPLOYEE_ACCOUNT_INVALID` response without passwords, password hashes, CSRF values, or session identifiers.
