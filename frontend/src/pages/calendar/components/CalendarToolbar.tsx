import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

import { FILTER_OPTS } from '../constants/calendar'
import { formatMonthYear } from '../lib/calendar'

import type { CalendarFilters } from '../types/calendar'
import type { EventType } from '@/types/events'

interface CalendarToolbarProps {
  currentMonth: Date
  filters: CalendarFilters
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onToggleFilter: (type: EventType) => void
  onOpenNewEvent: () => void
}

export function CalendarToolbar({
  currentMonth,
  filters,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onToggleFilter,
  onOpenNewEvent,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviousMonth}
          className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h2 className="text-sm font-bold text-foreground w-32 text-center">
          {formatMonthYear(currentMonth)}
        </h2>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={onToday}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          오늘
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {FILTER_OPTS.map(({ type, label, color }) => (
          <button
            key={type}
            onClick={() => onToggleFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filters[type]
                ? 'bg-card border-border text-foreground shadow-sm'
                : 'bg-transparent border-transparent text-muted-foreground opacity-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
          </button>
        ))}
        <button
          onClick={onOpenNewEvent}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white ml-1"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Plus className="w-3.5 h-3.5" />
          일정 추가
        </button>
      </div>
    </div>
  )
}
