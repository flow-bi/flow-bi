import { Send } from 'lucide-react'
import { type FormEvent } from 'react'

import { BRAND_PRIMARY } from '@/constants/brand'

interface AIChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function AIChatComposer({ value, onChange, onSubmit }: AIChatComposerProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white">
      <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 오늘 회의 전 체크리스트 만들어줘"
          className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
        />
        <button
          type="submit"
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          style={{ backgroundColor: BRAND_PRIMARY }}
          aria-label="AI 메시지 보내기"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
