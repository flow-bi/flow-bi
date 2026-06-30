import { ds } from "@/lib/date";

import type { AppEvent } from "@/types/events";

export const EVENTS: AppEvent[] = [
  { id: 1, title: "주간 스프린트 회의", start: `${ds(0)} 09:00`, end: `${ds(0)} 10:00`, type: "org" },
  { id: 2, title: "신규 채용 인터뷰", start: `${ds(0)} 13:00`, end: `${ds(0)} 14:30`, type: "personal" },
  { id: 3, title: "하반기 사업 계획 발표", start: `${ds(0)} 15:00`, end: `${ds(0)} 17:00`, type: "all" },
  { id: 4, title: "1:1 미팅 - 이수정", start: `${ds(1)} 10:00`, end: `${ds(1)} 10:30`, type: "personal" },
  { id: 5, title: "디자인 리뷰", start: `${ds(1)} 14:00`, end: `${ds(1)} 15:00`, type: "org" },
  { id: 6, title: "개발팀 전체 회의", start: `${ds(2)} 09:30`, end: `${ds(2)} 11:00`, type: "org" },
  { id: 7, title: "분기 성과 리뷰", start: `${ds(5)} 14:00`, end: `${ds(5)} 16:00`, type: "all" },
  { id: 8, title: "팀 워크숍 준비", start: `${ds(-1)} 11:00`, end: `${ds(-1)} 12:00`, type: "org" },
  { id: 9, title: "온보딩 미팅", start: `${ds(-2)} 09:00`, end: `${ds(-2)} 09:30`, type: "personal" },
  { id: 10, title: "전사 보안 교육", start: `${ds(-7)} 13:00`, end: `${ds(-7)} 15:00`, type: "all" },
  { id: 11, title: "제품 로드맵 검토", start: `${ds(3)} 10:00`, end: `${ds(3)} 11:30`, type: "org" },
  { id: 12, title: "고객사 미팅", start: `${ds(4)} 15:00`, end: `${ds(4)} 16:00`, type: "personal" },
  { id: 13, title: "개발본부 월례 회의", start: `${ds(-3)} 14:00`, end: `${ds(-3)} 16:00`, type: "org" },
  { id: 14, title: "팀 점심 모임", start: `${ds(6)} 12:00`, end: `${ds(6)} 13:30`, type: "org" },
];

