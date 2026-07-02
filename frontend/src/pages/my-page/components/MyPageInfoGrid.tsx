import { BasicInfoCard } from './BasicInfoCard'
import { OrganizationCard } from './OrganizationCard'
import { RoleInfoCard } from './RoleInfoCard'

import type { MyPageUser } from '../types/myPage'

interface MyPageInfoGridProps {
  user: MyPageUser
}

export function MyPageInfoGrid({ user }: MyPageInfoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <BasicInfoCard user={user} />
      <div className="space-y-4">
        <RoleInfoCard user={user} />
        <OrganizationCard user={user} />
      </div>
    </div>
  )
}
