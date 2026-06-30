export interface AiMessage {
  id: number;
  role: "ai" | "user";
  text: string;
  time: string;
}

