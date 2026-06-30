import { EVENT_COLORS } from '@/constants/events'

import { formatUpcomingEventDateTime } from '../lib/dashboard'

import type { DashboardEvent } from '../types/dashboard'

interface UpcomingEventsCardProps {
  events: DashboardEvent[]
}

export function UpcomingEventsCard({ events }: UpcomingEventsCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">예정 일정</h3>
      </div>
      <div className="px-5 py-3 space-y-3">
        {events.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted-foreground">예정 일정이 없습니다.</p>
        ) : (
          events.map((event) => {
            const color = EVENT_COLORS[event.type]

            return (
              <div key={event.id} className="flex items-start gap-3 py-0.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${color.dot}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-snug truncate">
                    {event.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatUpcomingEventDateTime(event.start)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
