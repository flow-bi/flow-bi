export interface ChatMessage {
  id: number
  from: string
  text: string
  time: string
  mine?: boolean
}

export interface ChatThread {
  id: string
  name: string
  type: string
  unread: number
  last: string
  time: string
  members: string[]
  messages: ChatMessage[]
}
