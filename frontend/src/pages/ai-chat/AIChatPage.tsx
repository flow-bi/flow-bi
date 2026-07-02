import { useState } from 'react'

import { AI_SUGGESTIONS } from '@/mocks/ai'

import { AIChatConversation } from './components/AIChatConversation'
import { AIChatSidebar } from './components/AIChatSidebar'
import { INITIAL_AI_MESSAGES } from './mock/ai-chat'

import type { AiMessage } from './types/ai-chat'

export function AIChatPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AiMessage[]>(INITIAL_AI_MESSAGES)

  const sendMessage = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', text: trimmed, time: '방금' },
      {
        id: prev.length + 2,
        role: 'ai',
        text: '요청을 기준으로 일정, 회의실, 채팅 알림을 함께 확인했습니다. 관련 업무 카드에 바로 이어질 수 있게 정리해둘게요.',
        time: '방금',
      },
    ])
    setInput('')
  }

  return (
    <div className="p-6 h-full">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 h-full min-h-[680px]">
        <AIChatSidebar suggestions={AI_SUGGESTIONS} onSelectSuggestion={sendMessage} />
        <AIChatConversation
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={() => sendMessage(input)}
        />
      </div>
    </div>
  )
}

