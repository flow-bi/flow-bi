import { Building2 } from 'lucide-react'

import { formatReservationTimeRange } from '../lib/dashboard'

import type { DashboardReservation } from '../types/dashboard'

interface TodayReservationsCardProps {
  reservations: DashboardReservation[]
  onBook: () => void
}

export function TodayReservationsCard({ reservations, onBook }: TodayReservationsCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">오늘 회의실 예약</h3>
        <button onClick={onBook} className="text-xs text-violet-600 hover:underline font-semibold">
          예약하기 →
        </button>
      </div>
      <div className="px-5 py-3 space-y-3">
        {reservations.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted-foreground">오늘 예약이 없습니다.</p>
        ) : (
          reservations.map((reservation) => (
            <div key={reservation.id} className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{reservation.roomName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatReservationTimeRange(reservation.start, reservation.end)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
