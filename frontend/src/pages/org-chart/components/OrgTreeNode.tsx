import { ChevronDown, ChevronRight } from 'lucide-react'

import type { OrgNode } from '../types/orgChart'

interface OrgTreeNodeProps {
  node: OrgNode
  depth: number
  selectedId: number | null
  expanded: Set<number>
  memberCounts: Record<number, number>
  onSelect: (org: OrgNode) => void
  onToggle: (id: number) => void
}

export function OrgTreeNode({
  node,
  depth,
  selectedId,
  expanded,
  memberCounts,
  onSelect,
  onToggle,
}: OrgTreeNodeProps) {
  const isExpanded = expanded.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0
  const memberCount = memberCounts[node.id] ?? 0

  return (
    <div>
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-violet-50 text-violet-700' : 'hover:bg-muted/60 text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) {
              onToggle(node.id)
            }
          }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : null}
        </button>
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            node.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-gray-300'
          }`}
        />
        <span className="text-[13px] font-medium truncate flex-1">{node.name}</span>
        {memberCount > 0 && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{memberCount}명</span>
        )}
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <OrgTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            memberCounts={memberCounts}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </div>
  )
}
