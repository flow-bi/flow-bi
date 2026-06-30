import { useState, type FormEvent } from "react";
import { AlertTriangle, Building2, Eye, EyeOff } from "lucide-react";

import { BRAND_PRIMARY } from "@/constants/brand";

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (loginId === "jihoon.kim" && password === "1234") {
        onLogin();
      } else {
        setError("아이디 또는 비밀번호가 일치하지 않습니다.");
        setLoading(false);
      }
    }, 700);
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14"
        style={{
          background:
            "radial-gradient(circle at 18% 12%, rgba(229, 214, 255, .36), transparent 34%), linear-gradient(150deg, #4A327F 0%, #7C5CFF 58%, #B8A8FF 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CorpLink</span>
        </div>

        <div>
          <h1 className="text-white text-5xl font-bold leading-tight mb-5">
            업무의 모든 것을<br />한 곳에서
          </h1>
          <p className="text-white/55 text-base leading-relaxed mb-14">
            일정 관리, 조직도, 회의실 예약까지.<br />
            AI 채팅, 일정, 회의실 예약까지 연결되는 통합 업무 플랫폼입니다.
          </p>
          <div className="grid grid-cols-3 gap-10">
            {[
              { label: "임직원", value: "248명" },
              { label: "조직", value: "24팀" },
              { label: "회의실", value: "12실" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-white text-3xl font-bold">{s.value}</div>
                <div className="text-white/45 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">© 2026 Corporation Inc. All rights reserved.</p>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Building2 className="w-5 h-5" style={{ color: BRAND_PRIMARY }} />
            <span className="font-bold text-lg" style={{ color: BRAND_PRIMARY }}>CorpLink</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">로그인</h2>
          <p className="text-muted-foreground text-sm mb-7">
            계정 정보를 입력하여 시스템에 접속하세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">아이디</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="로그인 아이디"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-lg px-3.5 py-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-1"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-1">데모 계정</p>
            <code className="text-xs text-foreground">jihoon.kim / 1234</code>
          </div>
        </div>
      </div>
    </div>
  );
}

