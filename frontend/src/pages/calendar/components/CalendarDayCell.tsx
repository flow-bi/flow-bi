import { isSameDay, isSameMonth, isToday } from 'date-fns'

import { EVENT_COLORS } from '@/constants/events'

import type { AppEvent } from '@/types/events'

interface CalendarDayCellProps {
  day: Date
  index: number
  currentMonth: Date
  selectedDay: Date
  events: AppEvent[]
  onSelectDay: (day: Date) => void
}

export function CalendarDayCell({
  day,
  index,
  currentMonth,
  selectedDay,
  events,
  onSelectDay,
}: CalendarDayCellProps) {
  const inMonth = isSameMonth(day, currentMonth)
  const isSelected = isSameDay(day, selectedDay)
  const isCurrentDay = isToday(day)
  const dow = day.getDay()

  return (
    <div
      onClick={() => onSelectDay(day)}
      className={`border-r border-b border-border p-1.5 cursor-pointer transition-colors ${
        index % 7 === 6 ? 'border-r-0' : ''
      } ${!inMonth ? 'bg-muted/30' : isSelected ? 'bg-violet-50/70' : 'hover:bg-muted/20'}`}
    >
      <div
        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
          isCurrentDay
            ? 'bg-violet-600 text-white'
            : isSelected
              ? 'bg-violet-100 text-violet-700'
              : !inMonth
                ? 'text-muted-foreground/40'
                : dow === 0
                  ? 'text-rose-500'
                  : dow === 6
                    ? 'text-violet-500'
                    : 'text-foreground'
        }`}
      >
        {day.getDate()}
      </div>
      <div className="space-y-0.5">
        {events.slice(0, 2).map((ev) => (
          <div
            key={ev.id}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${
              EVENT_COLORS[ev.type].bg
            } ${EVENT_COLORS[ev.type].text}`}
          >
            {ev.title}
          </div>
        ))}
        {events.length > 2 && (
          <div className="text-[10px] text-muted-foreground pl-1">+{events.length - 2}건</div>
        )}
      </div>
    </div>
  )
}
