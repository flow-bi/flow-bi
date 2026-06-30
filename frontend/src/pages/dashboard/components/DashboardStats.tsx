import type { DashboardStat } from '../types/dashboard'

interface DashboardStatsProps {
  stats: DashboardStat[]
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
          <div
            className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
            style={{ backgroundColor: stat.bg }}
          >
            <span className="text-sm font-bold" style={{ color: stat.color }}>
              {stat.value}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {stat.value}
            <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>
          </p>
        </div>
      ))}
    </div>
  )
}
