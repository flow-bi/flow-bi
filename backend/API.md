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

### 8.1 Authentication

| Method | Path                   | 목적                  |
| ------ | ---------------------- | --------------------- |
| `POST` | `/api/auth/login`      | 사번·비밀번호 로그인  |
| `POST` | `/api/auth/logout`     | 현재 Session 로그아웃 |
| `POST` | `/api/auth/logout-all` | 전체 Session 로그아웃 |
| `PUT`  | `/api/auth/password`   | 비밀번호 변경         |

### 8.2 Users and Organization

| Method   | Path                  | 목적                              |
| -------- | --------------------- | --------------------------------- |
| `GET`    | `/api/users`          | 직원 목록·검색                    |
| `POST`   | `/api/users`          | 관리자 직원 등록                  |
| `GET`    | `/api/users/{userId}` | 직원 조회                         |
| `PUT`    | `/api/users/{userId}` | 관리자 직원 수정                  |
| `DELETE` | `/api/users/{userId}` | 직원 삭제 또는 비활성화 요청      |
| `GET`    | `/api/teams`          | 팀 목록 또는 조직도 조회          |
| `POST`   | `/api/teams`          | 관리자 팀 생성                    |
| `PUT`    | `/api/teams/{teamId}` | 관리자 팀 수정                    |
| `DELETE` | `/api/teams/{teamId}` | 관리자 팀 삭제 또는 비활성화 요청 |

직원·팀의 구체적인 삭제·비활성화 방식은 관련 Product Spec과 Design Doc에서 결정한다.

### 8.3 Profile

| Method  | Path                            | 목적                           |
| ------- | ------------------------------- | ------------------------------ |
| `GET`   | `/api/me`                       | 내 정보 조회                   |
| `PATCH` | `/api/me`                       | 이메일·전화번호·업무 상태 수정 |
| `GET`   | `/api/me/notification-settings` | 알림 설정 조회                 |
| `PUT`   | `/api/me/notification-settings` | 알림 설정 변경                 |

### 8.4 Schedules

| Method   | Path                                        | 목적                        |
| -------- | ------------------------------------------- | --------------------------- |
| `GET`    | `/api/schedules?from=&to=`                  | 기간별 일정 조회            |
| `GET`    | `/api/schedules/attendee-candidates?query=` | 일정 참석자 후보 검색       |
| `POST`   | `/api/schedules`                            | 일정 생성                   |
| `GET`    | `/api/schedules/{scheduleId}`               | 일정 상세 조회              |
| `PUT`    | `/api/schedules/{scheduleId}`               | 일정 수정                   |
| `DELETE` | `/api/schedules/{scheduleId}`               | 일반 일정 취소(Soft Delete) |

일정 생성·수정 요청은 유형을 정확히 하나만 가져야 한다. `TEAM` 일정은 하나 이상의 팀 ID, `PROJECT` 일정은 하나 이상의 프로젝트 ID를 가질 수 있고 모든 유형은 여러 참석자 ID를 가질 수 있다. 유형과 맞지 않는 팀·프로젝트 대상 조합은 `400 Bad Request`로 거부한다.

일정 참석자 후보 검색은 인증된 사용자가 일정 등록·수정 화면에서 접근 가능한 활성 사내 사용자를 찾는 용도로만 사용한다.

- `query`는 연속 공백을 단일 공백으로 정규화한 1~50자 문자열이어야 하며 이름 또는 사번의 부분 일치 검색어로 사용한다.
- 결과는 최대 20건이며 서버가 정한 안정적인 순서로 반환한다.
- 응답 항목은 `userId`, `displayName`만 포함하고 이메일, 전화번호, 조직 내 민감정보는 반환하지 않는다.
- 현재 사용자가 일정 참석자로 지정할 수 없는 비활성·퇴사·접근 불가 사용자는 결과에서 제외한다.
- 인증 주체가 없으면 `401 Unauthorized`, 잘못된 검색어는 `400 Bad Request`를 반환한다.
- 검색 결과가 없으면 빈 배열을 반환하며, 사용자 존재 여부를 오류 응답으로 구분해 노출하지 않는다.

