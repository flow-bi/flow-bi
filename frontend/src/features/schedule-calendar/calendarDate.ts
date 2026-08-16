export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarPeriod {
  from: string
  to: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const SEOUL_TIME_ZONE = 'Asia/Seoul'

interface CalendarDateTimeParts {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

const scheduleDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function scheduleDateTimeParts(value: string): CalendarDateTimeParts {
  const parts = scheduleDateTimeFormatter.formatToParts(new Date(value))
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value

  return {
    year: valueFor('year') ?? '',
    month: valueFor('month') ?? '',
    day: valueFor('day') ?? '',
    hour: valueFor('hour') ?? '',
    minute: valueFor('minute') ?? '',
  }
}

function formatScheduleDate(parts: CalendarDateTimeParts): string {
  return `${parts.year}년 ${Number(parts.month)}월 ${Number(parts.day)}일`
}

function formatScheduleTime(parts: CalendarDateTimeParts): string {
  return `${parts.hour}:${parts.minute}`
}

export function formatScheduleDateTime(value: string): string {
  const parts = scheduleDateTimeParts(value)
  return `${formatScheduleDate(parts)} ${formatScheduleTime(parts)}`
}

export function formatScheduleTimeRange(startAt: string, endAt: string, allDay: boolean): string {
  const start = scheduleDateTimeParts(startAt)
  if (allDay) {
    return `${formatScheduleDate(start)} · 하루 종일`
  }

  const end = scheduleDateTimeParts(endAt)
  if (formatScheduleDate(start) === formatScheduleDate(end)) {
    return `${formatScheduleDate(start)} ${formatScheduleTime(start)}–${formatScheduleTime(end)}`
  }
  return `${formatScheduleDateTime(startAt)}–${formatScheduleDateTime(endAt)}`
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay())
}

export function getCalendarPeriod(view: CalendarView, date: string): CalendarPeriod {
  const selected = parseDate(date)
  if (view === 'month') {
    const start = new Date(selected.getFullYear(), selected.getMonth(), 1)
    return {
      from: `${formatDate(start)}T00:00:00+09:00`,
      to: `${formatDate(new Date(selected.getFullYear(), selected.getMonth() + 1, 1))}T00:00:00+09:00`,
    }
  }
  if (view === 'week') {
    const start = startOfWeek(selected)
    return {
      from: `${formatDate(start)}T00:00:00+09:00`,
      to: `${formatDate(addDays(start, 7))}T00:00:00+09:00`,
    }
  }
  return {
    from: `${date}T00:00:00+09:00`,
    to: `${formatDate(addDays(selected, 1))}T00:00:00+09:00`,
  }
}

export function navigateDate(view: CalendarView, date: string, direction: -1 | 1): string {
  const selected = parseDate(date)
  if (view === 'month') {
    return formatDate(new Date(selected.getFullYear(), selected.getMonth() + direction, 1))
  }
  return formatDate(addDays(selected, direction * (view === 'week' ? 7 : 1)))
}

export function formatCalendarHeading(view: CalendarView, date: string): string {
  const selected = parseDate(date)
  if (view === 'month') {
    return `${selected.getFullYear()}년 ${selected.getMonth() + 1}월`
  }
  if (view === 'week') {
    const start = startOfWeek(selected)
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 주`
  }
  return `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate()}일`
}

export function calendarDays(view: CalendarView, date: string): string[] {
  if (view === 'month') {
    const selected = parseDate(date)
    const firstDay = new Date(selected.getFullYear(), selected.getMonth(), 1)
    const lastDay = new Date(selected.getFullYear(), selected.getMonth() + 1, 0)
    const start = startOfWeek(firstDay)
    const end = addDays(lastDay, 7 - lastDay.getDay())
    const days: string[] = []
    for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
      days.push(formatDate(cursor))
    }
    return days
  }

  const period = getCalendarPeriod(view, date)
  const start = parseDate(period.from.slice(0, 10))
  const end = parseDate(period.to.slice(0, 10))
  const days: string[] = []
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
    days.push(formatDate(cursor))
  }
  return days
}
