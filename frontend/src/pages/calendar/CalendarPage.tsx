import { addMonths, subMonths } from 'date-fns'
import { useState } from 'react'

import { TODAY } from '@/lib/date'
import { EVENTS } from '@/mocks/events'

import { CalendarGrid } from './components/CalendarGrid'
import { CalendarToolbar } from './components/CalendarToolbar'
import { DayDetailPanel } from './components/DayDetailPanel'
import { NewEventModal } from './components/NewEventModal'
import { getCalendarDays, getEventsForDay } from './lib/calendar'

import type { CalendarFilters } from './types/calendar'

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  )
  const [selectedDay, setSelectedDay] = useState<Date>(TODAY)
  const [filters, setFilters] = useState<CalendarFilters>({
    personal: true,
    org: true,
    all: true,
  })
  const [showModal, setShowModal] = useState(false)

  const days = getCalendarDays(currentMonth)
  const selectedEvents = getEventsForDay(selectedDay, EVENTS, filters)

  const goToToday = () => {
    setCurrentMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
    setSelectedDay(TODAY)
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 flex flex-col p-5 min-w-0 gap-4">
        <CalendarToolbar
          currentMonth={currentMonth}
          filters={filters}
          onPreviousMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
          onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
          onToday={goToToday}
          onToggleFilter={(type) => setFilters((f) => ({ ...f, [type]: !f[type] }))}
          onOpenNewEvent={() => setShowModal(true)}
        />

        <CalendarGrid
          currentMonth={currentMonth}
          selectedDay={selectedDay}
          days={days}
          events={EVENTS}
          filters={filters}
          onSelectDay={setSelectedDay}
        />
      </div>

      <DayDetailPanel selectedDay={selectedDay} events={selectedEvents} />

      {showModal && <NewEventModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
