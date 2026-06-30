import { useState } from "react";
import { CheckCircle, Clock, MapPin, Users, X } from "lucide-react";

import { RoomStatusBadge } from "@/components/shared/RoomStatusBadge";
import { BRAND_PRIMARY } from "@/constants/brand";
import { TODAY_STR } from "@/lib/date";
import { MEETING_ROOMS, RESERVATIONS } from "@/mocks/rooms";

export function MeetingRoomsPage() {
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

