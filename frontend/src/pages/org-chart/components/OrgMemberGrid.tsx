import { OrgMemberCard } from './OrgMemberCard'

import type { OrgMember } from '../types/orgChart'

interface OrgMemberGridProps {
  members: OrgMember[]
}

export function OrgMemberGrid({ members }: OrgMemberGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {members.map((member) => (
        <OrgMemberCard key={member.id} member={member} />
      ))}
    </div>
  )
}
