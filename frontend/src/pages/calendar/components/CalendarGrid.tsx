import { CalendarDayCell } from './CalendarDayCell'
import { KO_WEEKDAYS } from '../constants/calendar'
import { getEventsForDay } from '../lib/calendar'

import type { CalendarFilters } from '../types/calendar'
import type { AppEvent } from '@/types/events'

interface CalendarGridProps {
  currentMonth: Date
  selectedDay: Date
  days: Date[]
  events: AppEvent[]
  filters: CalendarFilters
  onSelectDay: (day: Date) => void
}

export function CalendarGrid({
  currentMonth,
  selectedDay,
  days,
  events,
  filters,
  onSelectDay,
}: CalendarGridProps) {
  return (
    <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden min-h-0">
      <div className="grid grid-cols-7 border-b border-border">
        {KO_WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`py-2.5 text-center text-xs font-bold ${
              i === 0 ? 'text-rose-500' : i === 6 ? 'text-violet-500' : 'text-muted-foreground'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(88px, 1fr)' }}>
        {days.map((day, index) => (
          <CalendarDayCell
            key={day.getTime()}
            day={day}
            index={index}
            currentMonth={currentMonth}
            selectedDay={selectedDay}
            events={getEventsForDay(day, events, filters)}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </div>
  )
}
