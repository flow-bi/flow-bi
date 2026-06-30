interface MeetingRoomsHeaderProps {
  capacityFilter: number
  onCapacityFilterChange: (value: number) => void
}

export function MeetingRoomsHeader({
  capacityFilter,
  onCapacityFilterChange,
}: MeetingRoomsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-base font-bold text-foreground">회의실 현황</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          오늘 회의실 예약 현황을 확인하고 예약하세요.
        </p>
      </div>
      <select
        value={capacityFilter}
        onChange={(event) => onCapacityFilterChange(Number(event.target.value))}
        className="px-3 py-2 rounded-lg border border-border text-sm bg-card focus:outline-none"
      >
        <option value={0}>전체 인원</option>
        <option value={4}>4인 이상</option>
        <option value={8}>8인 이상</option>
        <option value={20}>20인 이상</option>
      </select>
    </div>
  )
}
