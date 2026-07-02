import { Plus, Search } from 'lucide-react'

import { Avatar } from '@/components/shared/Avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BRAND_PRIMARY } from '@/constants/brand'

import type { AdminUser } from '../types/admin'

interface UsersPanelProps {
  users: AdminUser[]
  search: string
  onSearchChange: (search: string) => void
}

const USER_TABLE_HEADERS = ['이름', '사번', '아이디', '소속부서', '직급', '직책', '상태']

export function UsersPanel({ users, search, onSearchChange }: UsersPanelProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <h3 className="text-sm font-bold text-foreground">사용자 목록 ({users.length}명)</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="이름, 사번, 아이디"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg border border-border text-sm w-44 focus:outline-none"
            />
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Plus className="w-3.5 h-3.5" />
            사용자 등록
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {USER_TABLE_HEADERS.map((header) => (
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
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} size="sm" />
                    <span className="font-semibold text-foreground">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.empNo}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{user.loginId}</td>
                <td className="px-4 py-3 text-xs text-foreground">{user.dept}</td>
                <td className="px-4 py-3 text-xs text-foreground">{user.grade}</td>
                <td className="px-4 py-3 text-xs text-foreground">{user.position}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
