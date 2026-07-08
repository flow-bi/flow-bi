import type { CalendarSchedule } from '../types/calendar'

const platformAttendees = [
  { userId: 'user-001', name: '김윤미', team: '플랫폼팀', position: 'Frontend Engineer' },
  { userId: 'user-002', name: '김민수', team: '프로덕트팀', position: 'Product Manager' },
]

export const schedulesMock: CalendarSchedule[] = [
  {
    scheduleId: 'schedule-001',
    title: '주간 제품 싱크',
    scheduleType: 'TEAM',
    visibility: 'TEAM',
    startAt: '2026-07-06T10:00:00+09:00',
    endAt: '2026-07-06T11:00:00+09:00',
    creatorId: 'user-002',
    location: '회의실 A',
    content: '이번 주 기능 배포 범위와 디자인 QA 일정을 정리한다.',
    targets: ['team-product'],
    attendees: platformAttendees,
    colorLabel: 'BLUE',
  },
  {
    scheduleId: 'schedule-002',
    title: 'AI 업무 비서 데모',
    scheduleType: 'PROJECT',
    visibility: 'PUBLIC',
    startAt: '2026-07-08T14:00:00+09:00',
    endAt: '2026-07-08T15:30:00+09:00',
    creatorId: 'user-001',
    location: '온라인',
    content: 'AI 일정 요약과 회의실 예약 플로우를 시연한다.',
    targets: ['project-ai-assistant'],
    attendees: [
      ...platformAttendees,
      { userId: 'user-004', name: '최하린', team: '디자인팀', position: 'Product Designer' },
    ],
    colorLabel: 'PURPLE',
  },
  {
    scheduleId: 'schedule-room-001',
    title: '회의실 B 예약: 채용 인터뷰',
    scheduleType: 'TEAM',
    visibility: 'TEAM',
    startAt: '2026-07-05T13:00:00+09:00',
    endAt: '2026-07-05T14:00:00+09:00',
    creatorId: 'user-005',
    location: '회의실 B · 8층 중앙',
    content: '회의실 예약에서 생성된 일정이다.',
    targets: ['team-product'],
    attendees: [
      { userId: 'user-003', name: '이서준', team: '프로덕트팀', position: 'Product Owner' },
      { userId: 'user-005', name: '박민지', team: '경영지원팀', position: 'People Partner' },
    ],
    colorLabel: 'AMBER',
    roomReservation: {
      reservationId: 'reservation-004',
      roomId: 'room-b',
      roomName: '회의실 B',
      status: 'CONFIRMED',
    },
  },
  {
    scheduleId: 'schedule-003',
    title: '개인 집중 업무',
    scheduleType: 'PERSONAL',
    visibility: 'PRIVATE',
    startAt: '2026-07-10T09:00:00+09:00',
    endAt: '2026-07-10T12:00:00+09:00',
    creatorId: 'user-001',
    location: '내 자리',
    content: '캘린더 상세 구현 집중 시간.',
    targets: [],
    attendees: [
      { userId: 'user-001', name: '김윤미', team: '플랫폼팀', position: 'Frontend Engineer' },
    ],
    colorLabel: 'GREEN',
  },
]
