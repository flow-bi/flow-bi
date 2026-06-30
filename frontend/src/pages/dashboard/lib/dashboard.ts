import { addDays, format, parseISO } from 'date-fns'

import type { DashboardEvent, DashboardReservation } from '../types/dashboard'

export function getTodayEvents(events: DashboardEvent[], todayStr: string) {
  return events.filter((event) => event.start.startsWith(todayStr))
}

export function getTodayReservations<T extends DashboardReservation>(
  reservations: T[],
  todayStr: string,
) {
  return reservations.filter((reservation) => reservation.date === todayStr)
}

export function getThisWeekEventCount(events: DashboardEvent[], today: Date, todayStr: string) {
  const thisWeekEnd = format(addDays(today, 7), 'yyyy-MM-dd')

  return events.filter((event) => {
    const eventDate = event.start.split(' ')[0]
    return eventDate >= todayStr && eventDate <= thisWeekEnd
  }).length
}

export function getUpcomingEvents(events: DashboardEvent[], todayStr: string, limit = 4) {
  return events
    .filter((event) => event.start.split(' ')[0] > todayStr)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit)
}

export function formatEventTimeRange(start: string, end: string) {
  return `${start.split(' ')[1]} – ${end.split(' ')[1]}`
}

export function formatReservationTimeRange(start: string, end: string) {
  return `${start} – ${end}`
}

export function formatUpcomingEventDateTime(start: string) {
  const [dateStr, time] = start.split(' ')
  const date = parseISO(dateStr)

  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}
