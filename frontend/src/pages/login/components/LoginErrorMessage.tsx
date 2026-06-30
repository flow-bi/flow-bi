import { AlertTriangle } from 'lucide-react'

interface LoginErrorMessageProps {
  message: string
}

export function LoginErrorMessage({ message }: LoginErrorMessageProps) {
  if (!message) {
    return null
  }

  return (
    <div className="flex items-center gap-2.5 text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-lg px-3.5 py-2.5">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
