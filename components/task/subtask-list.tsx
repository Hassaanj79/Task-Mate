"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchSubtasks, qk } from "@/lib/queries";
import { createTask, updateTaskFields, deleteTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Subtasks reuse the tasks table (parent_id). A subtask is "done" when its
// status maps to the project's last column; here we model done via a dedicated
// flag stored on the title-less convention: we simply toggle completion by
// moving it to the final status. To keep it simple, completion is tracked with
// the task's status_id === doneStatusId passed from the panel.
export function SubtaskList({
  orgId,
  projectId,
  parentId,
  doneStatusId,
  todoStatusId,
  canWrite,
}: {
  orgId: string;
  projectId: string;
  parentId: string;
  doneStatusId: string | null;
  todoStatusId: string | null;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const { data: subtasks = [] } = useQuery({
    queryKey: qk.subtasks(parentId),
    queryFn: () => fetchSubtasks(parentId),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: qk.subtasks(parentId) });
  }

  async function add() {
    const t = title.trim();
    if (!t) return;
    const res = await createTask({
      orgId,
      projectId,
      statusId: todoStatusId,
      title: t,
      parentId,
    });
    if (res.error) toast.error(res.error);
    else {
      setTitle("");
      refresh();
    }
  }

  async function toggle(id: string, done: boolean) {
    const res = await updateTaskFields(id, orgId, {
      status_id: done ? doneStatusId : todoStatusId,
    });
    if (res.error) toast.error(res.error);
    else refresh();
  }

  async function remove(id: string) {
    const res = await deleteTask(id);
    if (res.error) toast.error(res.error);
    else refresh();
  }

  const done = subtasks.filter((s) => s.status_id === doneStatusId).length;

  return (
    <div className="space-y-2">
      {subtasks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {done} / {subtasks.length} complete
        </p>
      )}
      {subtasks.map((s) => {
        const isDone = s.status_id === doneStatusId;
        return (
          <div key={s.id} className="group flex items-center gap-2">
            <Checkbox
              checked={isDone}
              disabled={!canWrite}
              onCheckedChange={(v) => toggle(s.id, Boolean(v))}
            />
            <span
              className={cn(
                "flex-1 text-sm",
                isDone && "text-muted-foreground line-through",
              )}
            >
              {s.title}
            </span>
            {canWrite && (
              <button
                onClick={() => remove(s.id)}
                className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
      {canWrite && (
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-muted-foreground" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a subtask"
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
