import { useState } from 'react'

import { OrgChartTreePanel } from './components/OrgChartTreePanel'
import { OrgMembersPanel } from './components/OrgMembersPanel'
import { ORG_MEMBERS, ORG_TREE } from './mock/orgChart'

import type { OrgNode } from './types/orgChart'

export function OrgChartPage() {
  const [selectedOrg, setSelectedOrg] = useState<OrgNode | null>(
    () => ORG_TREE.children[1].children[0],
  )
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([1, 2, 3, 4]))

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const members = selectedOrg ? (ORG_MEMBERS[selectedOrg.id] ?? []) : []
  const memberCounts = Object.fromEntries(
    Object.entries(ORG_MEMBERS).map(([orgId, members]) => [Number(orgId), members.length]),
  )

  return (
    <div className="flex h-full min-h-0">
      <OrgChartTreePanel
        tree={ORG_TREE}
        selectedId={selectedOrg?.id ?? null}
        expanded={expanded}
        memberCounts={memberCounts}
        onSelect={setSelectedOrg}
        onToggle={toggleExpanded}
      />

      <OrgMembersPanel selectedOrg={selectedOrg} members={members} />
    </div>
  )
}
