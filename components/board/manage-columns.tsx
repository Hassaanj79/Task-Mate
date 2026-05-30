"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createStatus,
  renameStatus,
  setStatusColor,
  deleteStatus,
  reorderStatuses,
} from "@/lib/actions/statuses";
import { qk } from "@/lib/queries";
import { STATUS_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import type { TaskStatus } from "@/lib/database.types";

export function ManageColumns({
  open,
  onOpenChange,
  orgId,
  projectId,
  statuses,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  projectId: string;
  statuses: TaskStatus[];
}) {
  const queryClient = useQueryClient();
  const [, start] = useTransition();
  const [newName, setNewName] = useState("");

  const ordered = [...statuses].sort((a, b) => a.position - b.position);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
    queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[j]] = [next[j], next[index]];
    const updates = next.map((s, i) => ({ id: s.id, position: i }));
    queryClient.setQueryData<TaskStatus[]>(qk.statuses(projectId), (old) =>
      (old ?? []).map((s) => {
        const u = updates.find((x) => x.id === s.id);
        return u ? { ...s, position: u.position } : s;
      }),
    );
    start(async () => {
      const res = await reorderStatuses(updates);
      if (res.error) {
        toast.error(res.error);
        refresh();
      }
    });
  }

  function rename(id: string, name: string, prev: string) {
    if (!name.trim() || name === prev) return;
    start(async () => {
      const res = await renameStatus(id, name.trim());
      if (res.error) toast.error(res.error);
      else refresh();
    });
  }

  function recolor(id: string, color: string) {
    start(async () => {
      const res = await setStatusColor(id, color);
      if (res.error) toast.error(res.error);
      else refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteStatus(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Column deleted");
        refresh();
      }
    });
  }

  function add() {
    const n = newName.trim();
    if (!n) return;
    const color = STATUS_COLORS[ordered.length % STATUS_COLORS.length];
    start(async () => {
      const res = await createStatus(orgId, projectId, n, color);
      if (res.error) toast.error(res.error);
      else {
        setNewName("");
        refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Manage columns</DialogTitle>
          <DialogDescription>
            Rename, recolor, reorder, or remove the board&apos;s columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {ordered.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <ColorDot color={s.color ?? "#94a3b8"} onChange={(c) => recolor(s.id, c)} />
              <Input
                defaultValue={s.name}
                onBlur={(e) => rename(s.id, e.target.value, s.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="h-8 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={i === ordered.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(s.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New column name…"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button onClick={add}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorDot({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="size-5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: color }}
          title="Change color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="start">
        <div className="grid grid-cols-4 gap-2">
          {STATUS_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={cn(
                "flex size-7 items-center justify-center rounded-full ring-1 ring-black/10",
                c === color && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: c }}
            >
              {c === color && <Check className="size-3.5 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
