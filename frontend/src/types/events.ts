export type EventType = "personal" | "org" | "all";

export interface AppEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  type: EventType;
}

