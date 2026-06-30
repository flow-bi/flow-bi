import { useState } from "react";

import { Sidebar } from "@/layouts/Sidebar";
import { TopBar } from "@/layouts/TopBar";
import { AIChatPage } from "@/pages/ai-chat/AIChatPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { CalendarPage } from "@/pages/calendar/CalendarPage";
import { ChatPage } from "@/pages/chat/ChatPage";
import { Dashboard } from "@/pages/dashboard/Dashboard";
import { LoginPage } from "@/pages/login/LoginPage";
import { MeetingRoomsPage } from "@/pages/meeting-rooms/MeetingRoomsPage";
import { MyPage } from "@/pages/my-page/MyPage";
import { OrgChartPage } from "@/pages/org-chart/OrgChartPage";

import type { View } from "@/types/navigation";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState<View>("dashboard");

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar active={activeView} onNav={setActiveView} onLogout={() => setIsLoggedIn(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar active={activeView} />
        <main className="flex-1 overflow-y-auto">
          {activeView === "dashboard" && <Dashboard onNav={setActiveView} />}
          {activeView === "aiChat" && <AIChatPage />}
          {activeView === "chat" && <ChatPage />}
          {activeView === "calendar" && (
            <div className="h-full flex flex-col">
              <CalendarPage />
            </div>
          )}
          {activeView === "orgchart" && (
            <div className="h-full flex flex-col">
              <OrgChartPage />
            </div>
          )}
          {activeView === "rooms" && <MeetingRoomsPage />}
          {activeView === "mypage" && <MyPage />}
          {activeView === "admin" && <AdminPage />}
        </main>
      </div>
    </div>
  );
}

