import { Eye, EyeOff } from 'lucide-react'

interface LoginPasswordFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  showPassword: boolean
  onChange: (value: string) => void
  onTogglePassword: () => void
}

export function LoginPasswordField({
  id,
  label,
  placeholder,
  value,
  showPassword,
  onChange,
  onTogglePassword,
}: LoginPasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 transition-colors"
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
