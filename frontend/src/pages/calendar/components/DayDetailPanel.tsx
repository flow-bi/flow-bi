import { EventDetailCard } from './EventDetailCard'
import { KO_WEEKDAYS } from '../constants/calendar'

import type { AppEvent } from '@/types/events'

interface DayDetailPanelProps {
  selectedDay: Date
  events: AppEvent[]
}

export function DayDetailPanel({ selectedDay, events }: DayDetailPanelProps) {
  return (
    <div className="w-64 flex-shrink-0 border-l border-border bg-card flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-sm font-bold text-foreground">
          {selectedDay.getMonth() + 1}월 {selectedDay.getDate()}일 (
          {KO_WEEKDAYS[selectedDay.getDay()]})
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{events.length}개의 일정</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {events.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">일정이 없습니다.</div>
        ) : (
          events.map((event) => <EventDetailCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}
