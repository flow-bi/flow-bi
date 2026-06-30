export function RoomStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
    >
      {status === "ACTIVE" ? "사용 가능" : "사용 불가"}
    </span>
  );
}

