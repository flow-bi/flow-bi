import { getEffectiveRoomStatus, getRoomStatusLabel } from '../lib/roomUtils'

import type { Room, RoomSearchFilters } from '../types/rooms'

type RoomListProps = {
  filters: RoomSearchFilters
  rooms: Room[]
  isOverviewOpen: boolean
  onReserve: (room: Room) => void
}

export function RoomList({ filters, isOverviewOpen, onReserve, rooms }: RoomListProps) {
  return (
    <section
      className={isOverviewOpen ? 'panel rooms-list-panel selected' : 'panel rooms-list-panel'}
      aria-labelledby="rooms-list-title"
    >
      <div className="panel-header">
        <div>
          <p className="section-label">Room List</p>
          <h2 id="rooms-list-title">회의실 목록</h2>
        </div>
        <span className="success-badge">{rooms.length}개</span>
      </div>

      {rooms.length > 0 ? (
        <div className="rooms-card-grid">
          {rooms.map((room) => {
            const effectiveStatus = getEffectiveRoomStatus(room, filters)

            return (
              <article className="room-detail-card" key={room.roomId}>
                <div>
                  <p className="section-label">{room.location}</p>
                  <h3>{room.roomName}</h3>
                  <p>
                    최대 {room.capacity}명 · {room.equipment.join(', ')}
                  </p>
                </div>
                <div className="room-card-footer">
                  <span className={`status-badge ${effectiveStatus.toLowerCase()}`}>
                    {getRoomStatusLabel(effectiveStatus)}
                  </span>
                  <button
                    className="primary-button inline"
                    disabled={effectiveStatus !== 'AVAILABLE'}
                    type="button"
                    onClick={() => {
                      onReserve(room)
                    }}
                  >
                    {effectiveStatus === 'AVAILABLE' ? '예약' : '예약 불가'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">검색 조건에 맞는 회의실이 없습니다.</div>
      )}
    </section>
  )
}
