import { useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Plus, X } from "lucide-react";

import { BRAND_PRIMARY } from "@/constants/brand";
import { EVENT_COLORS, EVENT_TYPE_LABELS } from "@/constants/events";
import { TODAY } from "@/lib/date";
import { EVENTS } from "@/mocks/events";

import type { EventType } from "@/types/events";

import { FILTER_OPTS, KO_WEEKDAYS } from "./calendar.constants";
import { formatMonthYear, getEventsForDay } from "./calendar.lib";

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<Date>(TODAY);
  const [filters, setFilters] = useState<Record<EventType, boolean>>({
    personal: true,
    org: true,
    all: true,
  });
  const [showModal, setShowModal] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const selectedEvents = getEventsForDay(selectedDay, EVENTS, filters);

  return (
    <div className="flex h-full min-h-0">
      {/* Calendar main */}
      <div className="flex-1 flex flex-col p-5 min-w-0 gap-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h2 className="text-sm font-bold text-foreground w-32 text-center">
              {formatMonthYear(currentMonth)}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => {
                setCurrentMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
                setSelectedDay(TODAY);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              오늘
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {FILTER_OPTS.map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => setFilters((f) => ({ ...f, [type]: !f[type] }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filters[type]
                    ? "bg-card border-border text-foreground shadow-sm"
                    : "bg-transparent border-transparent text-muted-foreground opacity-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white ml-1"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Plus className="w-3.5 h-3.5" />
              일정 추가
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden min-h-0">
          <div className="grid grid-cols-7 border-b border-border">
            {KO_WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`py-2.5 text-center text-xs font-bold ${
                  i === 0 ? "text-rose-500" : i === 6 ? "text-violet-500" : "text-muted-foreground"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(88px, 1fr)" }}>
            {days.map((d, i) => {
              const dayEvs = getEventsForDay(d, EVENTS, filters);
              const inMonth = isSameMonth(d, currentMonth);
              const isSelected = isSameDay(d, selectedDay);
              const isCurrentDay = isToday(d);
              const dow = d.getDay();

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(d)}
                  className={`border-r border-b border-border p-1.5 cursor-pointer transition-colors ${
                    i % 7 === 6 ? "border-r-0" : ""
                  } ${!inMonth ? "bg-muted/30" : isSelected ? "bg-violet-50/70" : "hover:bg-muted/20"}`}
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                      isCurrentDay
                        ? "bg-violet-600 text-white"
                        : isSelected
                        ? "bg-violet-100 text-violet-700"
                        : !inMonth
                        ? "text-muted-foreground/40"
                        : dow === 0
                        ? "text-rose-500"
                        : dow === 6
                        ? "text-violet-500"
                        : "text-foreground"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvs.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${
                          EVENT_COLORS[ev.type].bg
                        } ${EVENT_COLORS[ev.type].text}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvs.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayEvs.length - 2}건
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      <div className="w-64 flex-shrink-0 border-l border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-sm font-bold text-foreground">
            {selectedDay.getMonth() + 1}월 {selectedDay.getDate()}일 (
            {KO_WEEKDAYS[selectedDay.getDay()]})
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{selectedEvents.length}개의 일정</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {selectedEvents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">일정이 없습니다.</div>
          ) : (
            selectedEvents.map((ev) => {
              const c = EVENT_COLORS[ev.type];
              return (
                <div
                  key={ev.id}
                  className="bg-background border border-border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-1 rounded-full flex-shrink-0 mt-0.5 ${c.bar}`}
                      style={{ minHeight: "2rem" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-snug">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.start.split(" ")[1]} – {ev.end.split(" ")[1]}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text}`}
                      >
                        {EVENT_TYPE_LABELS[ev.type]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New event modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="font-bold text-base text-foreground">새 일정 등록</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">제목</label>
                <input
                  type="text"
                  placeholder="일정 제목 입력"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">시작</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">종료</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">대상</label>
                <select className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none bg-white">
                  <option>개인 일정</option>
                  <option>조직 일정</option>
                  <option>전사 일정</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

