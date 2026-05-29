"use client";

import { useRef, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/project/project-context";
import { createTask } from "@/lib/actions/tasks";
import { qk } from "@/lib/queries";
import { toast } from "sonner";

// Inline "what needs to be done?" card shown inside a board column (design).
// Enter adds and keeps the composer open for the next task; Esc closes it.
export function InlineQuickAdd({
  statusId,
  onClose,
}: {
  statusId: string;
  onClose: () => void;
}) {
  const { orgId, projectId } = useProject();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const title = value.trim();
    if (!title) {
      onClose();
      return;
    }
    start(async () => {
      const res = await createTask({ orgId, projectId, statusId, title });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setValue("");
      queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
      ref.current?.focus();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-primary bg-card p-3 shadow-[0_0_0_3px_var(--accent)]">
      <textarea
        ref={ref}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What needs to be done?"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onClose();
        }}
        className="resize-none border-0 bg-transparent text-sm font-medium leading-snug outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          ↵ to add · Esc to cancel
        </span>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Add
        </Button>
      </div>
    </div>
  );
}
