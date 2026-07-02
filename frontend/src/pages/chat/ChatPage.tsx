import { useState } from 'react'

import { ChatConversation } from './components/ChatConversation'
import { ChatSidebar } from './components/ChatSidebar'
import { CHAT_THREADS } from './mock/chat'

export function ChatPage() {
  const [selectedThreadId, setSelectedThreadId] = useState(CHAT_THREADS[0].id)
  const [draft, setDraft] = useState('')
  const selectedThread =
    CHAT_THREADS.find((thread) => thread.id === selectedThreadId) ?? CHAT_THREADS[0]

  const handleSubmit = () => {
    setDraft('')
  }

  return (
    <div className="p-6 h-full">
      <div className="bg-card border border-border rounded-3xl overflow-hidden h-full min-h-[680px] grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <ChatSidebar
          threads={CHAT_THREADS}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
        />
        <ChatConversation
          thread={selectedThread}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
