import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  User,
  Settings,
  ChevronRight,
  ChevronDown,
  Bell,
  LogOut,
  Plus,
  X,
  Clock,
  MapPin,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Hash,
  Mail,
  Phone,
  Briefcase,
  UserCheck,
  Bot,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  format,
} from "date-fns";

// ================================================================
// TYPES
// ================================================================
type View = "dashboard" | "aiChat" | "chat" | "calendar" | "orgchart" | "rooms" | "mypage" | "admin";
type AdminTab = "users" | "rooms" | "grades";
type EventType = "personal" | "org" | "all";

interface AppEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  type: EventType;
}

interface OrgNode {
  id: number;
  name: string;
  code: string;
  status: string;
  children: OrgNode[];
}

interface AiMessage {
  id: number;
  role: "ai" | "user";
  text: string;
  time: string;
}

// ================================================================
// MOCK DATA
// ================================================================
const TODAY = new Date();
const TODAY_STR = format(TODAY, "yyyy-MM-dd");
const ds = (offset: number) => format(addDays(TODAY, offset), "yyyy-MM-dd");

const CURRENT_USER = {
  id: 1,
  name: "김지훈",
  loginId: "jihoon.kim",
  employeeNo: "EMP-0042",
  email: "jihoon.kim@company.co.kr",
  phone: "010-1234-5678",
  status: "ACTIVE",
  jobGrade: "팀장",
  position: "책임연구원",
  department: "프론트엔드팀",
};

