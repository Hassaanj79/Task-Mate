"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/project/project-context";
import { createStatus } from "@/lib/actions/statuses";
import { qk } from "@/lib/queries";
import { STATUS_COLORS } from "@/lib/constants";
import { toast } from "sonner";

export function AddColumn({ count }: { count: number }) {
  const { orgId, projectId } = useProject();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    const n = name.trim();
    if (!n) {
      setAdding(false);
      return;
    }
    const color = STATUS_COLORS[count % STATUS_COLORS.length];
    start(async () => {
      const res = await createStatus(orgId, projectId, n, color);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setName("");
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
    });
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex h-9 w-64 shrink-0 items-center gap-2 rounded-[var(--radius)] border border-dashed border-border-strong px-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-accent-foreground"
        style={{ borderColor: "var(--border-strong)" }}
      >
        <Plus className="size-4" /> Add column
      </button>
    );
  }

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2 rounded-[var(--radius)] border border-primary bg-card p-2 shadow-[0_0_0_3px_var(--accent)]">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Column name…"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setAdding(false);
            setName("");
          }
        }}
        className="border-0 bg-transparent px-1 text-sm font-semibold outline-none"
      />
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setAdding(false);
            setName("");
          }}
        >
          <X className="size-4" />
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Add
        </Button>
      </div>
    </div>
  );
}
