export function StatusBadge({ status }: { status: string }) {
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

