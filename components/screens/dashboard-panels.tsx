"use client";

import Link from "next/link";
import { Circle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DueDateBadge } from "@/components/task/task-bits";
import { ProjectIcon } from "@/components/project/project-icon";
import { actionLabel } from "@/lib/activity-text";
import { initials, displayName, relativeTime } from "@/lib/format";
import type { Profile } from "@/lib/database.types";

type Upcoming = {
  id: string;
  title: string;
  due: string | null;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  projectIcon: string | null;
  statusColor: string | null;
};

type Activity = {
  id: string;
  action: string;
  created_at: string;
  actor: Profile | null;
  taskTitle: string;
  projectId: string | null;
};

export function DashboardPanels({
  orgSlug,
  upcoming,
  activity,
}: {
  orgSlug: string;
  upcoming: Upcoming[];
  activity: Activity[];
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
      {/* My upcoming tasks */}
      <Panel
        title="My upcoming tasks"
        action={
          <Link
            href={`/${orgSlug}/my-tasks`}
            className="text-[12.5px] font-semibold text-primary"
          >
            View all
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          <Empty text="Nothing assigned to you right now." />
        ) : (
          <div className="flex flex-col">
            {upcoming.map((t, i) => (
              <Link
                key={t.id}
                href={`/${orgSlug}/projects/${t.projectId}/board`}
                className={`flex items-center gap-2.5 rounded-md px-1.5 py-2.5 transition hover:bg-accent ${
                  i < upcoming.length - 1 ? "border-b" : ""
                }`}
              >
                <Circle
                  className="size-[15px] shrink-0"
                  style={{ color: t.statusColor ?? "#94a3b8" }}
                />
                <span className="grow truncate text-[13px] font-medium">
                  {t.title}
                </span>
                {t.due && <DueDateBadge due={t.due} />}
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <ProjectIcon
                    icon={t.projectIcon}
                    className="size-3"
                    style={{ color: t.projectColor ?? undefined }}
                  />
                  {t.projectName.split(" ")[0]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Recent activity */}
      <Panel title="Recent activity">
        {activity.length === 0 ? (
          <Empty text="No activity yet." />
        ) : (
          <div className="flex flex-col gap-0.5">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 px-1 py-2">
                <Avatar className="size-[26px]">
                  <AvatarImage src={a.actor?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[9px]">
                    {initials(a.actor?.full_name, a.actor?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug text-secondary-foreground">
                    <span className="font-semibold text-foreground">
                      {displayName(a.actor).split(" ")[0]}
                    </span>{" "}
                    {actionLabel(a.action)}{" "}
                    <span className="font-medium text-foreground">
                      {a.taskTitle}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-[13.5px] font-bold">{title}</span>
        {action}
      </div>
      <div className="px-3 py-1.5">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-1.5 py-6 text-sm text-muted-foreground">{text}</p>;
}
