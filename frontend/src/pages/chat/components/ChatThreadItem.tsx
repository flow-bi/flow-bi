import { Avatar } from '@/components/shared/Avatar'

import type { ChatThread } from '../types/chat'

interface ChatThreadItemProps {
  thread: ChatThread
  isActive: boolean
  onSelect: (threadId: string) => void
}

export function ChatThreadItem({ thread, isActive, onSelect }: ChatThreadItemProps) {
  return (
    <button
      onClick={() => onSelect(thread.id)}
      className={`w-full text-left rounded-2xl p-3 transition-all ${
        isActive ? 'bg-white shadow-sm ring-1 ring-violet-100' : 'hover:bg-white/70'
      }`}
    >
      <div className="flex gap-3">
        <Avatar name={thread.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{thread.name}</p>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{thread.time}</span>
          </div>
          <p className="text-[11px] text-violet-600 font-bold mt-0.5">{thread.type}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{thread.last}</p>
        </div>
        {thread.unread > 0 && (
          <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {thread.unread}
          </span>
        )}
      </div>
    </button>
  )
}
