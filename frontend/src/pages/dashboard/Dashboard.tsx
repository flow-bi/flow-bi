import { addDays, format, parseISO } from "date-fns";
import { Building2, Clock, Plus, Sparkles } from "lucide-react";

import { BRAND_DEEP, BRAND_LINE, BRAND_PRIMARY, BRAND_SOFT } from "@/constants/brand";
import { EVENT_COLORS, EVENT_TYPE_LABELS } from "@/constants/events";
import { formatKoFull, TODAY, TODAY_STR } from "@/lib/date";
import { AI_SUGGESTIONS } from "@/mocks/ai";
import { CURRENT_USER } from "@/mocks/current-user";
import { EVENTS } from "@/mocks/events";
import { RESERVATIONS } from "@/mocks/rooms";

import type { View } from "@/types/navigation";

export function Dashboard({ onNav }: { onNav: (v: View) => void }) {
  const todayEvents = EVENTS.filter((e) => e.start.startsWith(TODAY_STR));
  const todayReservations = RESERVATIONS.filter((r) => r.date === TODAY_STR);
  const thisWeekEnd = format(addDays(TODAY, 7), "yyyy-MM-dd");
  const weekCount = EVENTS.filter((e) => {
    const d = e.start.split(" ")[0];
    return d >= TODAY_STR && d <= thisWeekEnd;
  }).length;

  const upcoming = EVENTS.filter((e) => e.start.split(" ")[0] > TODAY_STR)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            안녕하세요, {CURRENT_USER.name} {CURRENT_USER.jobGrade}님
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{formatKoFull(TODAY)}</p>
        </div>
        <button
          onClick={() => onNav("calendar")}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Plus className="w-4 h-4" />
          일정 등록
        </button>
      </div>

      <section
        className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4 rounded-2xl border p-5 overflow-hidden"
        style={{
          borderColor: BRAND_LINE,
          background:
            "linear-gradient(135deg, rgba(255,255,255,.92) 0%, rgba(242,237,255,.96) 58%, rgba(232,251,247,.72) 100%)",
          boxShadow: "0 18px 45px rgba(92, 70, 155, .11)",
        }}
      >
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" style={{ color: BRAND_PRIMARY }} />
          </div>
          <div>
            <p className="text-xs font-bold text-violet-600 mb-1">AI 업무 비서</p>
            <h3 className="text-xl font-bold text-foreground">오늘 확인할 일을 먼저 정리했어요</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              13시 디자인 QA 전에 회의록을 확인하고, 16시 이후 가능한 회의실을 확보하는 흐름을 추천합니다.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {AI_SUGGESTIONS.slice(0, 2).map((item) => (
                <button
                  key={item}
                  onClick={() => onNav("aiChat")}
                  className="px-3 py-1.5 rounded-full bg-white border border-violet-100 text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white/75 border border-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-foreground">AI 채팅 미리보기</span>
            <button onClick={() => onNav("aiChat")} className="text-xs font-bold text-violet-600">
              열기 →
            </button>
          </div>
          <div className="space-y-2">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-violet-50 px-3 py-2 text-sm text-violet-950">
              오늘 오후 일정과 회의실 예약을 한 번에 정리해드릴게요.
            </div>
            <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md px-3 py-2 text-sm text-white" style={{ backgroundColor: BRAND_PRIMARY }}>
              디자인 QA 전에 필요한 것만 알려줘
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "오늘 일정", value: todayEvents.length, unit: "건", color: BRAND_PRIMARY, bg: BRAND_SOFT },
          { label: "오늘 회의실 예약", value: todayReservations.length, unit: "건", color: BRAND_DEEP, bg: "#EFE8FF" },
          { label: "소속 조직", value: 1, unit: "개", color: "#059669", bg: "#ECFDF5" },
          { label: "이번 주 일정", value: weekCount, unit: "건", color: "#D97706", bg: "#FFFBEB" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div
              className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
              style={{ backgroundColor: s.bg }}
            >
              <span className="text-sm font-bold" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {s.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today events */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">오늘의 일정</h3>
            <button
              onClick={() => onNav("calendar")}
              className="text-xs text-violet-600 hover:underline font-semibold"
            >
              전체보기 →
            </button>
          </div>
          {todayEvents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              오늘 등록된 일정이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayEvents.map((ev) => {
                const c = EVENT_COLORS[ev.type];
                const time = `${ev.start.split(" ")[1]} – ${ev.end.split(" ")[1]}`;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-1 h-9 rounded-full ${c.bar} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text} flex-shrink-0`}
                    >
                      {EVENT_TYPE_LABELS[ev.type]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side cards */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">오늘 회의실 예약</h3>
              <button
                onClick={() => onNav("rooms")}
                className="text-xs text-violet-600 hover:underline font-semibold"
              >
                예약하기 →
              </button>
            </div>
            <div className="px-5 py-3 space-y-3">
              {todayReservations.length === 0 ? (
                <p className="py-5 text-center text-sm text-muted-foreground">오늘 예약이 없습니다.</p>
              ) : (
                todayReservations.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{r.roomName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.start} – {r.end}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">예정 일정</h3>
            </div>
            <div className="px-5 py-3 space-y-3">
              {upcoming.length === 0 ? (
                <p className="py-5 text-center text-sm text-muted-foreground">예정 일정이 없습니다.</p>
              ) : (
                upcoming.map((ev) => {
                  const c = EVENT_COLORS[ev.type];
                  const dateStr = ev.start.split(" ")[0];
                  const time = ev.start.split(" ")[1];
                  const d = parseISO(dateStr);
                  return (
                    <div key={ev.id} className="flex items-start gap-3 py-0.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${c.dot}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {d.getMonth() + 1}/{d.getDate()} {time}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

