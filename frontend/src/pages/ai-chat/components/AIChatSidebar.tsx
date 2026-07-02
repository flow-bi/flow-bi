import { Bot } from 'lucide-react'

import { BRAND_DEEP, BRAND_LINE, BRAND_PRIMARY } from '@/constants/brand'

interface AIChatSidebarProps {
  suggestions: string[]
  onSelectSuggestion: (text: string) => void
}

export function AIChatSidebar({ suggestions, onSelectSuggestion }: AIChatSidebarProps) {
  return (
    <aside
      className="rounded-3xl border p-5 flex flex-col overflow-hidden"
      style={{
        borderColor: BRAND_LINE,
        background: 'linear-gradient(160deg, #FFFFFF 0%, #F2EDFF 56%, #E8FBF7 100%)',
        boxShadow: '0 24px 60px rgba(92, 70, 155, .13)',
      }}
    >
      <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-5">
        <Bot className="w-8 h-8" style={{ color: BRAND_PRIMARY }} />
      </div>
      <p className="text-xs font-bold text-violet-600 mb-2">AI Command Center</p>
      <h2 className="text-2xl font-bold text-foreground leading-tight">
        자연어로 업무 흐름을 바로 실행하세요
      </h2>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
        일정, 회의실, 팀 채팅, 알림을 하나의 대화 흐름으로 연결하는 화면입니다.
      </p>

      <div className="mt-6 space-y-2">
        {suggestions.map((item) => (
          <button
            key={item}
            onClick={() => onSelectSuggestion(item)}
            className="w-full text-left rounded-2xl bg-white/85 border border-white px-4 py-3 text-sm font-bold text-violet-800 hover:bg-white transition-colors"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-auto rounded-2xl p-4 text-white" style={{ backgroundColor: BRAND_DEEP }}>
        <p className="text-xs font-bold text-white/65">오늘의 AI 요약</p>
        <p className="text-sm mt-2 leading-relaxed">
          13시 디자인 QA 전에 회의록 확인, 16시 이후 회의실 후보 2곳 검토, PM 채널 릴리즈
          노트 확인이 필요합니다.
        </p>
      </div>
    </aside>
  )
}
