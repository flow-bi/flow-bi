import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

import type { CalendarFilters } from '../types/calendar'
import type { AppEvent } from '@/types/events'

export const formatMonthYear = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`

export const getCalendarDays = (currentMonth: Date) => {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  return days
}

export const getEventsForDay = (day: Date, events: AppEvent[], filters: CalendarFilters) => {
  const dayStr = format(day, 'yyyy-MM-dd')
  return events.filter((e) => e.start.startsWith(dayStr) && filters[e.type])
}
