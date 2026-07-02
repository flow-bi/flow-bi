import { Plus } from 'lucide-react'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { BRAND_PRIMARY } from '@/constants/brand'

import type { AdminRankItem } from '../types/admin'

interface RankTableProps {
  title: string
  nameHeader: string
  items: AdminRankItem[]
}

export function RankTable({ title, nameHeader, items }: RankTableProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">
          {title} ({items.length}개)
        </h3>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Plus className="w-3.5 h-3.5" />
          추가
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            {['순서', nameHeader, '상태'].map((header) => (
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
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.order}</td>
              <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
