import { Clock } from 'lucide-react'

import { EVENT_COLORS, EVENT_TYPE_LABELS } from '@/constants/events'

import type { AppEvent } from '@/types/events'

interface EventDetailCardProps {
  event: AppEvent
}

export function EventDetailCard({ event }: EventDetailCardProps) {
  const colors = EVENT_COLORS[event.type]

  return (
    <div className="bg-background border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-2">
        <div
          className={`w-1 rounded-full flex-shrink-0 mt-0.5 ${colors.bar}`}
          style={{ minHeight: '2rem' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground leading-snug">{event.title}</p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {event.start.split(' ')[1]} – {event.end.split(' ')[1]}
          </p>
          <span
            className={`mt-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}
          >
            {EVENT_TYPE_LABELS[event.type]}
          </span>
        </div>
      </div>
    </div>
  )
}
