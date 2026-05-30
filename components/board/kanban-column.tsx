"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskCard } from "@/components/board/task-card";
import { InlineQuickAdd } from "@/components/board/inline-quick-add";
import { useProject } from "@/components/project/project-context";
import { canWrite } from "@/lib/rbac";
import { renameStatus, deleteStatus } from "@/lib/actions/statuses";
import { qk } from "@/lib/queries";
import { toast } from "sonner";
import type { Label, Profile, TaskStatus } from "@/lib/database.types";
import type { TaskWithLabels } from "@/lib/queries";

export function KanbanColumn({
  status,
  tasks,
  labels,
  members,
  adding,
  onStartAdd,
  onCloseAdd,
  canMoveLeft,
  canMoveRight,
  onMove,
}: {
  status: TaskStatus;
  tasks: TaskWithLabels[];
  labels: Label[];
  members: Profile[];
  adding: boolean;
  onStartAdd: (statusId: string) => void;
  onCloseAdd: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMove?: (dir: "left" | "right") => void;
}) {
  const { role, projectId } = useProject();
  const queryClient = useQueryClient();
  const writable = canWrite(role);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(status.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, start] = useTransition();
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: { type: "column", statusId: status.id },
  });

  function saveName() {
    setRenaming(false);
    if (name.trim() && name !== status.name) {
      start(async () => {
        const res = await renameStatus(status.id, name.trim());
        if (res.error) toast.error(res.error);
        else queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
      });
    } else {
      setName(status.name);
    }
  }

  function doDelete() {
    setConfirmDelete(false);
    start(async () => {
      const res = await deleteStatus(status.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Column deleted");
        queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
        queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
      }
    });
  }

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: status.color ?? "#94a3b8" }}
          />
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setName(status.name);
                  setRenaming(false);
                }
              }}
              className="w-28 rounded border bg-card px-1 text-[13px] font-bold outline-none"
            />
          ) : (
            <span className="truncate text-[13px] font-bold">{status.name}</span>
          )}
          <span className="rounded-full bg-secondary px-1.5 text-xs font-semibold text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {writable && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onStartAdd(status.id)}
              title="Add task"
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRenaming(true)}>
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canMoveLeft}
                  onClick={() => onMove?.("left")}
                >
                  <ArrowLeft className="size-4" /> Move left
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canMoveRight}
                  onClick={() => onMove?.("right")}
                >
                  <ArrowRight className="size-4" /> Move right
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" /> Delete column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-[var(--radius)] p-1.5 transition-colors",
          isOver
            ? "border-[1.5px] border-primary/30 bg-accent"
            : "border-[1.5px] border-transparent",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} labels={labels} members={members} />
          ))}
        </SortableContext>

        {adding && writable && (
          <InlineQuickAdd statusId={status.id} onClose={onCloseAdd} />
        )}

        {writable && !adding && tasks.length === 0 && (
          <button
            onClick={() => onStartAdd(status.id)}
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border-[1.5px] border-dashed px-3 py-3 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-accent-foreground"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <Plus className="size-4" /> Add task
          </button>
        )}

        {writable && !adding && tasks.length > 0 && (
          <button
            onClick={() => onStartAdd(status.id)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="size-4" /> Add task
          </button>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{status.name}” column?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks in this column won&apos;t be deleted, but they&apos;ll lose
              their status until you move them to another column.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
