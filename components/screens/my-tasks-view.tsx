"use client";

import { useRouter } from "next/navigation";
import { CheckSquare, AlertCircle, Circle, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/app/topbar";
import { PriorityFlag, DueDateBadge } from "@/components/task/task-bits";
import { ProjectIcon } from "@/components/project/project-icon";
import { isPast, isToday } from "date-fns";
import type { TaskPriority } from "@/lib/database.types";

export type MyTask = {
  id: string;
  title: string;
  due_date: string | null;
  priority: TaskPriority;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  projectIcon: string | null;
  statusName: string | null;
  statusColor: string | null;
  done: boolean;
};

export function MyTasksView({
  orgSlug,
  tasks,
}: {
  orgSlug: string;
  tasks: MyTask[];
}) {
  const router = useRouter();

  const groups: { id: string; label: string; rows: MyTask[]; danger?: boolean }[] = [
    {
      id: "overdue",
      label: "Overdue",
      danger: true,
      rows: tasks.filter(
        (t) => !t.done && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)),
      ),
    },
    {
      id: "today",
      label: "Today",
      rows: tasks.filter((t) => !t.done && t.due_date && isToday(new Date(t.due_date))),
    },
    {
      id: "upcoming",
      label: "Upcoming",
      rows: tasks.filter(
        (t) => !t.done && t.due_date && !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)),
      ),
    },
    {
      id: "nodate",
      label: "No due date",
      rows: tasks.filter((t) => !t.done && !t.due_date),
    },
    { id: "done", label: "Completed", rows: tasks.filter((t) => t.done) },
  ];

  function open(t: MyTask) {
    router.push(`/${orgSlug}/projects/${t.projectId}/board`);
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="My Tasks"
        icon={<CheckSquare className="size-[19px] text-primary" />}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-7 py-7">
          {tasks.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
              <CheckSquare className="size-10" />
              <p className="font-medium">Nothing assigned to you yet.</p>
            </div>
          )}
          {groups.map((g) =>
            g.rows.length === 0 ? null : (
              <div key={g.id} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 text-[13px] font-bold ${
                      g.danger ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {g.danger && <AlertCircle className="size-[15px]" />}
                    {g.label}
                  </span>
                  <span className="rounded-full bg-secondary px-1.5 text-xs font-semibold text-muted-foreground">
                    {g.rows.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-[var(--radius)] border bg-card shadow-sm">
                  {g.rows.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => open(t)}
                      className={`flex h-[46px] w-full items-center gap-3 px-4 text-left transition hover:bg-accent ${
                        i < g.rows.length - 1 ? "border-b" : ""
                      }`}
                    >
                      {t.done ? (
                        <CheckCircle2
                          className="size-[18px] shrink-0"
                          style={{ color: "oklch(0.64 0.13 155)" }}
                        />
                      ) : (
                        <Circle
                          className="size-[18px] shrink-0"
                          style={{ color: t.statusColor ?? "#94a3b8" }}
                        />
                      )}
                      <span
                        className={`grow truncate text-[13.5px] font-medium ${
                          t.done ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                        <ProjectIcon
                          icon={t.projectIcon}
                          className="size-3.5"
                          style={{ color: t.projectColor ?? undefined }}
                        />
                        {t.projectName}
                      </span>
                      {t.due_date && <DueDateBadge due={t.due_date} />}
                      <PriorityFlag priority={t.priority} />
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
