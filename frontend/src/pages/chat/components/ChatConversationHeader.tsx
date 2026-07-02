import { Sparkles } from 'lucide-react'

import { Avatar } from '@/components/shared/Avatar'

import type { ChatThread } from '../types/chat'

interface ChatConversationHeaderProps {
  thread: ChatThread
}

export function ChatConversationHeader({ thread }: ChatConversationHeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={thread.name} />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground truncate">{thread.name}</h3>
          <p className="text-xs text-muted-foreground">
            {thread.members.length}명 참여 · {thread.type}
          </p>
        </div>
      </div>
      <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold">
        <Sparkles className="w-3.5 h-3.5" />
        AI 요약
      </button>
    </div>
  )
}
