import type { EventType } from '@/types/events'

export const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export const FILTER_OPTS: { type: EventType; label: string; color: string }[] = [
  { type: 'personal', label: '개인', color: 'bg-violet-500' },
  { type: 'org', label: '조직', color: 'bg-purple-500' },
  { type: 'all', label: '전사', color: 'bg-rose-500' },
]
