import { Plus } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

interface DashboardHeaderProps {
  userName: string
  jobGrade: string
  todayLabel: string
  onCreateSchedule: () => void
}

export function DashboardHeader({
  userName,
  jobGrade,
  todayLabel,
  onCreateSchedule,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          안녕하세요, {userName} {jobGrade}님
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">{todayLabel}</p>
      </div>
      <button
        onClick={onCreateSchedule}
        className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        <Plus className="w-4 h-4" />
        일정 등록
      </button>
    </div>
  )
}
