"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Archive, Trash2 } from "lucide-react";
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
import {
  PriorityFlag,
  DueDateBadge,
  LabelChip,
  AssigneeAvatar,
} from "@/components/task/task-bits";
import { useProject } from "@/components/project/project-context";
import { archiveTask, restoreTask, deleteTask } from "@/lib/actions/tasks";
import { qk } from "@/lib/queries";
import { canWrite } from "@/lib/rbac";
import { toast } from "sonner";
import type { Label, Profile } from "@/lib/database.types";
import type { TaskWithLabels } from "@/lib/queries";

export function TaskCard({
  task,
  labels,
  members,
  overlay = false,
}: {
  task: TaskWithLabels;
  labels: Label[];
  members: Profile[];
  overlay?: boolean;
}) {
  const { role, projectId, setOpenTaskId } = useProject();
  const queryClient = useQueryClient();
  const writable = canWrite(role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", task } });

  const assignee = members.find((m) => m.id === task.assignee_id) ?? null;
  const taskLabels = task.label_ids
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean) as Label[];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
  }

  async function onArchive() {
    const res = await archiveTask(task.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    refresh();
    toast("Task archived", {
      description: "Kept for 30 days in the archive.",
      action: {
        label: "Undo",
        onClick: async () => {
          await restoreTask(task.id);
          refresh();
        },
      },
    });
  }

  async function onDelete() {
    setConfirmDelete(false);
    const res = await deleteTask(task.id);
    if (res.error) toast.error(res.error);
    else {
      refresh();
      toast.success("Task deleted");
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => setOpenTaskId(task.id)}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition hover:border-foreground/20",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      {writable && !overlay && (
        <div
          className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex size-6 items-center justify-center rounded-md bg-card/80 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="size-4" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes “{task.title}” and its subtasks,
                  comments, and attachments. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {taskLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1 pr-6">
          {taskLabels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}
      <p className="pr-6 text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityFlag priority={task.priority} />
          <DueDateBadge due={task.due_date} />
        </div>
        <AssigneeAvatar profile={assignee} />
      </div>
    </div>
  );
}
