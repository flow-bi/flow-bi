const AVATAR_BG = [
  "bg-violet-500", "bg-fuchsia-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-600", "bg-indigo-500", "bg-purple-500",
];

const getAvatarBg = (name: string) => AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
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

