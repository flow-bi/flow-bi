import type { AiMessage } from '../types/ai-chat'

export const INITIAL_AI_MESSAGES: AiMessage[] = [
  {
    id: 1,
    role: 'ai',
    text: '좋은 아침입니다. 오늘은 회의 3건, 확인할 채팅 6개, 마감 업무 2건이 있습니다.',
    time: '09:00',
  },
  {
    id: 2,
    role: 'user',
    text: '디자인 QA 전에 봐야 할 것만 정리해줘.',
    time: '09:02',
  },
  {
    id: 3,
    role: 'ai',
    text: '우선 어제 회의록, QA 코멘트 4개, B회의실 장비 상태를 확인하면 됩니다. 필요하면 디자인팀 채널에 요약을 공유할게요.',
    time: '09:02',
  },
]
