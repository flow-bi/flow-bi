import { ds, TODAY_STR } from "@/lib/date";

export const MEETING_ROOMS = [
  { id: 1, name: "A회의실", location: "3층 동관", capacity: 6, status: "ACTIVE", desc: "화상회의 장비 완비" },
  { id: 2, name: "B회의실", location: "3층 서관", capacity: 12, status: "ACTIVE", desc: "대형 디스플레이, 화이트보드" },
  { id: 3, name: "C회의실", location: "2층 동관", capacity: 4, status: "ACTIVE", desc: "소규모 미팅 최적화" },
  { id: 4, name: "대강당", location: "1층", capacity: 100, status: "ACTIVE", desc: "전사 행사 및 발표용" },
  { id: 5, name: "D회의실", location: "4층 서관", capacity: 8, status: "INACTIVE", desc: "리노베이션 중 (9월 완공 예정)" },
];

export const RESERVATIONS = [
  { id: 1, roomId: 1, roomName: "A회의실", title: "주간 스프린트 회의", start: "09:00", end: "10:00", date: TODAY_STR, by: "김지훈" },
  { id: 2, roomId: 3, roomName: "C회의실", title: "1:1 미팅 - 이수정", start: "10:00", end: "10:30", date: ds(1), by: "김지훈" },
  { id: 3, roomId: 4, roomName: "대강당", title: "하반기 사업 계획 발표", start: "15:00", end: "17:00", date: TODAY_STR, by: "이수정" },
  { id: 4, roomId: 2, roomName: "B회의실", title: "디자인 리뷰", start: "14:00", end: "15:00", date: ds(1), by: "박민수" },
];

