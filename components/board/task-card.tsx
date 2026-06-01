"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Archive,
  Trash2,
  MessageSquare,
  UserPlus,
  Check,
  AlignLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  TaskTypeIcon,
} from "@/components/task/task-bits";
import { useProject } from "@/components/project/project-context";
import { archiveTask, restoreTask, deleteTask, updateTaskFields } from "@/lib/actions/tasks";
import { qk } from "@/lib/queries";
import { canWrite } from "@/lib/rbac";
import { PRIORITIES, TASK_TYPES, priorityMeta, taskTypeMeta } from "@/lib/constants";
import { richTextToPlain, plainToRichText } from "@/lib/richtext";
import { toast } from "sonner";
import type { Label, Profile, TaskPriority, TaskType } from "@/lib/database.types";
import type { TaskWithLabels } from "@/lib/queries";

// Wrapper that keeps interactive controls from triggering drag / open-panel.
function Stop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

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
  const { role, projectId, orgId, setOpenTaskId } = useProject();
  const queryClient = useQueryClient();
  const writable = canWrite(role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", task } });

  const assignee = members.find((m) => m.id === task.assignee_id) ?? null;
  const taskLabels = task.label_ids
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean) as Label[];
  const descText = richTextToPlain(task.description);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
  }

  async function patch(fields: Parameters<typeof updateTaskFields>[2]) {
    const res = await updateTaskFields(task.id, orgId, fields);
    if (res.error) toast.error(res.error);
    else refresh();
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

      <div className="flex items-start gap-1.5 pr-6">
        {writable && !overlay ? (
          <Stop className="-ml-0.5 shrink-0 pt-0.5">
            <TypePicker value={task.type} onPick={(t) => patch({ type: t })} />
          </Stop>
        ) : (
          <span className="shrink-0 pt-0.5">
            <TaskTypeIcon type={task.type} className="size-[15px]" />
          </span>
        )}
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      </div>

      {/* Description: snippet + inline editor */}
      {descText ? (
        writable && !overlay ? (
          <Stop className="mt-1.5">
            <DescriptionEditor
              initial={descText}
              onSave={(t) => patch({ description: plainToRichText(t) })}
            >
              <button className="line-clamp-2 w-full text-left text-xs leading-snug text-muted-foreground hover:text-foreground">
                {descText}
              </button>
            </DescriptionEditor>
          </Stop>
        ) : (
          <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {descText}
          </p>
        )
      ) : (
        writable &&
        !overlay && (
          <Stop className="mt-1.5">
            <DescriptionEditor
              initial=""
              onSave={(t) => patch({ description: plainToRichText(t) })}
            >
              <button className="flex items-center gap-1 text-xs text-muted-foreground/70 opacity-0 transition hover:text-foreground group-hover:opacity-100">
                <AlignLeft className="size-3" /> Add description
              </button>
            </DescriptionEditor>
          </Stop>
        )
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {writable && !overlay ? (
            <Stop>
              <PriorityPicker
                value={task.priority}
                onPick={(p) => patch({ priority: p })}
              />
            </Stop>
          ) : (
            <PriorityFlag priority={task.priority} />
          )}
          <DueDateBadge due={task.due_date} />
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              {task.comment_count}
            </span>
          )}
        </div>
        {writable && !overlay ? (
          <Stop>
            <AssigneePicker
              value={task.assignee_id}
              members={members}
              onPick={(id) => patch({ assignee_id: id })}
            />
          </Stop>
        ) : (
          <AssigneeAvatar profile={assignee} />
        )}
      </div>
    </div>
  );
}

function TypePicker({
  value,
  onPick,
}: {
  value: TaskType;
  onPick: (t: TaskType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={`Type: ${taskTypeMeta(value).label}`}
          className="flex size-5 items-center justify-center rounded transition hover:bg-accent"
        >
          <TaskTypeIcon type={value} className="size-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Type</DropdownMenuLabel>
        {TASK_TYPES.map((t) => (
          <DropdownMenuItem key={t.value} onClick={() => onPick(t.value)}>
            <TaskTypeIcon type={t.value} className="size-4" />
            <span className="grow">{t.label}</span>
            {value === t.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityPicker({
  value,
  onPick,
}: {
  value: TaskPriority;
  onPick: (p: TaskPriority) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={`Priority: ${priorityMeta(value).label}`}
          className="flex h-5 items-center rounded px-0.5 transition hover:bg-accent"
        >
          <PriorityFlag priority={value} showLabel={value === "none"} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        {PRIORITIES.map((p) => (
          <DropdownMenuItem key={p.value} onClick={() => onPick(p.value)}>
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="grow">{p.label}</span>
            {value === p.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssigneePicker({
  value,
  members,
  onPick,
}: {
  value: string | null;
  members: Profile[];
  onPick: (id: string | null) => void;
}) {
  const assignee = members.find((m) => m.id === value) ?? null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={assignee ? `Assignee: ${assignee.full_name ?? assignee.email}` : "Assign"}
          className="flex items-center rounded-full transition hover:opacity-80"
        >
          {assignee ? (
            <AssigneeAvatar profile={assignee} />
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full border border-dashed text-muted-foreground">
              <UserPlus className="size-3" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Assignee</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onPick(null)}>
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed text-muted-foreground">
            <UserPlus className="size-3" />
          </span>
          <span className="grow">Unassigned</span>
          {value === null && <Check className="size-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {members.map((m) => (
          <DropdownMenuItem key={m.id} onClick={() => onPick(m.id)}>
            <AssigneeAvatar profile={m} />
            <span className="grow truncate">{m.full_name ?? m.email}</span>
            {value === m.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        {members.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No members yet.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DescriptionEditor({
  initial,
  onSave,
  children,
}: {
  initial: string;
  onSave: (text: string) => Promise<void> | void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(value);
    setSaving(false);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(initial);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a description…"
          rows={4}
          className="resize-none text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
