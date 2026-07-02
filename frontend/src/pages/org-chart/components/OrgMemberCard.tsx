import { Avatar } from '@/components/shared/Avatar'

import type { OrgMember } from '../types/orgChart'

interface OrgMemberCardProps {
  member: OrgMember
}

export function OrgMemberCard({ member }: OrgMemberCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <Avatar name={member.name} size="md" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {member.grade} · {member.position}
        </p>
        <span
          className={`mt-1.5 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded ${
            member.type === '겸직' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
          }`}
        >
          {member.type}
        </span>
      </div>
    </div>
  )
}
