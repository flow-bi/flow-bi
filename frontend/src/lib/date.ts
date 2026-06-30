import { addDays, format } from "date-fns";

const KO_WEEKDAYS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export const TODAY = new Date();
export const TODAY_STR = format(TODAY, "yyyy-MM-dd");
export const ds = (offset: number) => format(addDays(TODAY, offset), "yyyy-MM-dd");

export const formatKoFull = (d: Date) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${KO_WEEKDAYS_FULL[d.getDay()]}`;

