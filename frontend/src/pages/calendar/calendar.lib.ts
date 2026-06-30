import { format } from "date-fns";

import type { AppEvent, EventType } from "@/types/events";

export const formatMonthYear = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;

export const getEventsForDay = (day: Date, events: AppEvent[], filters: Record<EventType, boolean>) => {
  const dayStr = format(day, "yyyy-MM-dd");
  return events.filter((e) => e.start.startsWith(dayStr) && filters[e.type]);
};

