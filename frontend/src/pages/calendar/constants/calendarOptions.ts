import type {
  CalendarViewMode,
  ScheduleColorLabel,
  ScheduleType,
  ScheduleVisibility,
} from '../types/calendar'

export const calendarViewOptions: Array<{ label: string; value: CalendarViewMode }> = [
  { label: '월간', value: 'month' },
  { label: '주간', value: 'week' },
  { label: '일간', value: 'day' },
]

export const scheduleTypeOptions: Array<{ label: string; value: ScheduleType }> = [
  { label: '개인 일정', value: 'PERSONAL' },
  { label: '팀 일정', value: 'TEAM' },
  { label: '프로젝트 일정', value: 'PROJECT' },
]

export const visibilityOptions: Array<{ label: string; value: ScheduleVisibility }> = [
  { label: '비공개', value: 'PRIVATE' },
  { label: '전체 공개', value: 'PUBLIC' },
  { label: '팀 공개', value: 'TEAM' },
]

export const colorLabelOptions: Array<{ label: string; value: ScheduleColorLabel }> = [
  { label: 'Blue', value: 'BLUE' },
  { label: 'Green', value: 'GREEN' },
  { label: 'Purple', value: 'PURPLE' },
  { label: 'Amber', value: 'AMBER' },
  { label: 'Red', value: 'RED' },
]

export const calendarWeekLabels = ['월', '화', '수', '목', '금', '토', '일']
