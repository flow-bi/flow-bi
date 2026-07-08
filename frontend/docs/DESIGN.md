# DESIGN.md

## Design Direction

AI Groupware는 기업 내부 업무 시스템이다.

UI는 다음 방향을 따른다.

- 깔끔함
- 신뢰감
- 정보 확인이 쉬운 구조
- 업무용 서비스다운 정돈된 레이아웃
- AI 기능이 자연스럽게 포함된 화면

---

## Themes

### Light Blue

- 대표 색상: `#EDF1F6`
- 용도: 기본 배경, 카드 배경 계열

### Purple

- 대표 색상: `#5541A4`
- 용도: 강조 버튼, 선택 상태, 브랜드 컬러

---

## Typography

프론트엔드 전체 기본 폰트는 `Pretendard`를 사용한다.

### Font Family

```css
font-family: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

---

## Components

공통 컴포넌트 후보는 다음과 같다.

- Button
- Input
- Select
- DatePicker
- TimePicker
- Modal
- Drawer
- Card
- Badge
- Avatar
- Tabs
- Calendar
- ScheduleCard
- RoomCard
- UserCard
- TeamTree
- ChatMessage
- ShortcutButton

---

## UI States

모든 주요 화면은 다음 상태를 고려한다.

- Loading
- Empty
- Error
- Success
- Disabled

---

## Form Validation

프론트엔드는 다음 기본 검증을 수행한다.

- 필수값 누락 여부
- 이메일 형식
- 전화번호 형식
- 시작 시간이 종료 시간보다 빠른지 여부
- 회의실 예약 인원이 1명 이상인지 여부
- 일정 제목이 비어 있지 않은지 여부

최종 검증은 백엔드 응답을 따른다.
```
