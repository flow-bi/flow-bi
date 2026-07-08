import { calendarWeekLabels } from '../constants/calendarOptions'

import type {
  CalendarSchedule,
  MonthCell,
  ScheduleFormErrors,
  ScheduleFormValues,
  WeekDay,
} from '../types/calendar'

export function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00+09:00`))
}

export function formatScheduleTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function getCalendarTitle(date: Date, viewMode: string) {
  if (viewMode === 'month') {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
    }).format(date)
  }

  if (viewMode === 'week') {
    const weekDays = getWeekDays(date)

    return `${formatDisplayDate(weekDays[0].date)} - ${formatDisplayDate(weekDays[6].date)}`
  }

  return formatDisplayDate(formatDateKey(date))
}

function getMonday(date: Date) {
  const nextDate = new Date(date)
  const day = nextDate.getDay()
  const diff = day === 0 ? -6 : 1 - day

  nextDate.setDate(nextDate.getDate() + diff)

  return nextDate
}

export function getWeekDays(date: Date): WeekDay[] {
  const monday = getMonday(date)

  return Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date(monday)
    nextDate.setDate(monday.getDate() + index)

    return {
      date: formatDateKey(nextDate),
      day: nextDate.getDate(),
      label: calendarWeekLabels[index],
    }
  })
}

export function getMonthCells(baseDate: Date): MonthCell[] {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const firstCell = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell)
    date.setDate(firstCell.getDate() + index)

    return {
      date: formatDateKey(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
    }
  })
}

export function filterSchedulesByDate(schedules: CalendarSchedule[], date: string) {
  return schedules
    .filter((schedule) => schedule.startAt.startsWith(date))
    .sort((first, second) => first.startAt.localeCompare(second.startAt))
}

export function buildScheduleDateTime(date: string, time: string) {
  return `${date}T${time}:00+09:00`
}

export function createInitialScheduleForm(date: string): ScheduleFormValues {
  return {
    title: '',
    date,
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    location: '',
    scheduleType: 'PERSONAL',
    visibility: 'PRIVATE',
    colorLabel: 'BLUE',
    attendees: [],
    content: '',
    teamId: '',
    projectId: '',
  }
}

export function validateScheduleForm(values: ScheduleFormValues): ScheduleFormErrors {
  const errors: ScheduleFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = '일정 제목을 입력하세요.'
  }

  if (values.date.length === 0) {
    errors.date = '날짜를 선택하세요.'
  }

  if (!values.isAllDay) {
    if (values.startTime.length === 0) {
      errors.startTime = '시작 시간을 선택하세요.'
    }

    if (values.endTime.length === 0) {
      errors.endTime = '종료 시간을 선택하세요.'
    }

    if (
      values.startTime.length > 0 &&
      values.endTime.length > 0 &&
      values.startTime >= values.endTime
    ) {
      errors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다.'
    }
  }

  if (values.scheduleType === 'TEAM' && values.teamId.length === 0) {
    errors.teamId = '팀 일정을 등록하려면 팀을 선택하세요.'
  }

  if (values.scheduleType === 'PROJECT' && values.projectId.length === 0) {
    errors.projectId = '프로젝트 일정을 등록하려면 프로젝트를 선택하세요.'
  }

  return errors
}

export function getScheduleTypeLabel(type: CalendarSchedule['scheduleType']) {
  if (type === 'PERSONAL') {
    return '개인'
  }

  if (type === 'TEAM') {
    return '팀'
  }

  return '프로젝트'
}

export function getVisibilityLabel(visibility: CalendarSchedule['visibility']) {
  if (visibility === 'PRIVATE') {
    return '비공개'
  }

  if (visibility === 'TEAM') {
    return '팀 공개'
  }

  return '전체 공개'
}
