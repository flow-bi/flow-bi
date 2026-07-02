import { ChatMessageBubble } from './ChatMessageBubble'

import type { ChatMessage } from '../types/chat'

interface ChatMessageListProps {
  messages: ChatMessage[]
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-violet-50/35">
      <div className="mx-auto w-fit px-3 py-1 rounded-full bg-white border border-violet-100 text-[11px] text-muted-foreground">
        오늘 대화
      </div>
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}
