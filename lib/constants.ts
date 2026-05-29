import type { TaskPriority } from "@/lib/database.types";

export const PRIORITIES: {
  value: TaskPriority;
  label: string;
  color: string;
}[] = [
  { value: "urgent", label: "Urgent", color: "#ef4444" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "medium", label: "Medium", color: "#eab308" },
  { value: "low", label: "Low", color: "#3b82f6" },
  { value: "none", label: "No priority", color: "#94a3b8" },
];

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

export function priorityMeta(p: TaskPriority) {
  return PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[4];
}

// Default board columns seeded for every new project.
export const DEFAULT_STATUSES: { name: string; color: string }[] = [
  { name: "To Do", color: "#94a3b8" },
  { name: "In Progress", color: "#3b82f6" },
  { name: "Done", color: "#22c55e" },
];

// Task Mate design palette (coral, purple, green, blue, amber, pink).
export const PROJECT_COLORS = [
  "oklch(0.66 0.15 42)",
  "oklch(0.6 0.14 300)",
  "oklch(0.64 0.13 155)",
  "oklch(0.62 0.13 250)",
  "oklch(0.68 0.13 70)",
  "oklch(0.65 0.15 350)",
];

// Lucide-style project icons offered in the New Project flow (design).
export const PROJECT_ICONS = [
  "rocket",
  "image",
  "layout-grid",
  "target",
  "users",
  "zap",
  "star",
  "file-text",
  "folder",
  "bar-chart",
];

export const LABEL_COLORS = [
  "oklch(0.6 0.18 25)",
  "oklch(0.66 0.15 42)",
  "oklch(0.7 0.13 70)",
  "oklch(0.64 0.13 155)",
  "oklch(0.62 0.13 250)",
  "oklch(0.6 0.14 300)",
  "oklch(0.65 0.15 350)",
  "oklch(0.62 0.02 260)",
];

// Status (board column) hues.
export const STATUS_COLORS = [
  "oklch(0.62 0.02 260)",
  "oklch(0.6 0.14 300)",
  "oklch(0.62 0.13 250)",
  "oklch(0.7 0.13 70)",
  "oklch(0.64 0.13 155)",
  "oklch(0.65 0.15 350)",
  "oklch(0.6 0.18 25)",
];

// Gap used when computing fractional positions for board ordering.
export const POSITION_STEP = 1000;
