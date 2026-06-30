import { Clock } from 'lucide-react'

import { EVENT_COLORS, EVENT_TYPE_LABELS } from '@/constants/events'

import { formatEventTimeRange } from '../lib/dashboard'

import type { DashboardEvent } from '../types/dashboard'

interface TodayEventsCardProps {
  events: DashboardEvent[]
  onViewAll: () => void
}

export function TodayEventsCard({ events, onViewAll }: TodayEventsCardProps) {
  return (
    <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">오늘의 일정</h3>
        <button
          onClick={onViewAll}
          className="text-xs text-violet-600 hover:underline font-semibold"
        >
          전체보기 →
        </button>
      </div>
      {events.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          오늘 등록된 일정이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map((event) => {
            const color = EVENT_COLORS[event.type]
            const time = formatEventTimeRange(event.start, event.end)

            return (
              <div
                key={event.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className={`w-1 h-9 rounded-full ${color.bar} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {time}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${color.bg} ${color.text} flex-shrink-0`}
                >
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