참석자 ID 목록에 같은 사용자가 반복되면 서버는 최초 등장 순서를 유지해 하나의 참석자로 정규화한다. 중복 ID 자체는 요청 실패 사유가 아니며 참석 인원 계산에도 한 번만 반영한다. 접근할 수 없거나 비활성인 사용자 ID는 중복 여부와 관계없이 `400 Bad Request`로 거부한다.

조회 결과는 다음 공개 규칙을 적용한다.

- `PERSONAL`: 작성자와 참석자
- `TEAM`: 연결된 팀 소속 사용자와 참석자
- `PROJECT`: 연결된 프로젝트 참여자와 참석자

일반 일정 삭제는 다음 계약을 적용한다.

- 일반 일정 등록자만 삭제를 요청할 수 있다.
- 삭제는 물리 삭제가 아니라 `CANCELED` 상태 전환이며 취소 시각과 취소 주체를 기록한다.
- 취소된 일정은 기간별 목록과 일반 상세 조회에서 제외한다.
- 등록자가 이미 취소한 동일 일정에 삭제를 반복 요청하면 `204 No Content`를 반환한다.
- 회의실 예약 연결 일정은 캘린더에서 직접 취소하지 않고 `409 Conflict`와 `ROOM_RESERVATION_MANAGED_SCHEDULE`을 반환한다.
- 인증되지 않은 요청은 `401 Unauthorized`, 존재하지 않거나 요청자에게 노출할 수 없는 일정은 동일하게 `404 Not Found`를 반환한다.
- 성공 응답은 `204 No Content`이며 응답 Body를 포함하지 않는다.

### 8.5 Rooms and Reservations

| Method | Path | 목적 |
| --- | --- | --- |
| `GET` | `/api/rooms` | 인증 사용자 회의실 목록·예약 현황 조회 |
| `GET` | `/api/rooms/{roomId}` | 인증 사용자 회의실 상세 |
| `GET` | `/api/room-reservations/{reservationId}` | 인증 사용자가 소유한 예약 수정 상세 |
| `GET` | `/api/room-reservations?from=&to=` | 예약 현황 조회 |
| `POST` | `/api/room-reservations` | 회의실 예약과 일정 생성 |
| `PUT` | `/api/room-reservations/{reservationId}` | 예약 수정 |
| `DELETE` | `/api/room-reservations/{reservationId}` | 예약 취소 후보(일정 도메인 경계 확정 후 구현) |

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
`reservationId`, `roomId`, `title`, `startAt`, `endAt`, `attendeeIds`, `description`,
`editable`만 반환한다. 연결 일정 ID, 예약 Entity, 인증 사용자 정보 및 참석자 이외의
개인정보는 반환하지 않는다.

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

### 8.6 Roles and Permissions

관리 API 경로와 세부 기능은 RBAC Design Doc에서 확정한다. 일반 사용자 API와 분리된 권한을 요구한다.

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
- 직원·팀의 삭제·비활성화 정책과 관련 상태값 및 응답 DTO
- 상세 DTO와 Error Code 목록

## Development employee account adapter

`GET /api/dev/auth/employee-account-options` and `POST /api/dev/auth/employee-accounts` exist only when the active profile is `local` or `test` and `auth.dev-employee-account.enabled=true` (or `AUTH_DEV_EMPLOYEE_ACCOUNT_ENABLED=true`). They are not production employee-management APIs; when either condition is absent, no controller is registered and both paths return `404 Not Found`.

The options response contains only persisted team and position `{ id, name }` values. Creation accepts `employeeNumber`, `email`, `name`, `teamId`, `positionId`, `initialPassword`, and `confirmation`. `email` is required and must be supplied explicitly; the adapter never derives it. It retains normal CSRF protection and returns `201 Created` with only the user ID, employee number, name, referenced team and position, and `mustChangePassword: true`.

The shared employee-account registration use case requires existing team and position IDs, unused employee number and email values, matching passwords, and the existing password policy. It persists an `ACTIVE` user and an encoded credential in one transaction; `mustChangePassword` is always true and cannot be supplied by callers. Invalid input (including a missing email), missing references, duplicates, and persistence failures produce a safe `400 EMPLOYEE_ACCOUNT_INVALID` response without passwords, password hashes, CSRF values, or session identifiers.
