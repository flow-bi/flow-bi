import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { ScheduleCalendar } from './features/schedule-calendar/ScheduleCalendar'
import { ScheduleCreateModal } from './features/schedule-create/ScheduleCreateModal'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function CalendarStarter() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <>
      <ScheduleCalendar />
      <button
        className="calendar-starter__create schedule-calendar__create"
        onClick={() => setIsCreateOpen(true)}
        type="button"
      >
        일정 추가
      </button>
      {isCreateOpen && <ScheduleCreateModal creatorId={1} onClose={() => setIsCreateOpen(false)} />}
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CalendarStarter />
    </QueryClientProvider>
  )
}

export default App
