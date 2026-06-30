import type { LoginCredentials } from '../types/login'

interface DemoAccountCardProps {
  demoAccount: LoginCredentials
}

export function DemoAccountCard({ demoAccount }: DemoAccountCardProps) {
  return (
    <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-1">데모 계정</p>
      <code className="text-xs text-foreground">
        {demoAccount.loginId} / {demoAccount.password}
      </code>
    </div>
  )
}
