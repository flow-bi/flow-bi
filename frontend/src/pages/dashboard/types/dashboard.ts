import type { AppEvent } from '@/types/events'

export interface DashboardReservation {
  id: number
  roomName: string
  start: string
  end: string
  date: string
}

export interface DashboardStat {
  label: string
  value: number
  unit: string
  color: string
  bg: string
}

export type DashboardEvent = AppEvent
