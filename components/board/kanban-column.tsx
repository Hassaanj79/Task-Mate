"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/board/task-card";
import { InlineQuickAdd } from "@/components/board/inline-quick-add";
import { useProject } from "@/components/project/project-context";
import { canWrite } from "@/lib/rbac";
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
}: {
  status: TaskStatus;
  tasks: TaskWithLabels[];
  labels: Label[];
  members: Profile[];
  adding: boolean;
  onStartAdd: (statusId: string) => void;
  onCloseAdd: () => void;
}) {
  const { role } = useProject();
  const writable = canWrite(role);
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: { type: "column", statusId: status.id },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1.5">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: status.color ?? "#94a3b8" }}
          />
          <span className="text-[13px] font-bold">{status.name}</span>
          <span className="rounded-full bg-secondary px-1.5 text-xs font-semibold text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {writable && (
          <button
            onClick={() => onStartAdd(status.id)}
            title="Add task"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="size-4" />
          </button>
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
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius)] border-[1.5px] border-dashed border-border-strong px-3 py-3 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-accent-foreground"
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
    </div>
  );
}
