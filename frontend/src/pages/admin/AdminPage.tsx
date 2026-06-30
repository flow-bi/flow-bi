import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Avatar } from "@/components/shared/Avatar";
import { RoomStatusBadge } from "@/components/shared/RoomStatusBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BRAND_PRIMARY } from "@/constants/brand";
import { MEETING_ROOMS } from "@/mocks/rooms";

import { ALL_USERS, JOB_GRADES, POSITIONS } from "./admin.mock";
import type { AdminTab } from "./admin.types";

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = ALL_USERS.filter(
    (u) =>
      u.name.includes(userSearch) ||
      u.empNo.includes(userSearch) ||
      u.loginId.includes(userSearch)
  );

  const TABS: { id: AdminTab; label: string }[] = [
    { id: "users", label: "사용자 관리" },
    { id: "rooms", label: "회의실 관리" },
    { id: "grades", label: "직급·직책" },
  ];

  return (
    <div className="p-6">
      <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
            <h3 className="text-sm font-bold text-foreground">
              사용자 목록 ({filteredUsers.length}명)
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="이름, 사번, 아이디"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border border-border text-sm w-44 focus:outline-none"
                />
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus className="w-3.5 h-3.5" />
                사용자 등록
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["이름", "사번", "아이디", "소속부서", "직급", "직책", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <span className="font-semibold text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.empNo}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.loginId}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.dept}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.grade}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.position}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "rooms" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">
              회의실 목록 ({MEETING_ROOMS.length}개)
            </h3>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Plus className="w-3.5 h-3.5" />
              회의실 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["회의실명", "위치", "수용 인원", "설명", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MEETING_ROOMS.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.location}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{r.capacity}인</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.desc}</td>
                    <td className="px-4 py-3">
                      <RoomStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "grades" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                직급 관리 ({JOB_GRADES.length}개)
              </h3>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus className="w-3.5 h-3.5" />
                추가
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["순서", "직급명", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {JOB_GRADES.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{g.order}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{g.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                직책 관리 ({POSITIONS.length}개)
              </h3>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus className="w-3.5 h-3.5" />
                추가
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["순서", "직책명", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {POSITIONS.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.order}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

