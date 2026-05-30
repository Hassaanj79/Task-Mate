"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PriorityFlag,
  DueDateBadge,
  LabelChip,
  AssigneeAvatar,
} from "@/components/task/task-bits";
import { useProject } from "@/components/project/project-context";
import { archiveTask, restoreTask } from "@/lib/actions/tasks";
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
            </DropdownMenuContent>
          </DropdownMenu>
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
