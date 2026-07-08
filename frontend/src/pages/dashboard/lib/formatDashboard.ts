import type { ScheduleType, TeamMemberStatus } from '../types/dashboard'

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

export function getScheduleTypeLabel(type: ScheduleType) {
  if (type === 'PERSONAL') {
    return '개인'
  }

  if (type === 'TEAM') {
    return '팀'
  }

  return '프로젝트'
}

export function getMemberStatusLabel(status: TeamMemberStatus['status']) {
  if (status === 'ONLINE') {
    return '업무 중'
  }

  if (status === 'MEETING') {
    return '회의 중'
  }

  return '자리 비움'
}
