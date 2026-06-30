import { useState, type FormEvent } from "react";
import { MessageCircle, Search, Send, Sparkles } from "lucide-react";

import { Avatar } from "@/components/shared/Avatar";
import { BRAND_PRIMARY } from "@/constants/brand";

import { CHAT_THREADS } from "./chat.mock";

export function ChatPage() {
  const [selectedThreadId, setSelectedThreadId] = useState(CHAT_THREADS[0].id);
  const [draft, setDraft] = useState("");
  const selectedThread = CHAT_THREADS.find((thread) => thread.id === selectedThreadId) ?? CHAT_THREADS[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDraft("");
  };

  return (
    <div className="p-6 h-full">
      <div className="bg-card border border-border rounded-3xl overflow-hidden h-full min-h-[680px] grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <section className="border-r border-border bg-violet-50/45 min-w-0">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">업무 채팅</h2>
                <p className="text-xs text-muted-foreground mt-0.5">팀 채널과 DM을 한 곳에서 확인</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5" style={{ color: BRAND_PRIMARY }} />
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="채팅방 검색"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-violet-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>

          <div className="p-3 space-y-2">
            {CHAT_THREADS.map((thread) => {
              const isActive = selectedThread.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left rounded-2xl p-3 transition-all ${
                    isActive ? "bg-white shadow-sm ring-1 ring-violet-100" : "hover:bg-white/70"
                  }`}
                >
                  <div className="flex gap-3">
                    <Avatar name={thread.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{thread.name}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{thread.time}</span>
                      </div>
                      <p className="text-[11px] text-violet-600 font-bold mt-0.5">{thread.type}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{thread.last}</p>
                    </div>
                    {thread.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col min-w-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={selectedThread.name} />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground truncate">{selectedThread.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedThread.members.length}명 참여 · {selectedThread.type}
                </p>
              </div>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              AI 요약
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-violet-50/35">
            <div className="mx-auto w-fit px-3 py-1 rounded-full bg-white border border-violet-100 text-[11px] text-muted-foreground">
              오늘 대화
            </div>
            {selectedThread.messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.mine ? "justify-end" : "justify-start"}`}>
                {!msg.mine && <Avatar name={msg.from} size="sm" />}
                <div className={`max-w-[76%] ${msg.mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!msg.mine && <span className="text-xs font-bold text-foreground mb-1">{msg.from}</span>}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.mine
                        ? "rounded-tr-md text-white"
                        : "rounded-tl-md bg-white border border-violet-100 text-foreground"
                    }`}
                    style={msg.mine ? { backgroundColor: BRAND_PRIMARY } : undefined}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white">
            <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`${selectedThread.name}에 메시지 보내기`}
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND_PRIMARY }}
                aria-label="채팅 메시지 보내기"
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

