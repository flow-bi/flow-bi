import { Sparkles } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

import type { AiMessage } from '../types/ai-chat'

interface AIChatMessageListProps {
  messages: AiMessage[]
}

export function AIChatMessageList({ messages }: AIChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-violet-50/40">
      {messages.map((msg) => {
        const isUser = msg.role === 'user'

        return (
          <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-white border border-violet-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-violet-500" />
              </div>
            )}
            <div className={`max-w-[76%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'rounded-tr-md text-white'
                    : 'rounded-tl-md bg-white border border-violet-100 text-foreground'
                }`}
                style={isUser ? { backgroundColor: BRAND_PRIMARY } : undefined}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
