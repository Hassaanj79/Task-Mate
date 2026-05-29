"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type JSONContent } from "@tiptap/react";
import { Trash2, Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/task/rich-text-editor";
import { LabelPicker } from "@/components/task/label-picker";
import { CommentThread } from "@/components/task/comment-thread";
import { AttachmentsList } from "@/components/task/attachments-list";
import { ActivityFeed } from "@/components/task/activity-feed";
import { SubtaskList } from "@/components/task/subtask-list";
import { AssigneeAvatar, PriorityFlag } from "@/components/task/task-bits";
import { useProject } from "@/components/project/project-context";
import {
  fetchTask,
  fetchStatuses,
  qk,
} from "@/lib/queries";
import { updateTaskFields, deleteTask } from "@/lib/actions/tasks";
import { PRIORITIES } from "@/lib/constants";
import { canWrite } from "@/lib/rbac";
import { displayName } from "@/lib/format";
import { toast } from "sonner";
import type { TaskPriority } from "@/lib/database.types";

export function TaskPanel() {
  const {
    orgId,
    projectId,
    role,
    members,
    currentUserId,
    openTaskId,
    setOpenTaskId,
  } = useProject();
  const queryClient = useQueryClient();
  const writable = canWrite(role);
  const open = openTaskId !== null;

  const { data: task, isLoading } = useQuery({
    queryKey: openTaskId ? qk.task(openTaskId) : ["task", "none"],
    queryFn: () => fetchTask(openTaskId!),
    enabled: open,
  });
  const { data: statuses = [] } = useQuery({
    queryKey: qk.statuses(projectId),
    queryFn: () => fetchStatuses(projectId),
  });

  // Debounce description saves so we don't write on every keystroke.
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function saveDescription(json: unknown) {
    if (descTimer.current) clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => patch({ description: json }), 800);
  }
  useEffect(() => () => {
    if (descTimer.current) clearTimeout(descTimer.current);
  }, []);

  function invalidateAll() {
    if (!openTaskId) return;
    queryClient.invalidateQueries({ queryKey: qk.task(openTaskId) });
    queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
    queryClient.invalidateQueries({ queryKey: qk.activity(openTaskId) });
  }

  async function patch(p: Parameters<typeof updateTaskFields>[2]) {
    if (!openTaskId) return;
    const res = await updateTaskFields(openTaskId, orgId, p);
    if (res.error) toast.error(res.error);
    else invalidateAll();
  }

  async function onDelete() {
    if (!openTaskId) return;
    const res = await deleteTask(openTaskId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setOpenTaskId(null);
    queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
    toast.success("Task deleted");
  }

  const doneStatusId = statuses[statuses.length - 1]?.id ?? null;
  const todoStatusId = statuses[0]?.id ?? null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && setOpenTaskId(null)}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto p-0 sm:w-[52vw] sm:min-w-[560px] sm:max-w-none"
      >
        {/* Always present so the dialog is labelled even while loading. */}
        <SheetTitle className="sr-only">Task details</SheetTitle>
        {isLoading || !task ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center justify-between gap-2">
                <Select
                  value={task.status_id ?? undefined}
                  disabled={!writable}
                  onValueChange={(v) => patch({ status_id: v })}
                >
                  <SelectTrigger className="h-8 w-auto gap-2 border-none shadow-none">
                    <SelectValue placeholder="No status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: s.color ?? "#94a3b8" }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  {writable && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete task?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the task and its subtasks,
                            comments, and attachments.
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
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setOpenTaskId(null)}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-6">
              {/* Title (uncontrolled, keyed per task; saves on blur) */}
              <Input
                key={task.id}
                defaultValue={task.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== task.title) patch({ title: v });
                }}
                disabled={!writable}
                className="h-auto border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0 disabled:opacity-100"
              />

              {/* Properties */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-y-3 text-sm">
                <span className="text-muted-foreground">Assignee</span>
                <Select
                  value={task.assignee_id ?? "none"}
                  disabled={!writable}
                  onValueChange={(v) =>
                    patch({ assignee_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <AssigneeAvatar profile={m} />
                          {displayName(m)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">Priority</span>
                <Select
                  value={task.priority}
                  disabled={!writable}
                  onValueChange={(v) => patch({ priority: v as TaskPriority })}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <PriorityFlag priority={p.value} showLabel />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">Due date</span>
                <Input
                  type="date"
                  disabled={!writable}
                  value={task.due_date ? task.due_date.slice(0, 10) : ""}
                  onChange={(e) =>
                    patch({
                      due_date: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                  className="h-8 w-full"
                />

                <span className="text-muted-foreground">Labels</span>
                <LabelPicker
                  orgId={orgId}
                  taskId={task.id}
                  selectedIds={task.label_ids}
                  disabled={!writable}
                  onChange={invalidateAll}
                />
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Description</h3>
                <RichTextEditor
                  key={task.id}
                  value={task.description as JSONContent | null}
                  editable={writable}
                  placeholder="Add a description…"
                  onChange={saveDescription}
                />
              </div>

              <Separator />

              {/* Subtasks */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Subtasks</h3>
                <SubtaskList
                  orgId={orgId}
                  projectId={projectId}
                  parentId={task.id}
                  doneStatusId={doneStatusId}
                  todoStatusId={todoStatusId}
                  canWrite={writable}
                />
              </div>

              <Separator />

              {/* Comments / Attachments / Activity */}
              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                  <TabsTrigger value="attachments">Files</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="pt-4">
                  <CommentThread
                    orgId={orgId}
                    taskId={task.id}
                    currentUserId={currentUserId}
                    canComment={writable}
                  />
                </TabsContent>
                <TabsContent value="attachments" className="pt-4">
                  <AttachmentsList
                    orgId={orgId}
                    taskId={task.id}
                    canWrite={writable}
                  />
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <ActivityFeed taskId={task.id} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
