interface LoginTextFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function LoginTextField({ id, label, placeholder, value, onChange }: LoginTextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 transition-colors"
      />
    </div>
  )
}
