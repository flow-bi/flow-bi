import { Sparkles } from 'lucide-react'

import { BRAND_LINE, BRAND_PRIMARY } from '@/constants/brand'

interface AiAssistantPanelProps {
  suggestions: string[]
  onOpenChat: () => void
}

export function AiAssistantPanel({ suggestions, onOpenChat }: AiAssistantPanelProps) {
  return (
    <section
      className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4 rounded-2xl border p-5 overflow-hidden"
      style={{
        borderColor: BRAND_LINE,
        background:
          'linear-gradient(135deg, rgba(255,255,255,.92) 0%, rgba(242,237,255,.96) 58%, rgba(232,251,247,.72) 100%)',
        boxShadow: '0 18px 45px rgba(92, 70, 155, .11)',
      }}
    >
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6" style={{ color: BRAND_PRIMARY }} />
        </div>
        <div>
          <p className="text-xs font-bold text-violet-600 mb-1">AI 업무 비서</p>
          <h3 className="text-xl font-bold text-foreground">오늘 확인할 일을 먼저 정리했어요</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            13시 디자인 QA 전에 회의록을 확인하고, 16시 이후 가능한 회의실을 확보하는 흐름을
            추천합니다.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((item) => (
              <button
                key={item}
                onClick={onOpenChat}
                className="px-3 py-1.5 rounded-full bg-white border border-violet-100 text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white/75 border border-white rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-foreground">AI 채팅 미리보기</span>
          <button onClick={onOpenChat} className="text-xs font-bold text-violet-600">
            열기 →
          </button>
        </div>
        <div className="space-y-2">
          <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-violet-50 px-3 py-2 text-sm text-violet-950">
            오늘 오후 일정과 회의실 예약을 한 번에 정리해드릴게요.
          </div>
          <div
            className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md px-3 py-2 text-sm text-white"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            디자인 QA 전에 필요한 것만 알려줘
          </div>
        </div>
      </div>
    </section>
  )
}
