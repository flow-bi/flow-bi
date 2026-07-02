import type { AdminTab } from '../types/admin'

interface AdminTabsProps {
  tabs: { id: AdminTab; label: string }[]
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
}

export function AdminTabs({ tabs, activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
