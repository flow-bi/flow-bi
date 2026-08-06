export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarPeriod {
  from: string
  to: string
}

const DAY_MS = 24 * 60 * 60 * 1000

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
    const mondayOffset = (selected.getDay() + 6) % 7
    const start = addDays(selected, -mondayOffset)
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
    return `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate() - ((selected.getDay() + 6) % 7)}일 주`
  }
  return `${selected.getFullYear()}년 ${selected.getMonth() + 1}월 ${selected.getDate()}일`
}

export function calendarDays(view: CalendarView, date: string): string[] {
  const period = getCalendarPeriod(view, date)
  const start = parseDate(period.from.slice(0, 10))
  const end = parseDate(period.to.slice(0, 10))
  const days: string[] = []
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
    days.push(formatDate(cursor))
  }
  return days
}
