# API.md

## 1. 문서 상태

- 상태: Contract Draft
- 범위: API 공통 규칙과 기능별 Endpoint 후보
- 주의: 세부 Request·Response Schema는 기능별 Design Doc과 구현 Plan에서 확정

이 문서의 후보 Endpoint는 구현 승인이 아니다. Product Spec과 Design Doc이 확정된 기능만 Active Plan을 통해 구현한다.

## 2. 기본 원칙

- JSON 기반 HTTP API를 사용한다.
- 보호 API는 JWT 인증을 요구한다.
- 서버는 모든 입력과 객체 수준 권한을 검증한다.
- Entity를 응답으로 직접 노출하지 않는다.
- 날짜·시간은 ISO 8601과 명확한 Offset을 사용한다.
- Collection은 복수 명사와 명확한 조회 범위를 사용한다.
- 성공·오류 형식을 기능마다 다르게 만들지 않는다.

API Base Path와 Versioning 방식은 아직 미확정이다. 예시는 `/api`를 사용한다.

## 3. 인증 Header

Bearer Token 방식을 채택할 경우 다음 형식을 사용한다.

```http
Authorization: Bearer {access-token}
```

Refresh Token의 Cookie 또는 Body 전달 방식은 인증 Design Doc에서 결정한다.

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

| 상태 | 용도 |
| --- | --- |
| `200 OK` | 조회·수정 성공 |
| `201 Created` | 리소스 생성 성공 |
| `204 No Content` | 응답 Body가 없는 성공 |
| `400 Bad Request` | 형식·입력 검증 실패 |
| `401 Unauthorized` | 인증되지 않음 또는 Token 무효 |
| `403 Forbidden` | 인증되었으나 권한 부족 |
| `404 Not Found` | 리소스가 없거나 노출할 수 없음 |
| `409 Conflict` | 상태·시간·중복 충돌 |
| `429 Too Many Requests` | 요청 제한 초과 |
| `500 Internal Server Error` | 예상하지 못한 서버 오류 |
| `503 Service Unavailable` | 일시적 외부 의존성 장애 |

## 7. Collection 조회

- 무제한 목록 반환을 피한다.
- Page 방식은 `page`, `size`, 정렬 기준을 명시한다.
- 일정처럼 기간이 핵심인 목록은 `from`, `to`를 요구할 수 있다.
- 검색어는 길이와 허용 문자를 검증한다.
- 정렬 가능한 필드를 서버가 Allowlist로 제한한다.

## 8. 기능별 Endpoint 후보

### 8.1 Authentication

| Method | Path | 목적 |
| --- | --- | --- |
| `POST` | `/api/auth/login` | 사번·비밀번호 로그인 |
| `POST` | `/api/auth/refresh` | Access Token 갱신 |
| `POST` | `/api/auth/logout` | 현재 Session 로그아웃 |
| `POST` | `/api/auth/logout-all` | 전체 Session 로그아웃 |
| `PUT` | `/api/auth/password` | 비밀번호 변경 |

### 8.2 Users and Organization

| Method | Path | 목적 |
| --- | --- | --- |
| `GET` | `/api/users` | 직원 목록·검색 |
| `POST` | `/api/users` | 관리자 직원 등록 |
| `GET` | `/api/users/{userId}` | 직원 조회 |
| `PUT` | `/api/users/{userId}` | 관리자 직원 수정 |
| `DELETE` | `/api/users/{userId}` | 직원 비활성화 |
| `GET` | `/api/teams` | 팀 목록 또는 조직도 조회 |
| `POST` | `/api/teams` | 관리자 팀 생성 |
| `PUT` | `/api/teams/{teamId}` | 관리자 팀 수정 |
| `DELETE` | `/api/teams/{teamId}` | 관리자 팀 비활성화 |

직원·팀의 `DELETE`는 물리 삭제가 아니라 비활성화를 의미한다. 이미 비활성화된 대상에 대한 반복 요청은 안전한 멱등 응답을 제공해야 한다.

### 8.3 Profile

| Method | Path | 목적 |
| --- | --- | --- |
| `GET` | `/api/me` | 내 정보 조회 |
| `PATCH` | `/api/me` | 이메일·전화번호·업무 상태 수정 |
| `GET` | `/api/me/notification-settings` | 알림 설정 조회 |
| `PUT` | `/api/me/notification-settings` | 알림 설정 변경 |

### 8.4 Schedules

| Method | Path | 목적 |
| --- | --- | --- |
| `GET` | `/api/schedules?from=&to=` | 기간별 일정 조회 |
| `POST` | `/api/schedules` | 일정 생성 |
| `GET` | `/api/schedules/{scheduleId}` | 일정 상세 조회 |
| `PUT` | `/api/schedules/{scheduleId}` | 일정 수정 |
| `DELETE` | `/api/schedules/{scheduleId}` | 일정 취소 또는 Soft Delete |

일정 생성·수정 요청은 유형을 정확히 하나만 가져야 한다. `TEAM` 일정은 하나 이상의 팀 ID, `PROJECT` 일정은 하나 이상의 프로젝트 ID를 가질 수 있고 모든 유형은 여러 참석자 ID를 가질 수 있다. 유형과 맞지 않는 팀·프로젝트 대상 조합은 `400 Bad Request`로 거부한다.

조회 결과는 다음 공개 규칙을 적용한다.

- `PERSONAL`: 작성자와 참석자
- `TEAM`: 연결된 팀 소속 사용자와 참석자
- `PROJECT`: 연결된 프로젝트 참여자와 참석자

### 8.5 Rooms and Reservations

| Method | Path | 목적 |
| --- | --- | --- |
| `GET` | `/api/rooms` | 회의실 목록·검색 |
| `GET` | `/api/rooms/{roomId}` | 회의실 상세 |
| `GET` | `/api/room-reservations?from=&to=` | 예약 현황 조회 |
| `POST` | `/api/room-reservations` | 회의실 예약과 일정 생성 |
| `PUT` | `/api/room-reservations/{reservationId}` | 예약 수정 |
| `DELETE` | `/api/room-reservations/{reservationId}` | 예약 취소 |

중복 예약은 `409 Conflict`와 안정적인 Error Code로 반환한다.

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

## 12. 미결정 사항

- `/api/v1` 등 Versioning
- 공통 성공 Envelope 사용 여부
- Cursor와 Page Pagination 선택
- Refresh Token 전달 방식
- 취소와 Soft Delete의 세부 상태값 및 응답 DTO
- 상세 DTO와 Error Code 목록
- OpenAPI 및 API 문서 자동화 도구
