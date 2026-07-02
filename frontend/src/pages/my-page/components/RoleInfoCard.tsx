import { Briefcase, UserCheck } from 'lucide-react'

import { ProfileInfoItem } from './ProfileInfoItem'

import type { MyPageUser } from '../types/myPage'

interface RoleInfoCardProps {
  user: MyPageUser
}

export function RoleInfoCard({ user }: RoleInfoCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-foreground mb-4">직급 · 직책</h3>
      <div className="space-y-3.5">
        <ProfileInfoItem icon={Briefcase} label="직급" value={user.jobGrade} />
        <ProfileInfoItem icon={UserCheck} label="직책" value={user.position} />
      </div>
    </div>
  )
}
