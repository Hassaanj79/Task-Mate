"use client";

import {
  AlertCircle,
  Calendar,
  Bug,
  Sparkles,
  Bookmark,
  TrendingUp,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { priorityMeta, taskTypeMeta } from "@/lib/constants";
import { dueDateLabel, initials } from "@/lib/format";
import type {
  Label as LabelType,
  Profile,
  TaskPriority,
  TaskType,
} from "@/lib/database.types";

const TYPE_ICONS: Record<TaskType, LucideIcon> = {
  task: CircleCheck,
  bug: Bug,
  feature: Sparkles,
  story: Bookmark,
  improvement: TrendingUp,
};

export function TaskTypeIcon({
  type,
  className,
}: {
  type: TaskType;
  className?: string;
}) {
  const Icon = TYPE_ICONS[type] ?? CircleCheck;
  return (
    <Icon
      className={className ?? "size-4"}
      style={{ color: taskTypeMeta(type).color }}
    />
  );
}

const PRIORITY_BARS: Record<TaskPriority, number> = {
  urgent: 3,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

// Signal-bar priority indicator (matches the Task Mate design).
export function PriorityFlag({
  priority,
  showLabel = false,
}: {
  priority: TaskPriority;
  showLabel?: boolean;
}) {
  if (priority === "none" && !showLabel) return null;
  const meta = priorityMeta(priority);
  const filled = PRIORITY_BARS[priority];

  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
      {priority === "urgent" ? (
        <AlertCircle className="size-4" />
      ) : (
        <span className="flex items-end gap-[2px]" style={{ height: 12 }}>
          {[6, 9, 12].map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-[1px]"
              style={{
                height: h,
                backgroundColor:
                  i < filled ? meta.color : "var(--border-strong, #cbd5e1)",
              }}
            />
          ))}
        </span>
      )}
      {showLabel && <span className="text-foreground">{meta.label}</span>}
    </span>
  );
}

export function DueDateBadge({ due }: { due: string | null }) {
  const label = dueDateLabel(due);
  if (!label) return null;
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
        label.overdue
          ? "bg-destructive/10 text-destructive"
          : label.soon
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
      )}
    >
      <Calendar className="size-3" />
      {label.text}
    </span>
  );
}

export function LabelChip({ label }: { label: LabelType }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: `${label.color ?? "#64748b"}22`,
        color: label.color ?? "#64748b",
      }}
    >
      {label.name}
    </span>
  );
}

export function AssigneeAvatar({
  profile,
  size = "sm",
}: {
  profile?: Profile | null;
  size?: "sm" | "md";
}) {
  if (!profile) return null;
  const cls = size === "sm" ? "size-5" : "size-6";
  return (
    <Avatar className={cls}>
      <AvatarImage src={profile.avatar_url ?? undefined} />
      <AvatarFallback className="text-[9px]">
        {initials(profile.full_name, profile.email)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({
  profiles,
  max = 4,
}: {
  profiles: Profile[];
  max?: number;
}) {
  const shown = profiles.slice(0, max);
  const extra = profiles.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((p) => (
        <span key={p.id} className="-ml-1.5 first:ml-0 ring-2 ring-card rounded-full">
          <AssigneeAvatar profile={p} size="md" />
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-2 ring-card">
          +{extra}
        </span>
      )}
    </span>
  );
}
