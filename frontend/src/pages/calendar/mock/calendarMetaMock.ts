import type { CalendarProject, CalendarTeam, CalendarUser } from '../types/calendar'

export const calendarUsersMock: CalendarUser[] = [
  {
    userId: 'user-001',
    employeeNumber: 'A1001',
    name: '김윤미',
    email: 'yunmi.kim@flowbi.local',
    team: '플랫폼팀',
    position: 'Frontend Engineer',
    roles: ['USER'],
  },
  {
    userId: 'user-002',
    employeeNumber: 'A1002',
    name: '김민수',
    email: 'minsu.kim@flowbi.local',
    team: '프로덕트팀',
    position: 'Product Manager',
    roles: ['USER'],
  },
  {
    userId: 'user-003',
    employeeNumber: 'A1003',
    name: '이서준',
    email: 'seojun.lee@flowbi.local',
    team: '프로덕트팀',
    position: 'Product Owner',
    roles: ['USER'],
  },
  {
    userId: 'user-004',
    employeeNumber: 'A1004',
    name: '최하린',
    email: 'harin.choi@flowbi.local',
    team: '디자인팀',
    position: 'Product Designer',
    roles: ['USER'],
  },
  {
    userId: 'user-005',
    employeeNumber: 'A1005',
    name: '박민지',
    email: 'minji.park@flowbi.local',
    team: '경영지원팀',
    position: 'People Partner',
    roles: ['USER'],
  },
]

export const calendarTeamsMock: CalendarTeam[] = [
  {
    teamId: 'team-platform',
    teamName: '플랫폼팀',
    parentTeamId: null,
    members: ['user-001'],
  },
  {
    teamId: 'team-product',
    teamName: '프로덕트팀',
    parentTeamId: null,
    members: ['user-002', 'user-003'],
  },
  {
    teamId: 'team-design',
    teamName: '디자인팀',
    parentTeamId: null,
    members: ['user-004'],
  },
]

export const calendarProjectsMock: CalendarProject[] = [
  {
    projectId: 'project-ai-assistant',
    projectName: 'AI 업무 비서',
    description: '자연어 업무 요청과 확인 플로우를 구현하는 프로젝트',
    status: 'ACTIVE',
    members: ['user-001', 'user-002', 'user-004'],
  },
  {
    projectId: 'project-calendar-core',
    projectName: '캘린더 고도화',
    description: '일정 등록과 회의실 예약 연동을 정리하는 프로젝트',
    status: 'ACTIVE',
    members: ['user-001', 'user-003'],
  },
]
