import type { OrgNode } from '../types/orgChart'

interface OrgMembersHeaderProps {
  selectedOrg: OrgNode
  memberCount: number
}

export function OrgMembersHeader({ selectedOrg, memberCount }: OrgMembersHeaderProps) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-foreground">{selectedOrg.name}</h2>
      <div className="flex items-center gap-3 mt-1">
        <code className="text-xs text-muted-foreground font-mono">{selectedOrg.code}</code>
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${
            selectedOrg.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {selectedOrg.status === 'ACTIVE' ? '활성' : '비활성'}
        </span>
        <span className="text-xs text-muted-foreground">구성원 {memberCount}명</span>
      </div>
    </div>
  )
}
