import { useState } from 'react'

import { AiDailySummaryPanel } from './components/AiDailySummaryPanel'
import { TeamStatusPanel } from './components/TeamStatusPanel'
import { TodaySchedulePanel } from './components/TodaySchedulePanel'
import { WeeklySchedulePanel } from './components/WeeklySchedulePanel'
import {
  aiDashboardSummary,
  dashboardSchedules,
  teamMemberStatuses,
  weeklyScheduleSummaries,
} from './mock/dashboardMock'

function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState('2026-07-03')
  const [selectedAction, setSelectedAction] = useState('')

  return (
    <div className="dashboard-page">
      <div className="page-toolbar">
        <div>
          <p className="section-label">Dashboard</p>
          <h2>오늘의 업무 상황</h2>
        </div>
      </div>

      <section className="dashboard-grid">
        <AiDailySummaryPanel
          selectedAction={selectedAction}
          summary={aiDashboardSummary}
          onActionSelect={setSelectedAction}
        />
        <TodaySchedulePanel schedules={dashboardSchedules} />
        <TeamStatusPanel members={teamMemberStatuses} />
        <WeeklySchedulePanel
          selectedDate={selectedDate}
          weeklySummaries={weeklyScheduleSummaries}
          onDateSelect={setSelectedDate}
        />
      </section>
    </div>
  )
}

export default DashboardPage
