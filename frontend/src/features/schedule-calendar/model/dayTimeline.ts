const MIN_EVENT_HEIGHT = 24
const MINUTES_PER_DAY = 24 * 60

export interface DayTimelineSchedule {
  id: number
  startAt: string
  endAt: string
}

export interface DayTimelinePlacement {
  id: DayTimelineSchedule['id']
  top: number
  height: number
  column: number
  columnCount: number
}

interface TimelineInterval extends DayTimelinePlacement {
  end: number
}

function seoulDayAndMinute(value: string): { date: string; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '00'

  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minute: Number(part('hour')) * 60 + Number(part('minute')),
  }
}

function compareIdentifiers(
  left: DayTimelineSchedule['id'],
  right: DayTimelineSchedule['id'],
): number {
  return left - right
}

function toTimelineInterval(date: string, schedule: DayTimelineSchedule): TimelineInterval | null {
  const start = seoulDayAndMinute(schedule.startAt)
  const end = seoulDayAndMinute(schedule.endAt)
  const top = Math.max(0, Math.min(MINUTES_PER_DAY, start.date < date ? 0 : start.minute))
  const bottom = Math.max(
    0,
    Math.min(MINUTES_PER_DAY, end.date > date ? MINUTES_PER_DAY : end.minute),
  )

  if (bottom <= top) {
    return null
  }

  return {
    id: schedule.id,
    top,
    height: Math.min(Math.max(bottom - top, MIN_EVENT_HEIGHT), MINUTES_PER_DAY - top),
    end: bottom,
    column: 0,
    columnCount: 1,
  }
}

function assignClusterColumns(cluster: TimelineInterval[]): void {
  const columnEnds: number[] = []

  for (const interval of cluster) {
    const availableColumn = columnEnds.findIndex((end) => end <= interval.top)
    interval.column = availableColumn === -1 ? columnEnds.length : availableColumn
    columnEnds[interval.column] = interval.end
  }

  for (const interval of cluster) {
    interval.columnCount = columnEnds.length
  }
}

export function layoutDayTimelineSchedules(
  date: string,
  schedules: DayTimelineSchedule[],
): DayTimelinePlacement[] {
  const intervals = schedules
    .map((schedule) => toTimelineInterval(date, schedule))
    .filter((interval): interval is TimelineInterval => interval !== null)
    .sort(
      (left, right) =>
        left.top - right.top || left.end - right.end || compareIdentifiers(left.id, right.id),
    )

  const placements: TimelineInterval[] = []
  let cluster: TimelineInterval[] = []
  let clusterEnd = 0

  for (const interval of intervals) {
    if (cluster.length > 0 && interval.top >= clusterEnd) {
      assignClusterColumns(cluster)
      placements.push(...cluster)
      cluster = []
      clusterEnd = 0
    }
    cluster.push(interval)
    clusterEnd = Math.max(clusterEnd, interval.end)
  }
  if (cluster.length > 0) {
    assignClusterColumns(cluster)
    placements.push(...cluster)
  }

  return placements.map(({ id, top, height, column, columnCount }) => ({
    id,
    top,
    height,
    column,
    columnCount,
  }))
}
