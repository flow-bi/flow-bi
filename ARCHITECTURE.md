# ARCHITECTURE.md

## 1. 문서 목적

이 문서는 `flow-bi`의 상위 시스템 구조, 도메인 경계, 의존 방향과 기술적 제약을 정의한다. 세부 구현은 `frontend/FRONTEND.md`, `backend/BACKEND.md`, `backend/API.md`, `backend/DB_SCHEMA.md` 및 기능별 Design Doc에서 다룬다.

## 2. 시스템 개요

flow-bi는 약 100명 규모 기업용 웹 그룹웨어다.

핵심 기능은 다음과 같다.

- 로그인과 권한 관리
- 조직·직원·팀·직급 관리
- 일정 관리
- 회의실 예약
- 알림
- AI Assistant(향후)

## 3. 기술 미확정 영역

다음 기술은 아직 확정하지 않는다.

- AI 모델 및 AI API
- 문서 저장·검색·검색증강생성 방식
- 프런트엔드 및 백엔드 테스트 프레임워크의 세부 구성
- CI/CD 및 배포 환경
- 클라우드와 관측성 플랫폼

Agent는 미확정 영역에 기술을 임의 도입해서는 안 된다. 도입이 필요하면 Design Doc 또는 ADR과 사람의 승인이 선행되어야 한다.

## 4. 논리 아키텍처

```text
[Web Client]
     |
     | HTTPS / JSON API
     v
[Spring Boot Application]
     |
     +-- Identity & Access
     +-- Organization
     +-- Schedule
     +-- Project
     +-- Room Reservation
     +-- Notification
     +-- AI Assistant (future)
     |
     +-- PostgreSQL
     +-- Redis
     +-- External AI / Document Search (future)
```

프런트엔드는 사용자 상호작용과 화면 상태를 담당한다. 백엔드는 인증·인가, 비즈니스 규칙, 트랜잭션과 데이터 정합성의 최종 책임을 가진다.

## 5. 도메인 경계

- Identity & Access: 로그인, 토큰, 권한 검증, 세션 관리
- Organization: 직원, 팀, 직급, 조직 계층, 재직 상태
- Schedule: 개인·팀·프로젝트 일정, 참석자, 공유 범위, 일정 수명주기
- Project: 프로젝트 정보, 참여자, 일정 대상 판별
- Room Reservation: 회의실 정보, 예약, 중복 예약 방지
- Notification: 사용자 알림 설정, 발송 예약/상태
- AI Assistant: 향후 기능이며 기존 도메인 규칙을 우회하지 않음

## 6. 핵심 원칙

- 프런트엔드는 백엔드 저장 구조에 의존하지 않고 API 계약에만 의존한다.
- 백엔드는 도메인을 먼저 분리하고 Controller, Service, Repository, Entity, DTO 계층으로 구성한다.
- 외부 시스템 접근은 Service가 조정하고 Controller에 기술 세부사항을 노출하지 않는다.
- 강한 정합성이 필요한 작업은 하나의 트랜잭션 경계로 처리한다.
- 조직의 직급과 시스템 권한은 서로 다른 개념으로 유지한다.
- 재직 상태와 현재 업무 상태를 하나의 상태값으로 혼합하지 않는다.

## 7. 데이터·API·보안 기준

- 스키마 변경은 마이그레이션과 문서 갱신을 함께 수행한다.
- 클라이언트와 서버는 HTTPS 기반 JSON API로 통신한다.
- 요청 입력은 서버 경계에서 다시 검증한다.
- 인증이 필요한 API는 사용자 신원과 권한을 검사한다.
- 비밀번호는 복호화 가능한 형태로 저장하지 않는다.
- Access Token과 Refresh Token은 별도로 관리한다.
- 개인정보와 인증정보는 최소한으로 조회·노출한다.

세부 기준은 backend/API.md, SECURITY.md를 따른다.

## 8. 아키텍처 변경 관리

다음 변경은 Design Doc 또는 ADR이 필요하다.

- 핵심 기술 스택 도입 또는 교체
- 도메인 경계와 의존 방향 변경
- 인증·권한 모델 변경
- DB 구조 변경
- 외부 AI·검색·알림 서비스 도입
- 배포 토폴로지 또는 보관 정책 변경
- 정합성 모델 변경

## 9. 품질 속성

아키텍처는 보안과 권한 정확성, 데이터 정합성, 유지보수성, 사용자 기능 정확성, 성능과 가용성, 관측 가능성과 감사 가능성을 우선한다. 정량적 기준은 docs/quality/quality-model.md에 정의된다.
