import { ChatComposer } from './ChatComposer'
import { ChatConversationHeader } from './ChatConversationHeader'
import { ChatMessageList } from './ChatMessageList'

import type { ChatThread } from '../types/chat'

interface ChatConversationProps {
  thread: ChatThread
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
}

export function ChatConversation({
  thread,
  draft,
  onDraftChange,
  onSubmit,
}: ChatConversationProps) {
  return (
    <section className="flex flex-col min-w-0">
      <ChatConversationHeader thread={thread} />
      <ChatMessageList messages={thread.messages} />
      <ChatComposer
        value={draft}
        recipientName={thread.name}
        onChange={onDraftChange}
        onSubmit={onSubmit}
      />
    </section>
  )
}
