"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProject } from "@/components/project/project-context";
import { fetchStatuses, qk } from "@/lib/queries";
import { createTask } from "@/lib/actions/tasks";
import { toast } from "sonner";

export function QuickAddTask({
  open,
  onOpenChange,
  defaultStatusId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultStatusId?: string;
}) {
  const { orgId, projectId } = useProject();
  const queryClient = useQueryClient();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [statusId, setStatusId] = useState<string | undefined>(defaultStatusId);

  const { data: statuses = [] } = useQuery({
    queryKey: qk.statuses(projectId),
    queryFn: () => fetchStatuses(projectId),
    enabled: open,
  });

  // Effective selection: explicit choice, else the column passed in, else first.
  const selected = statusId ?? defaultStatusId ?? statuses[0]?.id;

  function submit() {
    if (!title.trim()) return;
    start(async () => {
      const res = await createTask({
        orgId,
        projectId,
        statusId: selected ?? null,
        title,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setTitle("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task to this project.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={selected} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
