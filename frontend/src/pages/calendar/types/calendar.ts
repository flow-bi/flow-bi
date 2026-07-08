export type CalendarViewMode = 'month' | 'week' | 'day'
export type ScheduleType = 'PERSONAL' | 'TEAM' | 'PROJECT'
export type ScheduleVisibility = 'PRIVATE' | 'PUBLIC' | 'TEAM'
export type ScheduleColorLabel = 'BLUE' | 'GREEN' | 'PURPLE' | 'AMBER' | 'RED'

export type CalendarUser = {
  userId: string
  employeeNumber: string
  name: string
  email: string
  team: string
  position: string
  roles: string[]
}

export type CalendarTeam = {
  teamId: string
  teamName: string
  parentTeamId: string | null
  members: string[]
}

export type CalendarProject = {
  projectId: string
  projectName: string
  description: string
  status: 'ACTIVE' | 'PAUSED' | 'DONE'
  members: string[]
}

export type CalendarAttendee = {
  userId: string
  name: string
  team: string
  position: string
}

export type RoomReservationLink = {
  reservationId: string
  roomId: string
  roomName: string
  status: 'CONFIRMED' | 'PENDING'
}

export type CalendarSchedule = {
  scheduleId: string
  title: string
  scheduleType: ScheduleType
  visibility: ScheduleVisibility
  startAt: string
  endAt: string
  creatorId: string
  location: string
  content: string
  targets: string[]
  attendees: CalendarAttendee[]
  colorLabel: ScheduleColorLabel
  isAllDay?: boolean
  roomReservation?: RoomReservationLink
}

export type ScheduleFormValues = {
  title: string
  date: string
  startTime: string
  endTime: string
  isAllDay: boolean
  location: string
  scheduleType: ScheduleType
  visibility: ScheduleVisibility
  colorLabel: ScheduleColorLabel
  attendees: CalendarAttendee[]
  content: string
  teamId: string
  projectId: string
}

export type ScheduleFormErrors = Partial<Record<keyof ScheduleFormValues, string>>

export type MonthCell = {
  date: string
  day: number
  inCurrentMonth: boolean
}

export type WeekDay = {
  date: string
  label: string
  day: number
}
