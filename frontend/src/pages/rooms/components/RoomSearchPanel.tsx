import { roomStatusOptions } from '../constants/roomOptions'

import type { RoomSearchFilters } from '../types/rooms'

type RoomSearchPanelProps = {
  filters: RoomSearchFilters
  onFiltersChange: (filters: RoomSearchFilters) => void
  onReset: () => void
  onSearch: () => void
}

export function RoomSearchPanel({
  filters,
  onFiltersChange,
  onReset,
  onSearch,
}: RoomSearchPanelProps) {
  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <div className="panel-header">
        <div>
          <p className="section-label">Rooms</p>
          <h2>회의실 검색</h2>
        </div>
      </div>

      <div className="filter-row rooms-filter-row">
        <label className="field compact">
          <span>날짜</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => {
              onFiltersChange({ ...filters, date: event.target.value })
            }}
          />
        </label>
        <label className="field compact">
          <span>시작 시간</span>
          <input
            type="time"
            value={filters.startTime}
            onChange={(event) => {
              onFiltersChange({ ...filters, startTime: event.target.value })
            }}
          />
        </label>
        <label className="field compact">
          <span>종료 시간</span>
          <input
            type="time"
            value={filters.endTime}
            onChange={(event) => {
              onFiltersChange({ ...filters, endTime: event.target.value })
            }}
          />
        </label>
        <label className="field compact">
          <span>인원</span>
          <input
            min="1"
            placeholder="예: 4"
            type="number"
            value={filters.minCapacity}
            onChange={(event) => {
              onFiltersChange({ ...filters, minCapacity: event.target.value })
            }}
          />
        </label>
        <label className="field compact">
          <span>상태</span>
          <select
            value={filters.status}
            onChange={(event) => {
              onFiltersChange({
                ...filters,
                status: event.target.value as RoomSearchFilters['status'],
              })
            }}
          >
            {roomStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button inline" type="submit">
          검색
        </button>
        <button className="secondary-button" type="button" onClick={onReset}>
          초기화
        </button>
      </div>
    </form>
  )
}
