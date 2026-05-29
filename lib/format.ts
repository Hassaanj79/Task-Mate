import { formatDistanceToNow, format, isPast, isToday, isTomorrow } from "date-fns";

export function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function relativeTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function dueDateLabel(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isToday(d)) return { text: "Today", overdue: false, soon: true };
  if (isTomorrow(d)) return { text: "Tomorrow", overdue: false, soon: true };
  return {
    text: format(d, "MMM d"),
    overdue: isPast(d),
    soon: false,
  };
}

export function displayName(p?: { full_name?: string | null; email?: string | null } | null) {
  if (!p) return "Unknown";
  return p.full_name?.trim() || p.email?.split("@")[0] || "Unknown";
}

const ORG_PALETTE = [
  "oklch(0.66 0.15 42)",
  "oklch(0.64 0.13 155)",
  "oklch(0.6 0.14 300)",
  "oklch(0.62 0.13 250)",
  "oklch(0.68 0.13 70)",
  "oklch(0.65 0.15 350)",
];

export function orgInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

// Deterministic accent color for an org, derived from its id.
export function orgColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ORG_PALETTE[Math.abs(h) % ORG_PALETTE.length];
}
