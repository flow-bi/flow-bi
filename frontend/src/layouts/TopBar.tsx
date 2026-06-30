import { Bell, Search } from "lucide-react";

import { Avatar } from "@/components/shared/Avatar";
import { CURRENT_USER } from "@/mocks/current-user";

import type { View } from "@/types/navigation";

const PAGE_TITLES: Record<View, string> = {
  dashboard: "대시보드",
  aiChat: "AI 채팅",
  chat: "채팅",
  calendar: "캘린더",
  orgchart: "조직도",
  rooms: "회의실",
  mypage: "마이페이지",
  admin: "시스템 관리",
};

export function TopBar({ active }: { active: View }) {
  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-6">
      <span className="text-[15px] font-bold text-foreground">{PAGE_TITLES[active]}</span>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="검색..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-muted text-sm w-48 focus:outline-none"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-border ml-1">
          <Avatar name={CURRENT_USER.name} size="sm" />
          <div className="hidden md:block leading-tight">
            <p className="text-xs font-bold text-foreground">{CURRENT_USER.name}</p>
            <p className="text-[10px] text-muted-foreground">{CURRENT_USER.department}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

