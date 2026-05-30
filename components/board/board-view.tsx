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
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/board/kanban-column";
import { TaskCard } from "@/components/board/task-card";
import { AddColumn } from "@/components/board/add-column";
import { ManageColumns } from "@/components/board/manage-columns";
import { useProject } from "@/components/project/project-context";
import {
  fetchStatuses,
  fetchTasks,
  fetchLabels,
  qk,
  type TaskWithLabels,
} from "@/lib/queries";
import { moveTask } from "@/lib/actions/tasks";
import { reorderStatuses } from "@/lib/actions/statuses";
import { POSITION_STEP, PRIORITIES } from "@/lib/constants";
import { canWrite } from "@/lib/rbac";
import { displayName } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Columns3 } from "lucide-react";
import { toast } from "sonner";
import type { TaskStatus } from "@/lib/database.types";

export function BoardView({
  initialStatuses,
  initialTasks,
}: {
  initialStatuses: TaskStatus[];
  initialTasks: TaskWithLabels[];
}) {
  const { orgId, projectId, members, role, addTick } = useProject();
  const queryClient = useQueryClient();
  const writable = canWrite(role);
  const [activeTask, setActiveTask] = useState<TaskWithLabels | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null);
  const [addingStatusId, setAddingStatusId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [priority, setPriority] = useState("all");
  const [labelId, setLabelId] = useState("all");
  const [manageOpen, setManageOpen] = useState(false);
  const filtersActive =
    search !== "" || assignee !== "all" || priority !== "all" || labelId !== "all";
  function clearFilters() {
    setSearch("");
    setAssignee("all");
    setPriority("all");
    setLabelId("all");
  }

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (assignee !== "all") {
        if (assignee === "none" ? t.assignee_id : t.assignee_id !== assignee)
          return false;
      }
      if (priority !== "all" && t.priority !== priority) return false;
      if (labelId !== "all" && !t.label_ids.includes(labelId)) return false;
      return true;
    });
  }, [tasks, search, assignee, priority, labelId]);

  const byStatus = useMemo(() => {
    const map = new Map<string, TaskWithLabels[]>();
    for (const s of statuses) map.set(s.id, []);
    const unassigned: TaskWithLabels[] = [];
    for (const t of [...filteredTasks].sort((a, b) => a.position - b.position)) {
      if (t.status_id && map.has(t.status_id)) map.get(t.status_id)!.push(t);
      else unassigned.push(t);
    }
    return { map, unassigned };
  }, [statuses, filteredTasks]);

  function moveColumn(statusId: string, dir: "left" | "right") {
    const ordered = [...statuses].sort((a, b) => a.position - b.position);
    const i = ordered.findIndex((s) => s.id === statusId);
    const j = dir === "left" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    const a = ordered[i];
    const b = ordered[j];
    queryClient.setQueryData<TaskStatus[]>(qk.statuses(projectId), (old) =>
      (old ?? []).map((s) =>
        s.id === a.id
          ? { ...s, position: b.position }
          : s.id === b.id
            ? { ...s, position: a.position }
            : s,
      ),
    );
    reorderStatuses([
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]).then((res) => {
      if (res.error) {
        toast.error(res.error);
        queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
      }
    });
  }

  // Reorder columns by their ids (active first, dropped onto target).
  function reorderColumns(activeId: string, overStatusId: string) {
    const ordered = [...statuses].sort((a, b) => a.position - b.position);
    const from = ordered.findIndex((s) => s.id === activeId);
    const to = ordered.findIndex((s) => s.id === overStatusId);
    if (from < 0 || to < 0 || from === to) return;
    const next = arrayMove(ordered, from, to);
    const updates = next.map((s, i) => ({ id: s.id, position: i }));
    queryClient.setQueryData<TaskStatus[]>(qk.statuses(projectId), (old) =>
      (old ?? []).map((s) => {
        const u = updates.find((x) => x.id === s.id);
        return u ? { ...s, position: u.position } : s;
      }),
    );
    reorderStatuses(updates).then((res) => {
      if (res.error) {
        toast.error(res.error);
        queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
      }
    });
  }

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { type?: string } | undefined;
    if (data?.type === "column-sort") {
      setActiveColumn(statuses.find((s) => s.id === e.active.id) ?? null);
      return;
    }
    const t = tasks.find((x) => x.id === e.active.id);
    setActiveTask(t ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const wasColumn = activeColumn;
    setActiveColumn(null);
    const { active, over } = e;
    if (!over) return;

    // Column reorder branch.
    if (wasColumn || (active.data.current as { type?: string })?.type === "column-sort") {
      const overData = over.data.current as
        | { type?: string; statusId?: string; task?: TaskWithLabels }
        | undefined;
      const overStatusId =
        overData?.statusId ?? overData?.task?.status_id ?? String(over.id);
      reorderColumns(String(active.id), overStatusId);
      return;
    }

    const activeId = String(active.id);
    const moved = tasks.find((t) => t.id === activeId);
    if (!moved) return;

    // Resolve destination column.
    const overData = over.data.current as
      | { type: "column" | "column-sort"; statusId: string }
      | { type: "task"; task: TaskWithLabels }
      | undefined;
    let destStatus: string | null;
    let overTaskId: string | null = null;
    if (overData?.type === "column" || overData?.type === "column-sort") {
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
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2.5">
        <Input
          placeholder="Filter tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-[200px]"
        />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anyone</SelectItem>
            <SelectItem value="none">Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {displayName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any priority</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={labelId} onValueChange={setLabelId}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            {labels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-3.5" /> Clear
          </Button>
        )}
        {writable && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setManageOpen(true)}
          >
            <Columns3 className="size-4" /> Columns
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-6">
          <SortableContext
            items={statuses.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            {statuses.map((status, i) => (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={byStatus.map.get(status.id) ?? []}
                labels={labels}
                members={members}
                adding={addingStatusId === status.id}
                onStartAdd={(id) => setAddingStatusId(id)}
                onCloseAdd={() => setAddingStatusId(null)}
                canMoveLeft={i > 0}
                canMoveRight={i < statuses.length - 1}
                onMove={(dir) => moveColumn(status.id, dir)}
              />
            ))}
          </SortableContext>
          {writable && <AddColumn count={statuses.length} />}
          {statuses.length === 0 && !writable && (
            <p className="text-sm text-muted-foreground">No board columns yet.</p>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} labels={labels} members={members} overlay />
          ) : activeColumn ? (
            <div className="w-64 rounded-[var(--radius)] border bg-card p-2 shadow-lg">
              <div className="flex items-center gap-2 px-1.5 py-1">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: activeColumn.color ?? "#94a3b8" }}
                />
                <span className="text-[13px] font-bold">{activeColumn.name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ManageColumns
        open={manageOpen}
        onOpenChange={setManageOpen}
        orgId={orgId}
        projectId={projectId}
        statuses={statuses}
      />
    </div>
  );
}
