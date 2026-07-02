import { OrgMemberGrid } from './OrgMemberGrid'
import { OrgMembersEmptyState } from './OrgMembersEmptyState'
import { OrgMembersHeader } from './OrgMembersHeader'
import { OrgNoSelectionState } from './OrgNoSelectionState'

import type { OrgMember, OrgNode } from '../types/orgChart'

interface OrgMembersPanelProps {
  selectedOrg: OrgNode | null
  members: OrgMember[]
}

export function OrgMembersPanel({ selectedOrg, members }: OrgMembersPanelProps) {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {selectedOrg ? (
        <>
          <OrgMembersHeader selectedOrg={selectedOrg} memberCount={members.length} />

          {members.length === 0 ? <OrgMembersEmptyState /> : <OrgMemberGrid members={members} />}
        </>
      ) : (
        <OrgNoSelectionState />
      )}
    </div>
  )
}
