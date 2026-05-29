"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/board/kanban-column";
import { TaskCard } from "@/components/board/task-card";
import { useProject } from "@/components/project/project-context";
import {
  fetchStatuses,
  fetchTasks,
  fetchLabels,
  qk,
  type TaskWithLabels,
} from "@/lib/queries";
import { moveTask } from "@/lib/actions/tasks";
import { POSITION_STEP } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { TaskStatus } from "@/lib/database.types";

export function BoardView({
  initialStatuses,
  initialTasks,
}: {
  initialStatuses: TaskStatus[];
  initialTasks: TaskWithLabels[];
}) {
  const { orgId, projectId, members, addTick } = useProject();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskWithLabels | null>(null);
  const [addingStatusId, setAddingStatusId] = useState<string | null>(null);

  const { data: statuses = [] } = useQuery({
    queryKey: qk.statuses(projectId),
    queryFn: () => fetchStatuses(projectId),
    initialData: initialStatuses,
  });
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: qk.tasks(projectId),
    queryFn: () => fetchTasks(projectId),
    initialData: initialTasks,
  });
  const { data: labels = [] } = useQuery({
    queryKey: ["labels", orgId],
    queryFn: () => fetchLabels(orgId),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Header "New task" / `c` opens inline add in the first column.
  useEffect(() => {
    if (addTick > 0 && statuses.length > 0)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddingStatusId(statuses[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTick]);

  const byStatus = useMemo(() => {
    const map = new Map<string, TaskWithLabels[]>();
    for (const s of statuses) map.set(s.id, []);
    const unassigned: TaskWithLabels[] = [];
    for (const t of [...tasks].sort((a, b) => a.position - b.position)) {
      if (t.status_id && map.has(t.status_id)) map.get(t.status_id)!.push(t);
      else unassigned.push(t);
    }
    return { map, unassigned };
  }, [statuses, tasks]);

  function onDragStart(e: DragStartEvent) {
    const t = tasks.find((x) => x.id === e.active.id);
    setActiveTask(t ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const moved = tasks.find((t) => t.id === activeId);
    if (!moved) return;

    // Resolve destination column.
    const overData = over.data.current as
      | { type: "column"; statusId: string }
      | { type: "task"; task: TaskWithLabels }
      | undefined;
    let destStatus: string | null;
    let overTaskId: string | null = null;
    if (overData?.type === "column") {
      destStatus = overData.statusId;
    } else if (overData?.type === "task") {
      destStatus = overData.task.status_id;
      overTaskId = overData.task.id;
    } else {
      destStatus = moved.status_id;
    }

    const column = [...tasks]
      .filter((t) => t.status_id === destStatus && t.id !== activeId)
      .sort((a, b) => a.position - b.position);

    let index = column.length;
    if (overTaskId) {
      const i = column.findIndex((t) => t.id === overTaskId);
      if (i >= 0) index = i;
    }

    const prev = column[index - 1]?.position;
    const next = column[index]?.position;
    let newPos: number;
    if (prev == null && next == null) newPos = POSITION_STEP;
    else if (prev == null) newPos = next! / 2;
    else if (next == null) newPos = prev + POSITION_STEP;
    else newPos = (prev + next) / 2;

    if (destStatus === moved.status_id && newPos === moved.position) return;

    // Optimistic update.
    queryClient.setQueryData<TaskWithLabels[]>(qk.tasks(projectId), (old) =>
      (old ?? []).map((t) =>
        t.id === activeId ? { ...t, status_id: destStatus, position: newPos } : t,
      ),
    );

    moveTask(activeId, orgId, destStatus, newPos).then((res) => {
      if (res.error) {
        toast.error(res.error);
        queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-72 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={byStatus.map.get(status.id) ?? []}
            labels={labels}
            members={members}
            adding={addingStatusId === status.id}
            onStartAdd={(id) => setAddingStatusId(id)}
            onCloseAdd={() => setAddingStatusId(null)}
          />
        ))}
        {statuses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No board columns. Recreate the project to seed default statuses.
          </p>
        )}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} labels={labels} members={members} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
