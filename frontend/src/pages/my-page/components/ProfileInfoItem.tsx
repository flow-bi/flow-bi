import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface ProfileInfoItemProps {
  icon: LucideIcon
  label: string
  value: string
  iconClassName?: string
  iconWrapperClassName?: string
  children?: ReactNode
}

export function ProfileInfoItem({
  icon: Icon,
  label,
  value,
  iconClassName = 'text-muted-foreground',
  iconWrapperClassName = 'bg-muted',
  children,
}: ProfileInfoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconWrapperClassName}`}
      >
        <Icon className={`w-4 h-4 ${iconClassName}`} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
        {children}
      </div>
    </div>
  )
}
