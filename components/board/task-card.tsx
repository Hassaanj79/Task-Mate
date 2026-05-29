"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  PriorityFlag,
  DueDateBadge,
  LabelChip,
  AssigneeAvatar,
} from "@/components/task/task-bits";
import { useProject } from "@/components/project/project-context";
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
  const { setOpenTaskId } = useProject();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", task } });

  const assignee = members.find((m) => m.id === task.assignee_id) ?? null;
  const taskLabels = task.label_ids
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean) as Label[];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => setOpenTaskId(task.id)}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition hover:border-foreground/20",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      {taskLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}
      <p className="text-sm font-medium leading-snug">{task.title}</p>
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
