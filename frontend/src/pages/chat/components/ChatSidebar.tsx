import { ChatSidebarHeader } from './ChatSidebarHeader'
import { ChatThreadList } from './ChatThreadList'

import type { ChatThread } from '../types/chat'

interface ChatSidebarProps {
  threads: ChatThread[]
  selectedThreadId: string
  onSelectThread: (threadId: string) => void
}

export function ChatSidebar({ threads, selectedThreadId, onSelectThread }: ChatSidebarProps) {
  return (
    <section className="border-r border-border bg-violet-50/45 min-w-0">
      <ChatSidebarHeader />
      <ChatThreadList
        threads={threads}
        selectedThreadId={selectedThreadId}
        onSelectThread={onSelectThread}
      />
    </section>
  )
}
