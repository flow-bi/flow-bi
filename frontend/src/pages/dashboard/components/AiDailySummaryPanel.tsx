import type { AiSummary } from '../types/dashboard'

type AiDailySummaryPanelProps = {
  summary: AiSummary
  onActionSelect: (action: string) => void
  selectedAction: string
}

export function AiDailySummaryPanel({
  onActionSelect,
  selectedAction,
  summary,
}: AiDailySummaryPanelProps) {
  return (
    <article className="panel ai-assistant-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">AI Assistant</p>
          <h2>AI 오늘 일정 요약</h2>
        </div>
        <span className="success-badge">Mock</span>
      </div>
      <div className="ai-summary">
        <p>{summary.response}</p>
        <div className="shortcut-list">
          {summary.suggestedActions.map((action) => (
            <button
              className={selectedAction === action ? 'shortcut-button active' : 'shortcut-button'}
              key={action}
              type="button"
              onClick={() => {
                onActionSelect(action)
              }}
            >
              {action}
            </button>
          ))}
        </div>
        <div className="selection-preview" role="status">
          {selectedAction.length > 0
            ? `선택한 추천 액션: ${selectedAction}`
            : '추천 액션을 선택하면 다음 작업 후보가 표시됩니다.'}
        </div>
      </div>
    </article>
  )
}
