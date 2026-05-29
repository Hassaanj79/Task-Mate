"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useShell } from "@/components/app/shell-context";

// Live notifications: realtime insert → in-app toast + desktop push (Web
// Notification API, no server keys needed) + refresh the bell/inbox.
export function NotificationsListener() {
  const { activeOrg, currentUserId } = useShell();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Ask once for desktop notification permission.
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`notif-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as { body?: string | null };
          const message = "You were mentioned in a comment";
          toast(message, { description: row.body ?? undefined, icon: "💬" });
          queryClient.invalidateQueries({
            queryKey: ["notifications", activeOrg.id],
          });
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("Task Mate", {
                body: row.body ? `${message}: ${row.body}` : message,
              });
            } catch {
              // ignore (e.g. unsupported in this context)
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeOrg.id, queryClient]);

  return null;
}
