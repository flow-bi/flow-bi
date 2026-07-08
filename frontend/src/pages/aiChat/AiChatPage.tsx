import { useState } from 'react'

const shortcuts = ['내 오늘 일정 알려줘', '내일 오전 회의실 찾아줘', '프로젝트 일정 등록 도와줘']

function AiChatPage() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      text: '안녕하세요. 일정 확인, 회의실 예약, 조직 조회를 도와드릴 수 있습니다.',
    },
  ])

  const handleSend = () => {
    const trimmedMessage = message.trim()

    if (trimmedMessage.length === 0) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: `user-${Date.now()}`, role: 'user', text: trimmedMessage },
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: 'mock 응답입니다. 실제 AI 연동 전까지 확인 카드가 필요한 작업은 여기서 검토합니다.',
      },
    ])
    setMessage('')
  }

  return (
    <section className="page-stack">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">AI Assistant</p>
            <h2>업무 요청</h2>
          </div>
          <span className="success-badge">Mock</span>
        </div>

        <div className="shortcut-list">
          {shortcuts.map((shortcut) => (
            <button
              className="shortcut-button"
              key={shortcut}
              type="button"
              onClick={() => {
                setMessage(shortcut)
              }}
            >
              {shortcut}
            </button>
          ))}
        </div>
      </article>

      <article className="panel chat-panel">
        <div className="chat-list">
          {messages.map((chatMessage) => (
            <div className={`chat-message ${chatMessage.role}`} key={chatMessage.id}>
              {chatMessage.text}
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            placeholder="AI 비서에게 요청하기"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
            }}
          />
          <button className="primary-button inline" type="button" onClick={handleSend}>
            전송
          </button>
        </div>
      </article>
    </section>
  )
}

export default AiChatPage
