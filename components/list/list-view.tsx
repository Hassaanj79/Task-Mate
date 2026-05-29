"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PriorityFlag,
  DueDateBadge,
  AssigneeAvatar,
} from "@/components/task/task-bits";
import { useProject } from "@/components/project/project-context";
import { QuickAddTask } from "@/components/board/quick-add-task";
import {
  fetchStatuses,
  fetchTasks,
  qk,
  type TaskWithLabels,
} from "@/lib/queries";
import { PRIORITY_RANK } from "@/lib/constants";
import { displayName } from "@/lib/format";
import type { TaskStatus } from "@/lib/database.types";

export function ListView({
  initialStatuses,
  initialTasks,
}: {
  initialStatuses: TaskStatus[];
  initialTasks: TaskWithLabels[];
}) {
  const { projectId, members, setOpenTaskId, addTick } = useProject();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (addTick > 0) setAddOpen(true);
  }, [addTick]);

  const { data: statuses = [] } = useQuery({
    queryKey: qk.statuses(projectId),
    queryFn: () => fetchStatuses(projectId),
    initialData: initialStatuses,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: qk.tasks(projectId),
    queryFn: () => fetchTasks(projectId),
    initialData: initialTasks,
  });

  const statusName = useMemo(() => {
    const m = new Map<string, TaskStatus>();
    statuses.forEach((s) => m.set(s.id, s));
    return m;
  }, [statuses]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status_id !== statusFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "none" ? t.assignee_id : t.assignee_id !== assigneeFilter)
          return false;
      }
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  const columns = useMemo<ColumnDef<TaskWithLabels>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortHeader column={column} label="Title" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        id: "status",
        accessorFn: (t) => statusName.get(t.status_id ?? "")?.name ?? "",
        header: ({ column }) => <SortHeader column={column} label="Status" />,
        cell: ({ row }) => {
          const s = statusName.get(row.original.status_id ?? "");
          if (!s) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="flex items-center gap-1.5 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: s.color ?? "#94a3b8" }}
              />
              {s.name}
            </span>
          );
        },
      },
      {
        id: "priority",
        accessorFn: (t) => PRIORITY_RANK[t.priority],
        header: ({ column }) => <SortHeader column={column} label="Priority" />,
        cell: ({ row }) => <PriorityFlag priority={row.original.priority} showLabel />,
      },
      {
        id: "assignee",
        accessorFn: (t) =>
          displayName(members.find((m) => m.id === t.assignee_id)),
        header: ({ column }) => <SortHeader column={column} label="Assignee" />,
        cell: ({ row }) => {
          const a = members.find((m) => m.id === row.original.assignee_id);
          if (!a) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="flex items-center gap-2 text-sm">
              <AssigneeAvatar profile={a} />
              {displayName(a)}
            </span>
          );
        },
      },
      {
        id: "due",
        accessorFn: (t) => t.due_date ?? "",
        header: ({ column }) => <SortHeader column={column} label="Due" />,
        cell: ({ row }) =>
          row.original.due_date ? (
            <DueDateBadge due={row.original.due_date} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [statusName, members],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value) =>
      row.original.title.toLowerCase().includes(String(value).toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-9 w-40">
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
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No tasks match.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setOpenTaskId(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <QuickAddTask
        key={addOpen ? "open" : "closed"}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}

function SortHeader({
  column,
  label,
}: {
  column: import("@tanstack/react-table").Column<TaskWithLabels, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted ? (
        <ChevronDown
          className={sorted === "asc" ? "size-3.5 rotate-180" : "size-3.5"}
        />
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  );
}
