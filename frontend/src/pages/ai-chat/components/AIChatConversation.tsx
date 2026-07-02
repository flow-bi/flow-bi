import { AIChatComposer } from './AIChatComposer'
import { AIChatMessageList } from './AIChatMessageList'

import type { AiMessage } from '../types/ai-chat'

interface AIChatConversationProps {
  messages: AiMessage[]
  input: string
  onInputChange: (value: string) => void
  onSubmit: () => void
}

export function AIChatConversation({
  messages,
  input,
  onInputChange,
  onSubmit,
}: AIChatConversationProps) {
  return (
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

      <AIChatMessageList messages={messages} />
      <AIChatComposer value={input} onChange={onInputChange} onSubmit={onSubmit} />
    </section>
  )
}
