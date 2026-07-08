# API.md

## Purpose

이 문서는 프론트엔드에서 기대하는 API 데이터 기준을 정리한다.

백엔드 API가 확정되기 전까지는 이 문서를 기준으로 mock 데이터를 작성한다.

---

## Common UI States

API 요청은 다음 상태를 고려한다.

- idle
- loading
- success
- error
- empty

---

## Auth

### Login

사용 위치:

- `/login`

요청 데이터:

- employeeNumber
- password

응답 데이터:

- accessToken
- refreshToken
- user

---

## User

사용 위치:

- 대시보드
- 조직도
- 직원 관리
- 마이페이지

필요 데이터:

- userId
- employeeNumber
- name
- email
- phoneNumber
- status
- profileImageUrl
- team
- position
- roles

---

## Team

사용 위치:

- 조직도
- 팀 관리
- 팀 일정 등록
- 대시보드 팀원 상태

필요 데이터:

- teamId
- teamName
- parentTeamId
- members

---

## Project

사용 위치:

- 프로젝트 일정 등록
- 프로젝트 일정 조회

필요 데이터:

- projectId
- projectName
- description
- status
- members

---

## Schedule

사용 위치:

- 대시보드
- 캘린더
- AI 채팅

필요 데이터:

- scheduleId
- title
- scheduleType
- visibility
- startAt
- endAt
- creatorId
- location
- content
- targets
- attendees
- colorLabel

일정 유형:

- PERSONAL
- TEAM
- PROJECT

---

## Room

사용 위치:

- 회의실 목록
- 회의실 예약
- 일정 등록 시 회의실 추가

필요 데이터:

- roomId
- roomName
- capacity
- location
- equipment
- reservations

---

## Room Reservation

사용 위치:

- 회의실 예약 화면
- 일정 등록 화면

필요 데이터:

- reservationId
- roomId
- scheduleId
- title
- startAt
- endAt
- status
- count

---

## AI Chat

사용 위치:

- AI 채팅
- 대시보드 AI 요약

필요 데이터:

- message
- intent
- response
- suggestedActions
- confirmationRequired
