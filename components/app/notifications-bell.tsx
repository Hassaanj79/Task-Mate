"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchNotifications } from "@/lib/queries";
import { markNotificationsRead } from "@/lib/actions/notifications";
import { initials, displayName, relativeTime } from "@/lib/format";
import { useShell } from "@/components/app/shell-context";

export function NotificationsBell() {
  const { activeOrg, activeSlug } = useShell();
  const queryClient = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ["notifications", activeOrg.id],
    queryFn: () => fetchNotifications(activeOrg.id),
  });
  const unread = notes.filter((n) => !n.read).length;

  async function onOpen(open: boolean) {
    if (open && unread > 0) {
      await markNotificationsRead(activeOrg.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", activeOrg.id] });
    }
  }

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 size-[7px] rounded-full bg-primary ring-2 ring-card" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-[13px] font-bold">Notifications</span>
          <Link
            href={`/${activeSlug}/inbox`}
            className="text-[11.5px] font-semibold text-primary"
          >
            Open inbox
          </Link>
        </div>
        <ScrollArea className="max-h-80">
          {notes.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="flex flex-col p-1">
              {notes.map((n) => (
                <Link
                  key={n.id}
                  href={
                    n.task
                      ? `/${activeSlug}/projects/${n.task.project_id}/board`
                      : `/${activeSlug}/inbox`
                  }
                  className="flex items-start gap-2.5 rounded-md px-2 py-2 transition hover:bg-accent"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials(n.actor?.full_name, n.actor?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-secondary-foreground">
                      <span className="font-semibold text-foreground">
                        {displayName(n.actor)}
                      </span>{" "}
                      mentioned you in{" "}
                      <span className="font-medium text-foreground">
                        {n.task?.title ?? "a task"}
                      </span>
                    </p>
                    {n.body && (
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        “{n.body}”
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 size-[7px] shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
