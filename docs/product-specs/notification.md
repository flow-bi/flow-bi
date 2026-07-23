# 알림 Product Spec

## 기능 목적

사용자가 중요한 일정을 놓치지 않도록 일정 및 회의실 예약과 관련된 알림을 제공한다.

## 상세 요구사항

### 포함한 요구사항

- 사용자는 알림 사용 여부를 설정할 수 있어야 한다. (FR-026)
- 사용자는 일정 시작 전 알림 시간을 설정할 수 있어야 한다. (FR-027)
- 사용자는 알림 종류를 설정할 수 있어야 한다. (FR-028)
- AI 비서는 예정된 일정 알림을 제공할 수 있어야 한다. (FR-034)
- AI 비서는 사용자가 설정한 알림 정책에 따라 알림을 제공할 수 있어야 한다. (FR-035)
- 알림 서비스는 일정 시작 전 리마인드 알림을 제공한다.
- 알림 서비스는 회의실 예약 알림을 제공한다.

### 제외한 요구사항

- 알림 설정 UI는 `my-page.md`로 이동한다.
- AI 채팅 화면에서 알림을 제공하는 방식은 `ai-assistant.md`로 이동한다.
- 일정과 회의실 예약의 생성/수정/취소는 각각 `calendar.md`, `meeting-room.md`로 이동한다.

## 화면 구성 요소

- 알림 자체의 독립 화면은 원문에 정의되어 있지 않다.
- 관련 화면
  - 마이페이지 알림 설정
  - AI 비서 알림 제공
  - 일정 및 회의실 예약 관련 알림 표시 영역

## 데이터 흐름

1. 사용자가 알림 사용 여부, 시간, 종류를 설정한다.
2. 일정 또는 회의실 예약 정보가 알림 대상이 된다.
3. 일정 시작 전 설정된 기준에 따라 리마인드 알림이 제공된다.
4. 회의실 예약 관련 알림이 제공된다.
5. AI 비서는 사용자 알림 정책을 반영해 예정된 일정 알림을 제공한다.
6. 알림 생성, 갱신, 취소의 상세 정책은 `docs/design-docs/schedule-and-notification.md`를 따른다.

## 확정된 기능 결정

- 알림은 사용자 설정 정책을 따른다.
- 알림 대상은 일정과 회의실 예약이다.
- AI 비서는 알림 제공 주체 또는 안내 채널로 포함된다.
- 알림 생성, 갱신, 취소의 상세 정책은 `docs/design-docs/schedule-and-notification.md`를 따른다.

## 확정된 기능 결정의 근거

- `requirements.md` FR-026~028은 알림 설정 요구사항을 정의한다.
- `requirements.md` FR-034~035는 AI 비서의 일정 및 맞춤 알림 제공을 정의한다.
- `project-detail.md`는 일정 시작 전 리마인드 알림과 회의실 예약 알림을 주요 기능으로 명시한다.
- 일정, 회의실 예약, AI 비서와의 알림 연동 정책은 `docs/design-docs/schedule-and-notification.md`에서 다룬다.

## Scope Decision

- In Scope: 일정 리마인드 알림, 회의실 예약 알림, 사용자 알림 정책 반영.
- Out of Scope: 알림 설정 화면, AI 채팅 화면, 일정/예약 CRUD.
- Moved: 알림 설정은 `my-page.md`, AI 알림 대화는 `ai-assistant.md`, 일정/예약 관리는 `calendar.md`와 `meeting-room.md`로 이동한다. 일정/예약 변경에 따른 알림 연동 정책은 `docs/design-docs/schedule-and-notification.md`로 이동한다.

## Reference Mapping

- `docs/references/requirements.md`: FR-026~FR-028, FR-034~FR-035
- `docs/references/project-detail.md`: 알림 서비스

## 미확정 사항

- 알림 종류의 구체적인 선택지가 정의되어 있지 않다.
- 알림 제공 채널이 정의되어 있지 않다.
- 회의실 예약 알림의 발생 시점과 대상자가 정의되어 있지 않다.
- 일정/예약 수정 및 취소 시 알림 갱신 또는 취소 처리 방식은 `docs/design-docs/schedule-and-notification.md`의 미확정 사항으로 관리한다.
- AI 비서가 알림을 직접 생성하는지 안내 채널로 동작하는지는 정의되어 있지 않다.

## 관련 Product Spec

- `my-page.md`
- `ai-assistant.md`
- `calendar.md`
- `meeting-room.md`