const EVENTS: AppEvent[] = [
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

const MEETING_ROOMS = [
  { id: 1, name: "A회의실", location: "3층 동관", capacity: 6, status: "ACTIVE", desc: "화상회의 장비 완비" },
  { id: 2, name: "B회의실", location: "3층 서관", capacity: 12, status: "ACTIVE", desc: "대형 디스플레이, 화이트보드" },
  { id: 3, name: "C회의실", location: "2층 동관", capacity: 4, status: "ACTIVE", desc: "소규모 미팅 최적화" },
  { id: 4, name: "대강당", location: "1층", capacity: 100, status: "ACTIVE", desc: "전사 행사 및 발표용" },
  { id: 5, name: "D회의실", location: "4층 서관", capacity: 8, status: "INACTIVE", desc: "리노베이션 중 (9월 완공 예정)" },
];

const RESERVATIONS = [
  { id: 1, roomId: 1, roomName: "A회의실", title: "주간 스프린트 회의", start: "09:00", end: "10:00", date: TODAY_STR, by: "김지훈" },
  { id: 2, roomId: 3, roomName: "C회의실", title: "1:1 미팅 - 이수정", start: "10:00", end: "10:30", date: ds(1), by: "김지훈" },
  { id: 3, roomId: 4, roomName: "대강당", title: "하반기 사업 계획 발표", start: "15:00", end: "17:00", date: TODAY_STR, by: "이수정" },
  { id: 4, roomId: 2, roomName: "B회의실", title: "디자인 리뷰", start: "14:00", end: "15:00", date: ds(1), by: "박민수" },
];

const AI_SUGGESTIONS = [
  "오늘 회의 전 확인할 일 정리해줘",
  "디자인팀에 QA 코멘트 공유해줘",
  "16시 이후 가능한 회의실 찾아줘",
];

const CHAT_THREADS = [
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

const ORG_TREE: OrgNode = {
  id: 1, name: "(주)코퍼레이션", code: "ORG-001", status: "ACTIVE",
  children: [
    {
      id: 2, name: "경영지원본부", code: "ORG-002", status: "ACTIVE",
      children: [
        { id: 5, name: "인사팀", code: "ORG-005", status: "ACTIVE", children: [] },
        { id: 6, name: "재무팀", code: "ORG-006", status: "ACTIVE", children: [] },
        { id: 7, name: "총무팀", code: "ORG-007", status: "ACTIVE", children: [] },
      ],
    },
    {
      id: 3, name: "개발본부", code: "ORG-003", status: "ACTIVE",
      children: [
        { id: 8, name: "프론트엔드팀", code: "ORG-008", status: "ACTIVE", children: [] },
        { id: 9, name: "백엔드팀", code: "ORG-009", status: "ACTIVE", children: [] },
        { id: 10, name: "QA팀", code: "ORG-010", status: "ACTIVE", children: [] },
      ],
    },
    {
      id: 4, name: "마케팅본부", code: "ORG-004", status: "ACTIVE",
      children: [
        { id: 11, name: "브랜드팀", code: "ORG-011", status: "ACTIVE", children: [] },
        { id: 12, name: "디지털마케팅팀", code: "ORG-012", status: "ACTIVE", children: [] },
      ],
    },
  ],
};

const ORG_MEMBERS: Record<number, Array<{ id: number; name: string; grade: string; position: string; type: string }>> = {
  1: [{ id: 100, name: "한대표", grade: "대표이사", position: "CEO", type: "주소속" }],
  2: [{ id: 101, name: "박본부장", grade: "상무", position: "경영지원 본부장", type: "주소속" }],
  3: [{ id: 102, name: "정본부장", grade: "상무", position: "개발 본부장", type: "주소속" }],
  4: [{ id: 103, name: "김본부장", grade: "상무", position: "마케팅 본부장", type: "주소속" }],
  5: [
    { id: 8, name: "강현주", grade: "부장", position: "인사팀장", type: "주소속" },
    { id: 9, name: "윤서희", grade: "과장", position: "인사담당자", type: "주소속" },
    { id: 10, name: "오민정", grade: "대리", position: "채용담당자", type: "주소속" },
  ],
  6: [
    { id: 11, name: "임재성", grade: "부장", position: "재무팀장", type: "주소속" },
    { id: 12, name: "장수진", grade: "과장", position: "회계담당자", type: "주소속" },
  ],
  7: [{ id: 13, name: "백승민", grade: "대리", position: "총무담당자", type: "주소속" }],
  8: [
    { id: 1, name: "김지훈", grade: "팀장", position: "책임연구원", type: "주소속" },
    { id: 2, name: "이수정", grade: "대리", position: "선임연구원", type: "주소속" },
    { id: 3, name: "박민수", grade: "과장", position: "연구원", type: "주소속" },
    { id: 4, name: "최유진", grade: "사원", position: "연구원", type: "주소속" },
    { id: 14, name: "류승현", grade: "과장", position: "선임연구원", type: "겸직" },
  ],
  9: [
    { id: 5, name: "정동현", grade: "부장", position: "책임연구원", type: "주소속" },
    { id: 6, name: "홍미래", grade: "과장", position: "선임연구원", type: "주소속" },
    { id: 7, name: "신재원", grade: "대리", position: "연구원", type: "주소속" },
    { id: 14, name: "류승현", grade: "과장", position: "선임연구원", type: "주소속" },
  ],
  10: [
    { id: 15, name: "권다희", grade: "대리", position: "QA엔지니어", type: "주소속" },
    { id: 16, name: "노태준", grade: "사원", position: "QA엔지니어", type: "주소속" },
  ],
  11: [{ id: 17, name: "손지민", grade: "과장", position: "브랜드매니저", type: "주소속" }],
  12: [
    { id: 18, name: "문혜린", grade: "대리", position: "디지털마케터", type: "주소속" },
    { id: 19, name: "안준호", grade: "사원", position: "디지털마케터", type: "주소속" },
  ],
};

const ALL_USERS = [
  { id: 1, name: "김지훈", loginId: "jihoon.kim", empNo: "EMP-0042", email: "jihoon.kim@company.co.kr", grade: "팀장", position: "책임연구원", dept: "프론트엔드팀", status: "ACTIVE" },
  { id: 2, name: "이수정", loginId: "sujung.lee", empNo: "EMP-0051", email: "sujung.lee@company.co.kr", grade: "대리", position: "선임연구원", dept: "프론트엔드팀", status: "ACTIVE" },
  { id: 3, name: "박민수", loginId: "minsu.park", empNo: "EMP-0038", email: "minsu.park@company.co.kr", grade: "과장", position: "연구원", dept: "프론트엔드팀", status: "ACTIVE" },
  { id: 4, name: "최유진", loginId: "yujin.choi", empNo: "EMP-0067", email: "yujin.choi@company.co.kr", grade: "사원", position: "연구원", dept: "프론트엔드팀", status: "ACTIVE" },
  { id: 5, name: "정동현", loginId: "donghyun.jung", empNo: "EMP-0029", email: "donghyun.jung@company.co.kr", grade: "부장", position: "책임연구원", dept: "백엔드팀", status: "ACTIVE" },
  { id: 6, name: "홍미래", loginId: "mirae.hong", empNo: "EMP-0044", email: "mirae.hong@company.co.kr", grade: "과장", position: "선임연구원", dept: "백엔드팀", status: "ACTIVE" },
  { id: 7, name: "강현주", loginId: "hyunju.kang", empNo: "EMP-0021", email: "hyunju.kang@company.co.kr", grade: "부장", position: "인사팀장", dept: "인사팀", status: "ACTIVE" },
  { id: 8, name: "김철수", loginId: "chulsoo.kim", empNo: "EMP-0088", email: "chulsoo.kim@company.co.kr", grade: "사원", position: "연구원", dept: "QA팀", status: "INACTIVE" },
  { id: 9, name: "류승현", loginId: "seunghyun.ryu", empNo: "EMP-0055", email: "seunghyun.ryu@company.co.kr", grade: "과장", position: "선임연구원", dept: "백엔드팀", status: "ACTIVE" },
  { id: 10, name: "손지민", loginId: "jimin.son", empNo: "EMP-0073", email: "jimin.son@company.co.kr", grade: "과장", position: "브랜드매니저", dept: "브랜드팀", status: "LOCKED" },
];

const JOB_GRADES = [
  { id: 1, name: "사원", order: 1, status: "ACTIVE" },
  { id: 2, name: "대리", order: 2, status: "ACTIVE" },
  { id: 3, name: "과장", order: 3, status: "ACTIVE" },
  { id: 4, name: "차장", order: 4, status: "ACTIVE" },
  { id: 5, name: "부장", order: 5, status: "ACTIVE" },
  { id: 6, name: "팀장", order: 6, status: "ACTIVE" },
  { id: 7, name: "상무", order: 7, status: "ACTIVE" },
  { id: 8, name: "전무", order: 8, status: "ACTIVE" },
  { id: 9, name: "대표이사", order: 9, status: "ACTIVE" },
];

const POSITIONS = [
  { id: 1, name: "연구원", order: 1, status: "ACTIVE" },
  { id: 2, name: "선임연구원", order: 2, status: "ACTIVE" },
  { id: 3, name: "책임연구원", order: 3, status: "ACTIVE" },
  { id: 4, name: "인사담당자", order: 4, status: "ACTIVE" },
  { id: 5, name: "채용담당자", order: 5, status: "ACTIVE" },
  { id: 6, name: "회계담당자", order: 6, status: "ACTIVE" },
  { id: 7, name: "브랜드매니저", order: 7, status: "ACTIVE" },
  { id: 8, name: "디지털마케터", order: 8, status: "ACTIVE" },
  { id: 9, name: "QA엔지니어", order: 9, status: "ACTIVE" },
  { id: 10, name: "CEO", order: 10, status: "ACTIVE" },
];

// ================================================================
// UTILITIES
// ================================================================
const KO_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const KO_WEEKDAYS_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const BRAND_PRIMARY = "#7C5CFF";
const BRAND_DEEP = "#4A327F";
const BRAND_ACCENT = "#9B8BF4";
const BRAND_SOFT = "#F2EDFF";
const BRAND_LINE = "#DDD3FA";

const formatKoFull = (d: Date) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${KO_WEEKDAYS_FULL[d.getDay()]}`;

const formatMonthYear = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;

const AVATAR_BG = [
  "bg-violet-500", "bg-fuchsia-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-600", "bg-indigo-500", "bg-purple-500",
];
const getAvatarBg = (name: string) => AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];

const EVENT_COLORS: Record<EventType, { bar: string; bg: string; text: string; dot: string }> = {
  personal: { bar: "bg-violet-500", bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  org: { bar: "bg-purple-500", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  all: { bar: "bg-rose-500", bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
};

const EVENT_TYPE_LABELS: Record<EventType, string> = { personal: "개인", org: "조직", all: "전사" };

const getEventsForDay = (day: Date, events: AppEvent[], filters: Record<EventType, boolean>) => {
  const dayStr = format(day, "yyyy-MM-dd");
  return events.filter((e) => e.start.startsWith(dayStr) && filters[e.type]);
};

// ================================================================
// SHARED COMPONENTS
// ================================================================

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz =
    size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sz} ${getAvatarBg(name)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {name.charAt(0)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "활성", cls: "bg-emerald-100 text-emerald-700" },
    INACTIVE: { label: "비활성", cls: "bg-gray-100 text-gray-500" },
    LOCKED: { label: "잠금", cls: "bg-amber-100 text-amber-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function RoomStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
    >
      {status === "ACTIVE" ? "사용 가능" : "사용 불가"}
    </span>
  );
}

// ================================================================
// LOGIN PAGE
// ================================================================

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (loginId === "jihoon.kim" && password === "1234") {
        onLogin();
      } else {
        setError("아이디 또는 비밀번호가 일치하지 않습니다.");
        setLoading(false);
      }
    }, 700);
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14"
        style={{
          background:
            "radial-gradient(circle at 18% 12%, rgba(229, 214, 255, .36), transparent 34%), linear-gradient(150deg, #4A327F 0%, #7C5CFF 58%, #B8A8FF 100%)",
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
            업무의 모든 것을<br />한 곳에서
          </h1>
          <p className="text-white/55 text-base leading-relaxed mb-14">
            일정 관리, 조직도, 회의실 예약까지.<br />
            AI 채팅, 일정, 회의실 예약까지 연결되는 통합 업무 플랫폼입니다.
          </p>
          <div className="grid grid-cols-3 gap-10">
            {[
              { label: "임직원", value: "248명" },
              { label: "조직", value: "24팀" },
              { label: "회의실", value: "12실" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-white text-3xl font-bold">{s.value}</div>
                <div className="text-white/45 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">© 2026 Corporation Inc. All rights reserved.</p>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Building2 className="w-5 h-5" style={{ color: BRAND_PRIMARY }} />
            <span className="font-bold text-lg" style={{ color: BRAND_PRIMARY }}>CorpLink</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">로그인</h2>
          <p className="text-muted-foreground text-sm mb-7">
            계정 정보를 입력하여 시스템에 접속하세요
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">아이디</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="로그인 아이디"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-violet-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-lg px-3.5 py-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-1"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-1">데모 계정</p>
            <code className="text-xs text-foreground">jihoon.kim / 1234</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// SIDEBAR
// ================================================================

const NAV = [
  { id: "dashboard" as View, label: "대시보드", icon: LayoutDashboard },
  { id: "aiChat" as View, label: "AI 채팅", icon: Bot },
  { id: "chat" as View, label: "채팅", icon: MessageCircle },
  { id: "calendar" as View, label: "캘린더", icon: Calendar },
  { id: "orgchart" as View, label: "조직도", icon: Users },
  { id: "rooms" as View, label: "회의실", icon: Building2 },
  { id: "mypage" as View, label: "마이페이지", icon: User },
];

function Sidebar({
  active,
  onNav,
  onLogout,
}: {
  active: View;
  onNav: (v: View) => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className="w-full md:w-52 flex-shrink-0 flex md:flex-col h-auto md:h-screen sticky top-0 z-20 overflow-x-auto md:overflow-visible"
      style={{
        background:
          "linear-gradient(180deg, #4A327F 0%, #5B43B7 52%, #34245F 100%)",
      }}
    >
      <div className="px-4 md:px-5 py-3 md:py-5 border-r md:border-r-0 md:border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="hidden sm:inline text-white font-bold text-[15px] tracking-tight">CorpLink</span>
        </div>
      </div>

      <nav className="flex-1 px-2 md:px-3 py-2 md:py-4 overflow-x-auto md:overflow-y-auto">
        <p className="hidden md:block text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">메뉴</p>
        <div className="flex md:block gap-1 md:space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onNav(id)}
                className={`min-w-max md:min-w-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/8"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-200 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <p className="hidden md:block text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2 mt-5">관리</p>
        <button
          onClick={() => onNav("admin")}
          className={`hidden md:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all text-left ${
            active === "admin"
              ? "bg-white/15 text-white"
              : "text-white/55 hover:text-white hover:bg-white/8"
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span>시스템 관리</span>
          {active === "admin" && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-200 flex-shrink-0" />
          )}
        </button>
      </nav>

      <div className="hidden md:block px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <Avatar name={CURRENT_USER.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold leading-tight truncate">
              {CURRENT_USER.name}
            </p>
            <p className="text-white/40 text-[11px] leading-tight truncate">{CURRENT_USER.jobGrade}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-white/35 hover:text-white/70 transition-colors flex-shrink-0"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ================================================================
// TOP BAR
// ================================================================

const PAGE_TITLES: Record<View, string> = {
  dashboard: "대시보드",
  aiChat: "AI 채팅",
  chat: "채팅",
  calendar: "캘린더",
  orgchart: "조직도",
  rooms: "회의실",
  mypage: "마이페이지",
  admin: "시스템 관리",
};

function TopBar({ active }: { active: View }) {
  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-6">
      <span className="text-[15px] font-bold text-foreground">{PAGE_TITLES[active]}</span>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="검색..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-muted text-sm w-48 focus:outline-none"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-border ml-1">
          <Avatar name={CURRENT_USER.name} size="sm" />
          <div className="hidden md:block leading-tight">
            <p className="text-xs font-bold text-foreground">{CURRENT_USER.name}</p>
            <p className="text-[10px] text-muted-foreground">{CURRENT_USER.department}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

// ================================================================
// DASHBOARD
// ================================================================

function Dashboard({ onNav }: { onNav: (v: View) => void }) {
  const todayEvents = EVENTS.filter((e) => e.start.startsWith(TODAY_STR));
  const todayReservations = RESERVATIONS.filter((r) => r.date === TODAY_STR);
  const thisWeekEnd = format(addDays(TODAY, 7), "yyyy-MM-dd");
  const weekCount = EVENTS.filter((e) => {
    const d = e.start.split(" ")[0];
    return d >= TODAY_STR && d <= thisWeekEnd;
  }).length;

  const upcoming = EVENTS.filter((e) => e.start.split(" ")[0] > TODAY_STR)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            안녕하세요, {CURRENT_USER.name} {CURRENT_USER.jobGrade}님
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{formatKoFull(TODAY)}</p>
        </div>
        <button
          onClick={() => onNav("calendar")}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Plus className="w-4 h-4" />
          일정 등록
        </button>
      </div>

      <section
        className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-4 rounded-2xl border p-5 overflow-hidden"
        style={{
          borderColor: BRAND_LINE,
          background:
            "linear-gradient(135deg, rgba(255,255,255,.92) 0%, rgba(242,237,255,.96) 58%, rgba(232,251,247,.72) 100%)",
          boxShadow: "0 18px 45px rgba(92, 70, 155, .11)",
        }}
      >
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" style={{ color: BRAND_PRIMARY }} />
          </div>
          <div>
            <p className="text-xs font-bold text-violet-600 mb-1">AI 업무 비서</p>
            <h3 className="text-xl font-bold text-foreground">오늘 확인할 일을 먼저 정리했어요</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              13시 디자인 QA 전에 회의록을 확인하고, 16시 이후 가능한 회의실을 확보하는 흐름을 추천합니다.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {AI_SUGGESTIONS.slice(0, 2).map((item) => (
                <button
                  key={item}
                  onClick={() => onNav("aiChat")}
                  className="px-3 py-1.5 rounded-full bg-white border border-violet-100 text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white/75 border border-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-foreground">AI 채팅 미리보기</span>
            <button onClick={() => onNav("aiChat")} className="text-xs font-bold text-violet-600">
              열기 →
            </button>
          </div>
          <div className="space-y-2">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-violet-50 px-3 py-2 text-sm text-violet-950">
              오늘 오후 일정과 회의실 예약을 한 번에 정리해드릴게요.
            </div>
            <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md px-3 py-2 text-sm text-white" style={{ backgroundColor: BRAND_PRIMARY }}>
              디자인 QA 전에 필요한 것만 알려줘
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "오늘 일정", value: todayEvents.length, unit: "건", color: BRAND_PRIMARY, bg: BRAND_SOFT },
          { label: "오늘 회의실 예약", value: todayReservations.length, unit: "건", color: BRAND_DEEP, bg: "#EFE8FF" },
          { label: "소속 조직", value: 1, unit: "개", color: "#059669", bg: "#ECFDF5" },
          { label: "이번 주 일정", value: weekCount, unit: "건", color: "#D97706", bg: "#FFFBEB" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div
              className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
              style={{ backgroundColor: s.bg }}
            >
              <span className="text-sm font-bold" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {s.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today events */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">오늘의 일정</h3>
            <button
              onClick={() => onNav("calendar")}
              className="text-xs text-violet-600 hover:underline font-semibold"
            >
              전체보기 →
            </button>
          </div>
          {todayEvents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              오늘 등록된 일정이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayEvents.map((ev) => {
                const c = EVENT_COLORS[ev.type];
                const time = `${ev.start.split(" ")[1]} – ${ev.end.split(" ")[1]}`;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-1 h-9 rounded-full ${c.bar} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text} flex-shrink-0`}
                    >
                      {EVENT_TYPE_LABELS[ev.type]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side cards */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">오늘 회의실 예약</h3>
              <button
                onClick={() => onNav("rooms")}
                className="text-xs text-violet-600 hover:underline font-semibold"
              >
                예약하기 →
              </button>
            </div>
            <div className="px-5 py-3 space-y-3">
              {todayReservations.length === 0 ? (
                <p className="py-5 text-center text-sm text-muted-foreground">오늘 예약이 없습니다.</p>
              ) : (
                todayReservations.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{r.roomName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.start} – {r.end}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">예정 일정</h3>
            </div>
            <div className="px-5 py-3 space-y-3">
              {upcoming.length === 0 ? (
                <p className="py-5 text-center text-sm text-muted-foreground">예정 일정이 없습니다.</p>
              ) : (
                upcoming.map((ev) => {
                  const c = EVENT_COLORS[ev.type];
                  const dateStr = ev.start.split(" ")[0];
                  const time = ev.start.split(" ")[1];
                  const d = parseISO(dateStr);
                  return (
                    <div key={ev.id} className="flex items-start gap-3 py-0.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${c.dot}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {d.getMonth() + 1}/{d.getDate()} {time}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// AI CHAT PAGE
// ================================================================

function AIChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 1,
      role: "ai",
      text: "좋은 아침입니다. 오늘은 회의 3건, 확인할 채팅 6개, 마감 업무 2건이 있습니다.",
      time: "09:00",
    },
    {
      id: 2,
      role: "user",
      text: "디자인 QA 전에 봐야 할 것만 정리해줘.",
      time: "09:02",
    },
    {
      id: 3,
      role: "ai",
      text: "우선 어제 회의록, QA 코멘트 4개, B회의실 장비 상태를 확인하면 됩니다. 필요하면 디자인팀 채널에 요약을 공유할게요.",
      time: "09:02",
    },
  ]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, role: "user", text: trimmed, time: "방금" },
      {
        id: prev.length + 2,
        role: "ai",
        text: "요청을 기준으로 일정, 회의실, 채팅 알림을 함께 확인했습니다. 관련 업무 카드에 바로 이어질 수 있게 정리해둘게요.",
        time: "방금",
      },
    ]);
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="p-6 h-full">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 h-full min-h-[680px]">
        <aside
          className="rounded-3xl border p-5 flex flex-col overflow-hidden"
          style={{
            borderColor: BRAND_LINE,
            background:
              "linear-gradient(160deg, #FFFFFF 0%, #F2EDFF 56%, #E8FBF7 100%)",
            boxShadow: "0 24px 60px rgba(92, 70, 155, .13)",
          }}
        >
          <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-5">
            <Bot className="w-8 h-8" style={{ color: BRAND_PRIMARY }} />
          </div>
          <p className="text-xs font-bold text-violet-600 mb-2">AI Command Center</p>
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            자연어로 업무 흐름을 바로 실행하세요
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            일정, 회의실, 팀 채팅, 알림을 하나의 대화 흐름으로 연결하는 화면입니다.
          </p>

          <div className="mt-6 space-y-2">
            {AI_SUGGESTIONS.map((item) => (
              <button
                key={item}
                onClick={() => sendMessage(item)}
                className="w-full text-left rounded-2xl bg-white/85 border border-white px-4 py-3 text-sm font-bold text-violet-800 hover:bg-white transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-2xl p-4 text-white" style={{ backgroundColor: BRAND_DEEP }}>
            <p className="text-xs font-bold text-white/65">오늘의 AI 요약</p>
            <p className="text-sm mt-2 leading-relaxed">
              13시 디자인 QA 전에 회의록 확인, 16시 이후 회의실 후보 2곳 검토, PM 채널 릴리즈 노트 확인이 필요합니다.
            </p>
          </div>
        </aside>

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

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-violet-50/40">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-white border border-violet-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                    </div>
                  )}
                  <div className={`max-w-[76%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? "rounded-tr-md text-white"
                          : "rounded-tl-md bg-white border border-violet-100 text-foreground"
                      }`}
                      style={isUser ? { backgroundColor: BRAND_PRIMARY } : undefined}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white">
            <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 오늘 회의 전 체크리스트 만들어줘"
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND_PRIMARY }}
                aria-label="AI 메시지 보내기"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

// ================================================================
// CHAT PAGE
// ================================================================

function ChatPage() {
  const [selectedThreadId, setSelectedThreadId] = useState(CHAT_THREADS[0].id);
  const [draft, setDraft] = useState("");
  const selectedThread = CHAT_THREADS.find((thread) => thread.id === selectedThreadId) ?? CHAT_THREADS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDraft("");
  };

  return (
    <div className="p-6 h-full">
      <div className="bg-card border border-border rounded-3xl overflow-hidden h-full min-h-[680px] grid grid-cols-1 lg:grid-cols-[320px_1fr]">
        <section className="border-r border-border bg-violet-50/45 min-w-0">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">업무 채팅</h2>
                <p className="text-xs text-muted-foreground mt-0.5">팀 채널과 DM을 한 곳에서 확인</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5" style={{ color: BRAND_PRIMARY }} />
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="채팅방 검색"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-violet-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>

          <div className="p-3 space-y-2">
            {CHAT_THREADS.map((thread) => {
              const isActive = selectedThread.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left rounded-2xl p-3 transition-all ${
                    isActive ? "bg-white shadow-sm ring-1 ring-violet-100" : "hover:bg-white/70"
                  }`}
                >
                  <div className="flex gap-3">
                    <Avatar name={thread.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{thread.name}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{thread.time}</span>
                      </div>
                      <p className="text-[11px] text-violet-600 font-bold mt-0.5">{thread.type}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{thread.last}</p>
                    </div>
                    {thread.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col min-w-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={selectedThread.name} />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground truncate">{selectedThread.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedThread.members.length}명 참여 · {selectedThread.type}
                </p>
              </div>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              AI 요약
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-violet-50/35">
            <div className="mx-auto w-fit px-3 py-1 rounded-full bg-white border border-violet-100 text-[11px] text-muted-foreground">
              오늘 대화
            </div>
            {selectedThread.messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.mine ? "justify-end" : "justify-start"}`}>
                {!msg.mine && <Avatar name={msg.from} size="sm" />}
                <div className={`max-w-[76%] ${msg.mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!msg.mine && <span className="text-xs font-bold text-foreground mb-1">{msg.from}</span>}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.mine
                        ? "rounded-tr-md text-white"
                        : "rounded-tl-md bg-white border border-violet-100 text-foreground"
                    }`}
                    style={msg.mine ? { backgroundColor: BRAND_PRIMARY } : undefined}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white">
            <div className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`${selectedThread.name}에 메시지 보내기`}
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND_PRIMARY }}
                aria-label="채팅 메시지 보내기"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

// ================================================================
// CALENDAR PAGE
// ================================================================

function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<Date>(TODAY);
  const [filters, setFilters] = useState<Record<EventType, boolean>>({
    personal: true,
    org: true,
    all: true,
  });
  const [showModal, setShowModal] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const selectedEvents = getEventsForDay(selectedDay, EVENTS, filters);

  const FILTER_OPTS: { type: EventType; label: string; color: string }[] = [
    { type: "personal", label: "개인", color: "bg-violet-500" },
    { type: "org", label: "조직", color: "bg-purple-500" },
    { type: "all", label: "전사", color: "bg-rose-500" },
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* Calendar main */}
      <div className="flex-1 flex flex-col p-5 min-w-0 gap-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h2 className="text-sm font-bold text-foreground w-32 text-center">
              {formatMonthYear(currentMonth)}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border transition-all"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => {
                setCurrentMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
                setSelectedDay(TODAY);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              오늘
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {FILTER_OPTS.map(({ type, label, color }) => (
              <button
                key={type}
                onClick={() => setFilters((f) => ({ ...f, [type]: !f[type] }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filters[type]
                    ? "bg-card border-border text-foreground shadow-sm"
                    : "bg-transparent border-transparent text-muted-foreground opacity-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white ml-1"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Plus className="w-3.5 h-3.5" />
              일정 추가
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden min-h-0">
          <div className="grid grid-cols-7 border-b border-border">
            {KO_WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`py-2.5 text-center text-xs font-bold ${
                  i === 0 ? "text-rose-500" : i === 6 ? "text-violet-500" : "text-muted-foreground"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(88px, 1fr)" }}>
            {days.map((d, i) => {
              const dayEvs = getEventsForDay(d, EVENTS, filters);
              const inMonth = isSameMonth(d, currentMonth);
              const isSelected = isSameDay(d, selectedDay);
              const isCurrentDay = isToday(d);
              const dow = d.getDay();

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(d)}
                  className={`border-r border-b border-border p-1.5 cursor-pointer transition-colors ${
                    i % 7 === 6 ? "border-r-0" : ""
                  } ${!inMonth ? "bg-muted/30" : isSelected ? "bg-violet-50/70" : "hover:bg-muted/20"}`}
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                      isCurrentDay
                        ? "bg-violet-600 text-white"
                        : isSelected
                        ? "bg-violet-100 text-violet-700"
                        : !inMonth
                        ? "text-muted-foreground/40"
                        : dow === 0
                        ? "text-rose-500"
                        : dow === 6
                        ? "text-violet-500"
                        : "text-foreground"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvs.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${
                          EVENT_COLORS[ev.type].bg
                        } ${EVENT_COLORS[ev.type].text}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvs.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayEvs.length - 2}건
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      <div className="w-64 flex-shrink-0 border-l border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-sm font-bold text-foreground">
            {selectedDay.getMonth() + 1}월 {selectedDay.getDate()}일 (
            {KO_WEEKDAYS[selectedDay.getDay()]})
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{selectedEvents.length}개의 일정</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {selectedEvents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">일정이 없습니다.</div>
          ) : (
            selectedEvents.map((ev) => {
              const c = EVENT_COLORS[ev.type];
              return (
                <div
                  key={ev.id}
                  className="bg-background border border-border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-1 rounded-full flex-shrink-0 mt-0.5 ${c.bar}`}
                      style={{ minHeight: "2rem" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-snug">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.start.split(" ")[1]} – {ev.end.split(" ")[1]}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text}`}
                      >
                        {EVENT_TYPE_LABELS[ev.type]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New event modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="font-bold text-base text-foreground">새 일정 등록</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">제목</label>
                <input
                  type="text"
                  placeholder="일정 제목 입력"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">시작</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">종료</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">대상</label>
                <select className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none bg-white">
                  <option>개인 일정</option>
                  <option>조직 일정</option>
                  <option>전사 일정</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ORG CHART PAGE
// ================================================================

function OrgTreeNode({
  node,
  depth,
  selectedId,
  expanded,
  onSelect,
  onToggle,
}: {
  node: OrgNode;
  depth: number;
  selectedId: number | null;
  expanded: Set<number>;
  onSelect: (n: OrgNode) => void;
  onToggle: (id: number) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const memberCount = ORG_MEMBERS[node.id]?.length ?? 0;

  return (
    <div>
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
          isSelected ? "bg-violet-50 text-violet-700" : "hover:bg-muted/60 text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : null}
        </button>
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            node.status === "ACTIVE" ? "bg-emerald-400" : "bg-gray-300"
          }`}
        />
        <span className="text-[13px] font-medium truncate flex-1">{node.name}</span>
        {memberCount > 0 && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{memberCount}명</span>
        )}
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <OrgTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

function OrgChartPage() {
  const [selectedOrg, setSelectedOrg] = useState<OrgNode | null>(
    ORG_TREE.children[1].children[0]
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1, 2, 3, 4]));

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const members = selectedOrg ? (ORG_MEMBERS[selectedOrg.id] ?? []) : [];

  return (
    <div className="flex h-full min-h-0">
      {/* Tree */}
      <div className="w-72 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">조직도</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="조직 검색"
              className="pl-6 pr-2 py-1 rounded-lg bg-muted text-xs w-28 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <OrgTreeNode
            node={ORG_TREE}
            depth={0}
            selectedId={selectedOrg?.id ?? null}
            expanded={expanded}
            onSelect={setSelectedOrg}
            onToggle={toggleExpanded}
          />
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedOrg ? (
          <>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">{selectedOrg.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <code className="text-xs text-muted-foreground font-mono">{selectedOrg.code}</code>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    selectedOrg.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {selectedOrg.status === "ACTIVE" ? "활성" : "비활성"}
                </span>
                <span className="text-xs text-muted-foreground">구성원 {members.length}명</span>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                소속 구성원이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  >
                    <Avatar name={m.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.grade} · {m.position}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.type === "겸직"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {m.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            조직을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// MEETING ROOMS PAGE
// ================================================================

function MeetingRoomsPage() {
  const [bookingRoom, setBookingRoom] = useState<(typeof MEETING_ROOMS)[number] | null>(null);
  const [bookDate, setBookDate] = useState(TODAY_STR);
  const [bookStart, setBookStart] = useState("09:00");
  const [bookEnd, setBookEnd] = useState("10:00");
  const [bookPurpose, setBookPurpose] = useState("");
  const [bookSuccess, setBookSuccess] = useState(false);
  const [capacityFilter, setCapacityFilter] = useState(0);

  const filteredRooms = MEETING_ROOMS.filter((r) => r.capacity >= capacityFilter);

  const todayRoomReservations = (roomId: number) =>
    RESERVATIONS.filter((r) => r.roomId === roomId && r.date === TODAY_STR);

  const handleBook = () => {
    setBookSuccess(true);
    setTimeout(() => {
      setBookSuccess(false);
      setBookingRoom(null);
      setBookPurpose("");
    }, 1800);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-foreground">회의실 현황</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            오늘 회의실 예약 현황을 확인하고 예약하세요.
          </p>
        </div>
        <select
          value={capacityFilter}
          onChange={(e) => setCapacityFilter(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-card focus:outline-none"
        >
          <option value={0}>전체 인원</option>
          <option value={4}>4인 이상</option>
          <option value={8}>8인 이상</option>
          <option value={20}>20인 이상</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredRooms.map((room) => {
          const rsvs = todayRoomReservations(room.id);
          const isAvailable = room.status === "ACTIVE";
          return (
            <div
              key={room.id}
              className={`bg-card border border-border rounded-xl overflow-hidden ${!isAvailable ? "opacity-60" : ""}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{room.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {room.location}
                    </p>
                  </div>
                  <RoomStatusBadge status={room.status} />
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {room.capacity}인
                  </span>
                  <span className="truncate">{room.desc}</span>
                </div>

                {rsvs.length > 0 && (
                  <div className="space-y-1.5 mb-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      오늘 예약
                    </p>
                    {rsvs.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5"
                      >
                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[11px] text-foreground font-semibold">
                          {r.start} – {r.end}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-auto flex-shrink-0">
                          {r.by}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => isAvailable && setBookingRoom(room)}
                  disabled={!isAvailable}
                  className="w-full py-2 rounded-lg text-sm font-bold transition-all disabled:cursor-not-allowed"
                  style={
                    isAvailable
                      ? { backgroundColor: BRAND_PRIMARY, color: "white" }
                      : { backgroundColor: "#E2E6EF", color: "#94A3B8" }
                  }
                >
                  {isAvailable ? "예약하기" : "사용 불가"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking modal */}
      {bookingRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {bookSuccess ? (
              <div className="flex flex-col items-center justify-center py-14 px-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-base text-foreground">예약이 완료되었습니다!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {bookingRoom.name} · {bookDate} · {bookStart} – {bookEnd}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                  <div>
                    <h3 className="font-bold text-base text-foreground">회의실 예약</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bookingRoom.name} · {bookingRoom.location} · {bookingRoom.capacity}인
                    </p>
                  </div>
                  <button
                    onClick={() => setBookingRoom(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">날짜</label>
                    <input
                      type="date"
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">시작 시간</label>
                      <input
                        type="time"
                        value={bookStart}
                        onChange={(e) => setBookStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">종료 시간</label>
                      <input
                        type="time"
                        value={bookEnd}
                        onChange={(e) => setBookEnd(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">사용 목적</label>
                    <input
                      type="text"
                      value={bookPurpose}
                      onChange={(e) => setBookPurpose(e.target.value)}
                      placeholder="사용 목적 입력 (예: 팀 주간 회의)"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                  <button
                    onClick={() => setBookingRoom(null)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleBook}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: BRAND_PRIMARY }}
                  >
                    예약 확정
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// MY PAGE
// ================================================================

function MyPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
        <div
          className="h-24"
          style={{
            background:
              "linear-gradient(135deg, #4A327F 0%, #7C5CFF 58%, #B8A8FF 100%)",
          }}
        />
        <div className="px-6 pt-4 pb-6 relative">
          <div
            className="-mt-14 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow mb-3"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            {CURRENT_USER.name.charAt(0)}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{CURRENT_USER.name}</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {CURRENT_USER.jobGrade} · {CURRENT_USER.position}
              </p>
              <p className="text-muted-foreground text-sm">{CURRENT_USER.department}</p>
            </div>
            <StatusBadge status={CURRENT_USER.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-4">기본 정보</h3>
          <div className="space-y-3.5">
            {[
              { icon: Hash, label: "사번", value: CURRENT_USER.employeeNo },
              { icon: Mail, label: "이메일", value: CURRENT_USER.email },
              { icon: Phone, label: "전화번호", value: CURRENT_USER.phone },
              { icon: User, label: "로그인 ID", value: CURRENT_USER.loginId },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">{label}</p>
                  <p className="text-sm text-foreground font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">직급 · 직책</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">직급</p>
                  <p className="text-sm font-medium text-foreground">{CURRENT_USER.jobGrade}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">직책</p>
                  <p className="text-sm font-medium text-foreground">{CURRENT_USER.position}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">소속 조직</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">주소속</p>
                <p className="text-sm font-medium text-foreground">{CURRENT_USER.department}</p>
                <p className="text-xs text-muted-foreground">개발본부</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ADMIN PAGE
// ================================================================

function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = ALL_USERS.filter(
    (u) =>
      u.name.includes(userSearch) ||
      u.empNo.includes(userSearch) ||
      u.loginId.includes(userSearch)
  );

  const TABS: { id: AdminTab; label: string }[] = [
    { id: "users", label: "사용자 관리" },
    { id: "rooms", label: "회의실 관리" },
    { id: "grades", label: "직급·직책" },
  ];

  return (
    <div className="p-6">
      <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
            <h3 className="text-sm font-bold text-foreground">
              사용자 목록 ({filteredUsers.length}명)
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="이름, 사번, 아이디"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border border-border text-sm w-44 focus:outline-none"
                />
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus className="w-3.5 h-3.5" />
                사용자 등록
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["이름", "사번", "아이디", "소속부서", "직급", "직책", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <span className="font-semibold text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.empNo}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.loginId}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.dept}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.grade}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{u.position}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "rooms" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">
              회의실 목록 ({MEETING_ROOMS.length}개)
            </h3>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Plus className="w-3.5 h-3.5" />
              회의실 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["회의실명", "위치", "수용 인원", "설명", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MEETING_ROOMS.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.location}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{r.capacity}인</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.desc}</td>
                    <td className="px-4 py-3">
                      <RoomStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "grades" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                직급 관리 ({JOB_GRADES.length}개)
              </h3>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus className="w-3.5 h-3.5" />
                추가
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["순서", "직급명", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {JOB_GRADES.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{g.order}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{g.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                직책 관리 ({POSITIONS.length}개)
              </h3>
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus className="w-3.5 h-3.5" />
                추가
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["순서", "직책명", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {POSITIONS.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.order}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// MAIN APP
// ================================================================

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState<View>("dashboard");

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background">
      <Sidebar active={activeView} onNav={setActiveView} onLogout={() => setIsLoggedIn(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar active={activeView} />
        <main className="flex-1 overflow-y-auto">
          {activeView === "dashboard" && <Dashboard onNav={setActiveView} />}
          {activeView === "aiChat" && <AIChatPage />}
          {activeView === "chat" && <ChatPage />}
          {activeView === "calendar" && (
            <div className="h-full flex flex-col">
              <CalendarPage />
            </div>
          )}
          {activeView === "orgchart" && (
            <div className="h-full flex flex-col">
              <OrgChartPage />
            </div>
          )}
          {activeView === "rooms" && <MeetingRoomsPage />}
          {activeView === "mypage" && <MyPage />}
          {activeView === "admin" && <AdminPage />}
        </main>
      </div>
    </div>
  );
}
