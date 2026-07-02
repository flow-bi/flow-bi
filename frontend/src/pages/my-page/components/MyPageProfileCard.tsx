import { StatusBadge } from '@/components/shared/StatusBadge'
import { BRAND_PRIMARY } from '@/constants/brand'

import type { MyPageUser } from '../types/myPage'

interface MyPageProfileCardProps {
  user: MyPageUser
}

export function MyPageProfileCard({ user }: MyPageProfileCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
      <div
        className="h-24"
        style={{
          background: 'linear-gradient(135deg, #4A327F 0%, #7C5CFF 58%, #B8A8FF 100%)',
        }}
      />
      <div className="px-6 pt-4 pb-6 relative">
        <div
          className="-mt-14 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow mb-3"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          {user.name.charAt(0)}
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {user.jobGrade} · {user.position}
            </p>
            <p className="text-muted-foreground text-sm">{user.department}</p>
          </div>
          <StatusBadge status={user.status} />
        </div>
      </div>
    </div>
  )
}
