import { MessageCircle, Search } from 'lucide-react'

import { BRAND_PRIMARY } from '@/constants/brand'

export function ChatSidebarHeader() {
  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">업무 채팅</h2>
          <p className="text-xs text-muted-foreground mt-0.5">팀 채널과 DM을 한 곳에서 확인</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
          <MessageCircle className="w-5 h-5" style={{ color: BRAND_PRIMARY }} />
        </div>
      </div>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="채팅방 검색"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-violet-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
      </div>
    </div>
  )
}
