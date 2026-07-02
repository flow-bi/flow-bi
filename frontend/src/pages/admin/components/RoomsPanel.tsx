import { Plus } from 'lucide-react'

import { RoomStatusBadge } from '@/components/shared/RoomStatusBadge'
import { BRAND_PRIMARY } from '@/constants/brand'

import type { AdminRoom } from '../types/admin'

interface RoomsPanelProps {
  rooms: AdminRoom[]
}

const ROOM_TABLE_HEADERS = ['회의실명', '위치', '수용 인원', '설명', '상태']

export function RoomsPanel({ rooms }: RoomsPanelProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">회의실 목록 ({rooms.length}개)</h3>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Plus className="w-3.5 h-3.5" />
          회의실 추가
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {ROOM_TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-bold text-foreground">{room.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{room.location}</td>
                <td className="px-4 py-3 text-xs text-foreground">{room.capacity}인</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{room.desc}</td>
                <td className="px-4 py-3">
                  <RoomStatusBadge status={room.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
