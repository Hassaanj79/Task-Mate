"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchActivity, qk } from "@/lib/queries";
import { initials, displayName, relativeTime } from "@/lib/format";

const ACTION_TEXT: Record<string, string> = {
  created: "created this task",
  status_changed: "moved this task",
  commented: "commented",
  attached_file: "attached a file",
  updated_title: "renamed the task",
  updated_priority: "changed priority",
  updated_assignee_id: "changed the assignee",
  updated_due_date: "changed the due date",
  updated_description: "edited the description",
  updated_status_id: "changed the status",
};

export function ActivityFeed({ taskId }: { taskId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: qk.activity(taskId),
    queryFn: () => fetchActivity(taskId),
  });

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <div key={e.id} className="flex items-center gap-2 text-sm">
          <Avatar className="size-5">
            <AvatarImage src={e.actor?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px]">
              {initials(e.actor?.full_name, e.actor?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{displayName(e.actor)}</span>
          <span className="text-muted-foreground">
            {ACTION_TEXT[e.action] ?? e.action}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {relativeTime(e.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
