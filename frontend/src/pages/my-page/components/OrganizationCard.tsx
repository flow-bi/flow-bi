import { Users } from 'lucide-react'

import { ProfileInfoItem } from './ProfileInfoItem'

import type { MyPageUser } from '../types/myPage'

interface OrganizationCardProps {
  user: MyPageUser
}

export function OrganizationCard({ user }: OrganizationCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-foreground mb-4">소속 조직</h3>
      <ProfileInfoItem
        icon={Users}
        label="주소속"
        value={user.department}
        iconClassName="text-violet-500"
        iconWrapperClassName="bg-violet-50"
      >
        <p className="text-xs text-muted-foreground">개발본부</p>
      </ProfileInfoItem>
    </div>
  )
}
