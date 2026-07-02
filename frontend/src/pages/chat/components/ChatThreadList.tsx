import { ChatThreadItem } from './ChatThreadItem'

import type { ChatThread } from '../types/chat'

interface ChatThreadListProps {
  threads: ChatThread[]
  selectedThreadId: string
  onSelectThread: (threadId: string) => void
}

export function ChatThreadList({ threads, selectedThreadId, onSelectThread }: ChatThreadListProps) {
  return (
    <div className="p-3 space-y-2">
      {threads.map((thread) => (
        <ChatThreadItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === selectedThreadId}
          onSelect={onSelectThread}
        />
      ))}
    </div>
  )
}
