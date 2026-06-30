import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { Avatar } from "@/components/shared/Avatar";

import { ORG_MEMBERS, ORG_TREE } from "./org-chart.mock";
import type { OrgNode } from "./org-chart.types";

function OrgTreeNode({
  node,
  depth,
  selectedId,
  expanded,
  onSelect,
  onToggle,
}: {
  node: OrgNode;
  depth: number;
  selectedId: number | null;
  expanded: Set<number>;
  onSelect: (n: OrgNode) => void;
  onToggle: (id: number) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const memberCount = ORG_MEMBERS[node.id]?.length ?? 0;

  return (
    <div>
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
          isSelected ? "bg-violet-50 text-violet-700" : "hover:bg-muted/60 text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
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
            node.status === "ACTIVE" ? "bg-emerald-400" : "bg-gray-300"
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
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

export function OrgChartPage() {
  const [selectedOrg, setSelectedOrg] = useState<OrgNode | null>(
    ORG_TREE.children[1].children[0]
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1, 2, 3, 4]));

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const members = selectedOrg ? (ORG_MEMBERS[selectedOrg.id] ?? []) : [];

  return (
    <div className="flex h-full min-h-0">
      {/* Tree */}
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
            node={ORG_TREE}
            depth={0}
            selectedId={selectedOrg?.id ?? null}
            expanded={expanded}
            onSelect={setSelectedOrg}
            onToggle={toggleExpanded}
          />
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedOrg ? (
          <>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">{selectedOrg.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <code className="text-xs text-muted-foreground font-mono">{selectedOrg.code}</code>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    selectedOrg.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {selectedOrg.status === "ACTIVE" ? "활성" : "비활성"}
                </span>
                <span className="text-xs text-muted-foreground">구성원 {members.length}명</span>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                소속 구성원이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    <Avatar name={m.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.grade} · {m.position}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.type === "겸직"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {m.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            조직을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}

