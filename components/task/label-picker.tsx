"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LabelChip } from "@/components/task/task-bits";
import { fetchLabels } from "@/lib/queries";
import { setTaskLabel, createLabel } from "@/lib/actions/tasks";
import { LABEL_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Label } from "@/lib/database.types";

export function LabelPicker({
  orgId,
  taskId,
  selectedIds,
  disabled,
  onChange,
}: {
  orgId: string;
  taskId: string;
  selectedIds: string[];
  disabled?: boolean;
  onChange: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", orgId],
    queryFn: () => fetchLabels(orgId),
  });

  const selected = labels.filter((l) => selectedIds.includes(l.id));

  async function toggle(label: Label) {
    const attach = !selectedIds.includes(label.id);
    const res = await setTaskLabel(taskId, orgId, label.id, attach);
    if (res.error) toast.error(res.error);
    else onChange();
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;
    const color = LABEL_COLORS[labels.length % LABEL_COLORS.length];
    const res = await createLabel(orgId, name, color);
    if (res.error || !res.label) {
      toast.error(res.error ?? "Could not create label");
      return;
    }
    setNewName("");
    queryClient.invalidateQueries({ queryKey: ["labels", orgId] });
    await setTaskLabel(taskId, orgId, res.label.id, true);
    onChange();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((l) => (
        <LabelChip key={l.id} label={l} />
      ))}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs">
              <Tag className="size-3" />
              {selected.length === 0 && "Add type"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start">
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {labels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => toggle(l)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: l.color ?? "#64748b" }}
                  />
                  <span className="flex-1 text-left">{l.name}</span>
                  <Check
                    className={cn(
                      "size-4",
                      selectedIds.includes(l.id) ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              ))}
              {labels.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  No types yet.
                </p>
              )}
            </div>
            <div className="mt-2 flex gap-1 border-t pt-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New type"
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    create();
                  }
                }}
              />
              <Button size="icon" className="size-8 shrink-0" onClick={create}>
                <Plus className="size-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
