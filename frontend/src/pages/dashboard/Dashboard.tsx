import { BRAND_DEEP, BRAND_PRIMARY, BRAND_SOFT } from '@/constants/brand'
import { formatKoFull, TODAY, TODAY_STR } from '@/lib/date'
import { AI_SUGGESTIONS } from '@/mocks/ai'
import { CURRENT_USER } from '@/mocks/current-user'
import { EVENTS } from '@/mocks/events'
import { RESERVATIONS } from '@/mocks/rooms'

import { AiAssistantPanel } from './components/AiAssistantPanel'
import { DashboardHeader } from './components/DashboardHeader'
import { DashboardStats } from './components/DashboardStats'
import { TodayEventsCard } from './components/TodayEventsCard'
import { TodayReservationsCard } from './components/TodayReservationsCard'
import { UpcomingEventsCard } from './components/UpcomingEventsCard'
import {
  getThisWeekEventCount,
  getTodayEvents,
  getTodayReservations,
  getUpcomingEvents,
} from './lib/dashboard'

import type { DashboardStat } from './types/dashboard'
import type { View } from '@/types/navigation'

interface DashboardProps {
  onNav: (view: View) => void
}

export function Dashboard({ onNav }: DashboardProps) {
  const todayEvents = getTodayEvents(EVENTS, TODAY_STR)
  const todayReservations = getTodayReservations(RESERVATIONS, TODAY_STR)
  const weekCount = getThisWeekEventCount(EVENTS, TODAY, TODAY_STR)
  const upcoming = getUpcomingEvents(EVENTS, TODAY_STR)

  const stats: DashboardStat[] = [
    {
      label: '오늘 일정',
      value: todayEvents.length,
      unit: '건',
      color: BRAND_PRIMARY,
      bg: BRAND_SOFT,
    },
    {
      label: '오늘 회의실 예약',
      value: todayReservations.length,
      unit: '건',
      color: BRAND_DEEP,
      bg: '#EFE8FF',
    },
    { label: '소속 조직', value: 1, unit: '개', color: '#059669', bg: '#ECFDF5' },
    { label: '이번 주 일정', value: weekCount, unit: '건', color: '#D97706', bg: '#FFFBEB' },
  ]

  return (
    <div className="p-6 space-y-6">
      <DashboardHeader
        userName={CURRENT_USER.name}
        jobGrade={CURRENT_USER.jobGrade}
        todayLabel={formatKoFull(TODAY)}
        onCreateSchedule={() => onNav('calendar')}
      />
      <AiAssistantPanel
        suggestions={AI_SUGGESTIONS.slice(0, 2)}
        onOpenChat={() => onNav('aiChat')}
      />
      <DashboardStats stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <TodayEventsCard events={todayEvents} onViewAll={() => onNav('calendar')} />
        <div className="space-y-4">
          <TodayReservationsCard reservations={todayReservations} onBook={() => onNav('rooms')} />
          <UpcomingEventsCard events={upcoming} />
        </div>
      </div>
    </div>
  )
}
