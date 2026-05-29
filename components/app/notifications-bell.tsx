"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchOrgActivity } from "@/lib/queries";
import { actionLabel } from "@/lib/activity-text";
import { initials, displayName, relativeTime } from "@/lib/format";
import { useShell } from "@/components/app/shell-context";

export function NotificationsBell() {
  const { activeOrg, activeSlug } = useShell();
  const { data: events = [] } = useQuery({
    queryKey: ["org-activity", activeOrg.id, "bell"],
    queryFn: () => fetchOrgActivity(activeOrg.id, 8),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-[18px]" />
          {events.length > 0 && (
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
          {events.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="flex flex-col p-1">
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={`/${activeSlug}/inbox`}
                  className="flex items-start gap-2.5 rounded-md px-2 py-2 transition hover:bg-accent"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={e.actor?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials(e.actor?.full_name, e.actor?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-secondary-foreground">
                      <span className="font-semibold text-foreground">
                        {displayName(e.actor)}
                      </span>{" "}
                      {actionLabel(e.action)}{" "}
                      <span className="font-medium text-foreground">
                        {e.task?.title ?? "a task"}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {relativeTime(e.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
