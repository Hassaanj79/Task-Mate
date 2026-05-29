"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag, MoreHorizontal, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LabelChip } from "@/components/task/task-bits";
import { LABEL_COLORS } from "@/lib/constants";
import {
  createLabelAction,
  updateLabelAction,
  deleteLabelAction,
} from "@/lib/actions/labels";
import { toast } from "sonner";
import type { Label } from "@/lib/database.types";

export type LabelWithUsage = Label & { usage: number };

export function LabelsSettings({
  orgId,
  orgSlug,
  labels,
}: {
  orgId: string;
  orgSlug: string;
  labels: LabelWithUsage[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[1]);

  function refresh() {
    router.refresh();
  }

  function create() {
    if (!newName.trim()) {
      setAdding(false);
      return;
    }
    start(async () => {
      const res = await createLabelAction(orgId, newName, newColor);
      if (res.error) toast.error(res.error);
      else {
        setNewName("");
        setNewColor(LABEL_COLORS[1]);
        setAdding(false);
        toast.success("Label created");
        refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight">Labels</h1>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> New label
        </Button>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Labels categorize tasks across every project in this workspace.{" "}
        {labels.length} labels.
      </p>

      {adding && (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-primary bg-card p-3 shadow-[0_0_0_3px_var(--accent)]">
          <ColorSwatch color={newColor} onChange={setNewColor} size={26} />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name…"
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape") {
                setAdding(false);
                setNewName("");
              }
            }}
            className="flex-1 border-0 bg-transparent text-sm font-semibold outline-none"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdding(false);
              setNewName("");
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={create}>
            Add label
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius)] border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <span className="w-[26px]" />
          <span className="flex-1 max-w-[280px]">Name</span>
          <span className="flex-1">Preview</span>
          <span className="w-24">Usage</span>
          <span className="w-8" />
        </div>
        {labels.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-10 text-muted-foreground">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
              <Tag className="size-5" />
            </span>
            <span className="text-[13px]">No labels yet. Create your first one.</span>
          </div>
        ) : (
          labels.map((l, i) => (
            <LabelRow
              key={l.id}
              label={l}
              last={i === labels.length - 1}
              onSaved={refresh}
            />
          ))
        )}
      </div>
      <span className="sr-only">{orgSlug}</span>
    </div>
  );
}

function LabelRow({
  label,
  last,
  onSaved,
}: {
  label: LabelWithUsage;
  last: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(label.name);
  const [, start] = useTransition();

  function save(patch: { name?: string; color?: string }) {
    start(async () => {
      const res = await updateLabelAction(label.id, patch);
      if (res.error) toast.error(res.error);
      else onSaved();
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteLabelAction(label.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Label deleted");
        onSaved();
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card px-4 py-2.5",
        !last && "border-b",
      )}
    >
      <ColorSwatch color={label.color ?? "#64748b"} onChange={(c) => save({ color: c })} />
      <div className="max-w-[280px] flex-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== label.name) save({ name: name.trim() });
            else setName(label.name);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-[13.5px] font-semibold outline-none transition hover:bg-accent/60 focus:border-input"
        />
      </div>
      <div className="flex-1">
        <LabelChip label={{ ...label, name: name || label.name }} />
      </div>
      <span className="w-24 text-[12.5px] text-muted-foreground">
        {label.usage} {label.usage === 1 ? "task" : "tasks"}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={remove}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Delete label
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ColorSwatch({
  color,
  onChange,
  size = 22,
}: {
  color: string;
  onChange: (c: string) => void;
  size?: number;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 rounded-[7px] ring-1 ring-black/10"
          style={{ width: size, height: size, backgroundColor: color }}
          title="Change color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start">
        <div className="grid grid-cols-4 gap-2">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={cn(
                "flex size-[30px] items-center justify-center rounded-lg ring-1 ring-black/10",
                c === color && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: c }}
            >
              {c === color && <Check className="size-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
