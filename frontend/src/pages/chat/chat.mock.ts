export const CHAT_THREADS = [
  {
    id: "design",
    name: "디자인팀 채널",
    type: "팀 채널",
    unread: 4,
    last: "수현: QA 코멘트 반영본 공유했어요.",
    time: "10:42",
    members: ["김지훈", "이수정", "박민수", "최유진"],
    messages: [
      { id: 1, from: "이수정", text: "오늘 13시 디자인 QA 전에 코멘트 우선순위만 정리하면 될 것 같아요.", time: "10:12" },
      { id: 2, from: "박민수", text: "회의실은 B회의실로 잡아두었습니다. 화면 공유 장비도 확인했어요.", time: "10:18" },
      { id: 3, from: "김지훈", text: "좋습니다. AI 요약 카드에 나온 체크리스트 기준으로 리뷰하겠습니다.", time: "10:31", mine: true },
      { id: 4, from: "최유진", text: "QA 코멘트 반영본 공유했어요. 헤더와 채팅 영역 톤도 같이 봐주세요.", time: "10:42" },
    ],
  },
  {
    id: "pm",
    name: "PM 프로젝트방",
    type: "프로젝트",
    unread: 2,
    last: "Alex: 릴리즈 노트 초안 확인 부탁드립니다.",
    time: "09:56",
    members: ["김지훈", "Alex", "민지"],
    messages: [
      { id: 1, from: "Alex", text: "릴리즈 노트 초안 확인 부탁드립니다.", time: "09:56" },
      { id: 2, from: "김지훈", text: "오전 회의 끝나고 확인해서 코멘트 남기겠습니다.", time: "09:58", mine: true },
    ],
  },
  {
    id: "suhyun",
    name: "수현",
    type: "DM",
    unread: 0,
    last: "회의록 공유 완료했습니다.",
    time: "어제",
    members: ["김지훈", "수현"],
    messages: [
      { id: 1, from: "수현", text: "어제 회의록 공유 완료했습니다.", time: "어제 18:20" },
      { id: 2, from: "김지훈", text: "확인했습니다. 오늘 스탠드업 전에 한 번 더 볼게요.", time: "어제 18:33", mine: true },
    ],
  },
];
