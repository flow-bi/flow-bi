import { Search } from 'lucide-react'

import { OrgTreeNode } from './OrgTreeNode'

import type { OrgNode } from '../types/orgChart'

interface OrgChartTreePanelProps {
  tree: OrgNode
  selectedId: number | null
  expanded: Set<number>
  memberCounts: Record<number, number>
  onSelect: (org: OrgNode) => void
  onToggle: (id: number) => void
}

export function OrgChartTreePanel({
  tree,
  selectedId,
  expanded,
  memberCounts,
  onSelect,
  onToggle,
}: OrgChartTreePanelProps) {
  return (
    <div className="w-72 flex-shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-foreground">조직도</span>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="조직 검색"
            className="pl-6 pr-2 py-1 rounded-lg bg-muted text-xs w-28 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <OrgTreeNode
          node={tree}
          depth={0}
          selectedId={selectedId}
          expanded={expanded}
          memberCounts={memberCounts}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      </div>
    </div>
  )
}
