import { Avatar } from '@/components/shared/Avatar'
import { BRAND_PRIMARY } from '@/constants/brand'

import type { ChatMessage } from '../types/chat'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  return (
    <div className={`flex gap-3 ${message.mine ? 'justify-end' : 'justify-start'}`}>
      {!message.mine && <Avatar name={message.from} size="sm" />}
      <div className={`max-w-[76%] ${message.mine ? 'items-end' : 'items-start'} flex flex-col`}>
        {!message.mine && (
          <span className="text-xs font-bold text-foreground mb-1">{message.from}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            message.mine
              ? 'rounded-tr-md text-white'
              : 'rounded-tl-md bg-white border border-violet-100 text-foreground'
          }`}
          style={message.mine ? { backgroundColor: BRAND_PRIMARY } : undefined}
        >
          {message.text}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 px-1">{message.time}</span>
      </div>
    </div>
  )
}
