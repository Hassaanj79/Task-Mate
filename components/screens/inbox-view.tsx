"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Inbox as InboxIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/app/topbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchOrgActivity, fetchNotifications } from "@/lib/queries";
import { markNotificationsRead } from "@/lib/actions/notifications";
import { actionLabel } from "@/lib/activity-text";
import { initials, displayName, relativeTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function InboxView({
  orgSlug,
  orgId,
}: {
  orgSlug: string;
  orgId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "mentions">("mentions");

  const { data: events = [] } = useQuery({
    queryKey: ["org-activity", orgId, "inbox"],
    queryFn: () => fetchOrgActivity(orgId, 40),
    enabled: filter === "all",
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: () => fetchNotifications(orgId),
  });

  // Opening the Mentions tab clears the unread badge.
  useEffect(() => {
    if (filter === "mentions" && notifications.some((n) => !n.read)) {
      markNotificationsRead(orgId).then(() =>
        queryClient.invalidateQueries({ queryKey: ["notifications", orgId] }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, notifications.length]);

  const mentionRows = notifications.map((n) => ({
    id: n.id,
    actor: n.actor,
    action: "mentioned you in",
    title: n.task?.title ?? "a task",
    projectId: n.task?.project_id ?? null,
    created_at: n.created_at,
    body: n.body,
  }));

  const activityRows = events.map((e) => ({
    id: e.id,
    actor: e.actor,
    action: actionLabel(e.action),
    title: e.task?.title ?? "a task",
    projectId: e.task?.project_id ?? null,
    created_at: e.created_at,
    body: null as string | null,
  }));

  const shown = filter === "mentions" ? mentionRows : activityRows;

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Inbox"
        icon={<InboxIcon className="size-[19px] text-muted-foreground" />}
      />
      <div className="flex items-center gap-1.5 border-b bg-card px-6 py-2.5">
        {(
          [
            ["mentions", "Mentions"],
            ["all", "All activity"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full px-3 py-1 text-[12.5px] font-semibold transition",
              filter === id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-4">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 py-24 text-center text-muted-foreground">
              <span className="flex size-16 items-center justify-center rounded-[18px] bg-secondary">
                <InboxIcon className="size-7" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  You&apos;re all caught up
                </p>
                <p className="text-[13px]">No new notifications.</p>
              </div>
            </div>
          ) : (
            shown.map((e) => (
              <button
                key={e.id}
                onClick={() =>
                  e.projectId &&
                  router.push(`/${orgSlug}/projects/${e.projectId}/board`)
                }
                className="flex w-full items-start gap-3 rounded-[var(--radius)] px-3 py-3 text-left transition hover:bg-accent"
              >
                <Avatar className="size-9">
                  <AvatarImage src={e.actor?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {initials(e.actor?.full_name, e.actor?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-snug text-secondary-foreground">
                    <span className="font-semibold text-foreground">
                      {displayName(e.actor)}
                    </span>{" "}
                    {e.action}{" "}
                    <span className="font-medium text-foreground">{e.title}</span>
                  </p>
                  {e.body && (
                    <p className="truncate text-[12px] text-muted-foreground">
                      “{e.body}”
                    </p>
                  )}
                  <p className="text-[11.5px] text-muted-foreground">
                    {relativeTime(e.created_at)}
                  </p>
                </div>
                <ChevronRight className="mt-1 size-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
