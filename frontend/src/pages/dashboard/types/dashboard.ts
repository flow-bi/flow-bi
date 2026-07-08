export type ScheduleType = 'PERSONAL' | 'TEAM' | 'PROJECT'

export type DashboardSchedule = {
  scheduleId: string
  title: string
  scheduleType: ScheduleType
  visibility: 'PRIVATE' | 'TEAM' | 'PROJECT'
  startAt: string
  endAt: string
  creatorId: string
  location: string
  content: string
  targets: string[]
  attendees: string[]
  colorLabel: string
}

export type TeamMemberStatus = {
  email: string
  name: string
  position: string
  status: 'ONLINE' | 'MEETING' | 'OUT'
  team: string
  userId: string
}

export type RoomReservationSummary = {
  count: number
  endAt: string
  reservationId: string
  roomId: string
  roomName: string
  scheduleId: string
  startAt: string
  status: 'CONFIRMED' | 'PENDING'
  title: string
}

export type AiSummary = {
  confirmationRequired: boolean
  intent: string
  message: string
  response: string
  suggestedActions: string[]
}

export type WeeklyScheduleSummary = {
  date: string
  dayLabel: string
  schedules: DashboardSchedule[]
}
