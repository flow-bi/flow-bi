import type {
  AiSummary,
  DashboardSchedule,
  RoomReservationSummary,
  TeamMemberStatus,
  WeeklyScheduleSummary,
} from '../types/dashboard'

export const dashboardSchedules: DashboardSchedule[] = [
  {
    scheduleId: 'schedule-001',
    title: '플랫폼팀 주간 회의',
    scheduleType: 'TEAM',
    visibility: 'TEAM',
    startAt: '2026-07-03T10:00:00+09:00',
    endAt: '2026-07-03T11:00:00+09:00',
    creatorId: 'user-001',
    location: '회의실 A',
    content: '이번 주 진행 현황과 배포 이슈를 공유합니다.',
    targets: ['team-platform'],
    attendees: ['김민준', '이서연', '박지훈'],
    colorLabel: '#5541A4',
  },
  {
    scheduleId: 'schedule-002',
    title: '프로젝트 일정 검토',
    scheduleType: 'PROJECT',
    visibility: 'PROJECT',
    startAt: '2026-07-03T14:00:00+09:00',
    endAt: '2026-07-03T15:00:00+09:00',
    creatorId: 'user-001',
    location: '온라인',
    content: 'AI Groupware 1차 범위 일정 검토',
    targets: ['project-ai-groupware'],
    attendees: ['김민준', '최유진'],
    colorLabel: '#2E90FA',
  },
  {
    scheduleId: 'schedule-003',
    title: '개인 업무 정리',
    scheduleType: 'PERSONAL',
    visibility: 'PRIVATE',
    startAt: '2026-07-03T17:00:00+09:00',
    endAt: '2026-07-03T17:30:00+09:00',
    creatorId: 'user-001',
    location: '내 자리',
    content: '다음 주 우선순위 정리',
    targets: ['user-001'],
    attendees: ['김민준'],
    colorLabel: '#12B76A',
  },
]

export const weeklyScheduleSummaries: WeeklyScheduleSummary[] = [
  {
    date: '2026-07-01',
    dayLabel: '수',
    schedules: [
      {
        scheduleId: 'schedule-week-001',
        title: '신규 입사자 온보딩',
        scheduleType: 'TEAM',
        visibility: 'TEAM',
        startAt: '2026-07-01T09:30:00+09:00',
        endAt: '2026-07-01T10:30:00+09:00',
        creatorId: 'user-002',
        location: '회의실 B',
        content: '플랫폼팀 신규 입사자 온보딩',
        targets: ['team-platform'],
        attendees: ['이서연', '박지훈'],
        colorLabel: '#5541A4',
      },
    ],
  },
  {
    date: '2026-07-02',
    dayLabel: '목',
    schedules: [
      {
        scheduleId: 'schedule-week-002',
        title: '디자인 리뷰',
        scheduleType: 'PROJECT',
        visibility: 'PROJECT',
        startAt: '2026-07-02T13:00:00+09:00',
        endAt: '2026-07-02T14:00:00+09:00',
        creatorId: 'user-004',
        location: '온라인',
        content: '주요 화면 디자인 리뷰',
        targets: ['project-ai-groupware'],
        attendees: ['김민준', '최유진'],
        colorLabel: '#2E90FA',
      },
    ],
  },
  {
    date: '2026-07-03',
    dayLabel: '금',
    schedules: dashboardSchedules,
  },
  {
    date: '2026-07-04',
    dayLabel: '토',
    schedules: [],
  },
  {
    date: '2026-07-05',
    dayLabel: '일',
    schedules: [],
  },
]

export const teamMemberStatuses: TeamMemberStatus[] = [
  {
    email: 'seoyeon.lee@company.example',
    name: '이서연',
    position: '프론트엔드 리드',
    status: 'ONLINE',
    team: '플랫폼팀',
    userId: 'user-002',
  },
  {
    email: 'jihoon.park@company.example',
    name: '박지훈',
    position: '백엔드 엔지니어',
    status: 'MEETING',
    team: '플랫폼팀',
    userId: 'user-003',
  },
  {
    email: 'yujin.choi@company.example',
    name: '최유진',
    position: '디자이너',
    status: 'OUT',
    team: '프로덕트팀',
    userId: 'user-004',
  },
]

export const roomReservationSummaries: RoomReservationSummary[] = [
  {
    count: 6,
    endAt: '2026-07-03T11:00:00+09:00',
    reservationId: 'reservation-001',
    roomId: 'room-a',
    roomName: '회의실 A',
    scheduleId: 'schedule-001',
    startAt: '2026-07-03T10:00:00+09:00',
    status: 'CONFIRMED',
    title: '플랫폼팀 주간 회의',
  },
  {
    count: 4,
    endAt: '2026-07-03T16:00:00+09:00',
    reservationId: 'reservation-002',
    roomId: 'room-c',
    roomName: '회의실 C',
    scheduleId: 'schedule-004',
    startAt: '2026-07-03T15:00:00+09:00',
    status: 'PENDING',
    title: '신규 기능 리뷰',
  },
]

export const aiDashboardSummary: AiSummary = {
  confirmationRequired: false,
  intent: 'DAILY_SUMMARY',
  message: '오늘 업무 요약을 보여줘',
  response: '오늘은 팀 회의 1건, 프로젝트 검토 1건, 개인 일정 1건이 예정되어 있습니다.',
  suggestedActions: [
    '회의실 예약 현황 확인',
    '캘린더 주간 보기 열기',
    'AI 채팅으로 일정 추가 요청',
  ],
}
