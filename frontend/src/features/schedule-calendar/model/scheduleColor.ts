import type { ScheduleColorLabel } from '../api/scheduleCalendarApi'

export interface ScheduleColorClasses {
  background: string
  border: string
  text: string
}

export const SCHEDULE_COLOR_CLASSES: Record<ScheduleColorLabel, ScheduleColorClasses> = {
  RED: { background: 'bg-red-100', border: 'border-red-300', text: 'text-red-950' },
  ORANGE: { background: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-950' },
  YELLOW: { background: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-950' },
  GREEN: { background: 'bg-green-100', border: 'border-green-300', text: 'text-green-950' },
  BLUE: { background: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-950' },
  PURPLE: { background: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-950' },
}

const FALLBACK_SCHEDULE_COLOR_CLASSES: ScheduleColorClasses = {
  background: 'bg-slate-100',
  border: 'border-slate-300',
  text: 'text-slate-950',
}

export function getScheduleColorClasses(colorLabel: string): ScheduleColorClasses {
  return SCHEDULE_COLOR_CLASSES[colorLabel as ScheduleColorLabel] ?? FALLBACK_SCHEDULE_COLOR_CLASSES
}
