import { Building2 } from 'lucide-react'

import type { LoginStat } from '../types/login'

interface LoginBrandPanelProps {
  stats: LoginStat[]
}

export function LoginBrandPanel({ stats }: LoginBrandPanelProps) {
  return (
    <div
      className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14"
      style={{
        background:
          'radial-gradient(circle at 18% 12%, rgba(229, 214, 255, .36), transparent 34%), linear-gradient(150deg, #4A327F 0%, #7C5CFF 58%, #B8A8FF 100%)',
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
          업무의 모든 것을
          <br />한 곳에서
        </h1>
        <p className="text-white/55 text-base leading-relaxed mb-14">
          일정 관리, 조직도, 회의실 예약까지.
          <br />
          AI 채팅, 일정, 회의실 예약까지 연결되는 통합 업무 플랫폼입니다.
        </p>
        <div className="grid grid-cols-3 gap-10">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-white text-3xl font-bold">{stat.value}</div>
              <div className="text-white/45 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-white/25 text-xs">© 2026 Corporation Inc. All rights reserved.</p>
    </div>
  )
}
