import type { EventType } from "@/types/events";

export const EVENT_COLORS: Record<EventType, { bar: string; bg: string; text: string; dot: string }> = {
  personal: { bar: "bg-violet-500", bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  org: { bar: "bg-purple-500", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  all: { bar: "bg-rose-500", bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = { personal: "개인", org: "조직", all: "전사" };

