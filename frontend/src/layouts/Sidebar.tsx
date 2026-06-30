import { Bot, Building2, Calendar, LayoutDashboard, LogOut, MessageCircle, Settings, User, Users } from "lucide-react";

import { Avatar } from "@/components/shared/Avatar";
import { CURRENT_USER } from "@/mocks/current-user";

import type { View } from "@/types/navigation";

const NAV = [
  { id: "dashboard" as View, label: "대시보드", icon: LayoutDashboard },
  { id: "aiChat" as View, label: "AI 채팅", icon: Bot },
  { id: "chat" as View, label: "채팅", icon: MessageCircle },
  { id: "calendar" as View, label: "캘린더", icon: Calendar },
  { id: "orgchart" as View, label: "조직도", icon: Users },
  { id: "rooms" as View, label: "회의실", icon: Building2 },
  { id: "mypage" as View, label: "마이페이지", icon: User },
];

export function Sidebar({
  active,
  onNav,
  onLogout,
}: {
  active: View;
  onNav: (v: View) => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className="w-full md:w-52 flex-shrink-0 flex md:flex-col h-auto md:h-screen sticky top-0 z-20 overflow-x-auto md:overflow-visible"
      style={{
        background:
          "linear-gradient(180deg, #4A327F 0%, #5B43B7 52%, #34245F 100%)",
      }}
    >
      <div className="px-4 md:px-5 py-3 md:py-5 border-r md:border-r-0 md:border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:inline text-white font-bold text-[15px] tracking-tight">CorpLink</span>
        </div>
      </div>

      <nav className="flex-1 px-2 md:px-3 py-2 md:py-4 overflow-x-auto md:overflow-y-auto">
        <p className="hidden md:block text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">메뉴</p>
        <div className="flex md:block gap-1 md:space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onNav(id)}
                className={`min-w-max md:min-w-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/8"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-200 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <p className="hidden md:block text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2 mt-5">관리</p>
        <button
          onClick={() => onNav("admin")}
          className={`hidden md:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left ${
            active === "admin"
              ? "bg-white/15 text-white"
              : "text-white/55 hover:text-white hover:bg-white/8"
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span>시스템 관리</span>
          {active === "admin" && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-200 flex-shrink-0" />
          )}
        </button>
      </nav>

      <div className="hidden md:block px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <Avatar name={CURRENT_USER.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold leading-tight truncate">
              {CURRENT_USER.name}
            </p>
            <p className="text-white/40 text-[11px] leading-tight truncate">{CURRENT_USER.jobGrade}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-white/35 hover:text-white/70 transition-colors flex-shrink-0"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

