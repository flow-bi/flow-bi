import { useState, type FormEvent } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

import { BRAND_DEEP, BRAND_LINE, BRAND_PRIMARY } from "@/constants/brand";
import { AI_SUGGESTIONS } from "@/mocks/ai";

import type { AiMessage } from "./ai-chat.types";

export function AIChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 1,
      role: "ai",
      text: "좋은 아침입니다. 오늘은 회의 3건, 확인할 채팅 6개, 마감 업무 2건이 있습니다.",
      time: "09:00",
    },
    {
      id: 2,
      role: "user",
      text: "디자인 QA 전에 봐야 할 것만 정리해줘.",
      time: "09:02",
    },
    {
      id: 3,
      role: "ai",
      text: "우선 어제 회의록, QA 코멘트 4개, B회의실 장비 상태를 확인하면 됩니다. 필요하면 디자인팀 채널에 요약을 공유할게요.",
      time: "09:02",
    },
  ]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: "user", text: trimmed, time: "방금" },
      {
        id: prev.length + 2,
        role: "ai",
        text: "요청을 기준으로 일정, 회의실, 채팅 알림을 함께 확인했습니다. 관련 업무 카드에 바로 이어질 수 있게 정리해둘게요.",
        time: "방금",
      },
    ]);
    setInput("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="p-6 h-full">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 h-full min-h-[680px]">
        <aside
          className="rounded-3xl border p-5 flex flex-col overflow-hidden"
          style={{
            borderColor: BRAND_LINE,
            background:
              "linear-gradient(160deg, #FFFFFF 0%, #F2EDFF 56%, #E8FBF7 100%)",
            boxShadow: "0 24px 60px rgba(92, 70, 155, .13)",
          }}
        >
          <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-5">
            <Bot className="w-8 h-8" style={{ color: BRAND_PRIMARY }} />
          </div>
          <p className="text-xs font-bold text-violet-600 mb-2">AI Command Center</p>
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            자연어로 업무 흐름을 바로 실행하세요
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            일정, 회의실, 팀 채팅, 알림을 하나의 대화 흐름으로 연결하는 화면입니다.
          </p>

          <div className="mt-6 space-y-2">
            {AI_SUGGESTIONS.map((item) => (
              <button
                key={item}
                onClick={() => sendMessage(item)}
                className="w-full text-left rounded-2xl bg-white/85 border border-white px-4 py-3 text-sm font-bold text-violet-800 hover:bg-white transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-2xl p-4 text-white" style={{ backgroundColor: BRAND_DEEP }}>
            <p className="text-xs font-bold text-white/65">오늘의 AI 요약</p>
            <p className="text-sm mt-2 leading-relaxed">
              13시 디자인 QA 전에 회의록 확인, 16시 이후 회의실 후보 2곳 검토, PM 채널 릴리즈 노트 확인이 필요합니다.
            </p>
          </div>
        </aside>

        <section className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col min-w-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">AI 업무 대화</h3>
              <p className="text-xs text-muted-foreground mt-0.5">더미 데이터 기반 프로토타입 대화</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
              실시간 준비됨
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-violet-50/40">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white border border-violet-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                    </div>
                  )}
                  <div className={`max-w-[76%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "rounded-tr-md text-white"
                          : "rounded-tl-md bg-white border border-violet-100 text-foreground"
                      }`}
                      style={isUser ? { backgroundColor: BRAND_PRIMARY } : undefined}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white">
            <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 오늘 회의 전 체크리스트 만들어줘"
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND_PRIMARY }}
                aria-label="AI 메시지 보내기"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

