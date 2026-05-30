"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/format";

export function RunHistory({
  open,
  onOpenChange,
  automationId,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  automationId: string;
  name: string;
}) {
  const { data: runs = [] } = useQuery({
    queryKey: ["automation-runs", automationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("automation_runs")
        .select("id, status, error, created_at")
        .eq("automation_id", automationId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Run history</DialogTitle>
          <DialogDescription className="truncate">{name}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No runs yet.
            </p>
          ) : (
            <div className="space-y-1">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm">
                  {r.status === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0" style={{ color: "oklch(0.64 0.13 155)" }} />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <span className="grow truncate">
                    {r.status === "success" ? "Ran successfully" : r.error ?? "Failed"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(r.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
