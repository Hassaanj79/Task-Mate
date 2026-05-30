"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProject, updateProject } from "@/lib/actions/projects";
import { PROJECT_COLORS, PROJECT_ICONS } from "@/lib/constants";
import { PROJECT_TEMPLATES } from "@/lib/templates";
import { ProjectIcon } from "@/components/project/project-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Project } from "@/lib/database.types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  orgSlug: string;
  project?: Pick<Project, "id" | "name" | "color" | "icon"> & {
    description?: string | null;
  };
  parentId?: string;
  parentName?: string;
};

export function ProjectDialog({
  open,
  onOpenChange,
  orgId,
  orgSlug,
  project,
  parentId,
  parentName,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editing = Boolean(project);
  const isSub = Boolean(parentId) && !editing;

  const [name, setName] = useState(project?.name ?? "");
  const [icon, setIcon] = useState(project?.icon ?? PROJECT_ICONS[0]);
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [description, setDescription] = useState(project?.description ?? "");
  const [template, setTemplate] = useState("blank");
  const [visibility, setVisibility] = useState<"workspace" | "private">("workspace");

  function pickTemplate(id: string) {
    setTemplate(id);
    const t = PROJECT_TEMPLATES.find((x) => x.id === id);
    if (t) {
      setIcon(t.icon);
      setColor(t.color);
    }
  }

  function submit() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("icon", icon);
    fd.set("color", color);
    fd.set("description", description);
    fd.set("template", template);
    fd.set("visibility", visibility);
    if (parentId) fd.set("parent_id", parentId);
    start(async () => {
      const res = editing
        ? await updateProject(project!.id, orgSlug, fd)
        : await createProject(orgId, orgSlug, fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      onOpenChange(false);
      toast.success(editing ? "Project updated" : "Project created");
      if (!editing && "projectId" in res && res.projectId) {
        router.push(`/${orgSlug}/projects/${res.projectId}/board`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[480px]"
      >
        <div className="flex flex-col gap-[18px] p-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <DialogTitle className="text-[17px] font-bold">
                {editing ? "Edit project" : isSub ? "New sub-project" : "New project"}
              </DialogTitle>
              {isSub && parentName && (
                <span className="text-[12px] text-muted-foreground">
                  inside {parentName}
                </span>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground transition hover:text-foreground"
            >
              <X className="size-[19px]" />
            </button>
          </div>

          {/* Template picker (only when creating) */}
          {!editing && (
            <div className="flex flex-col gap-2">
              <span className="text-[12.5px] font-semibold text-secondary-foreground">
                Start from a template
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTemplate(t.id)}
                    className={cn(
                      "flex items-start gap-2 rounded-[10px] border p-2.5 text-left transition",
                      template === t.id
                        ? "border-primary bg-accent"
                        : "border-border hover:border-foreground/20",
                    )}
                  >
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${t.color} 15%, var(--card))`,
                        color: t.color,
                      }}
                    >
                      <ProjectIcon icon={t.icon} className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[12.5px] font-semibold leading-tight">
                        {t.name}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                        {t.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Icon preview + name */}
          <div className="flex items-center gap-3">
            <span
              className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px]"
              style={{
                backgroundColor: `color-mix(in oklch, ${color} 15%, var(--card))`,
                color,
              }}
            >
              <ProjectIcon icon={icon} className="size-[26px]" />
            </span>
            <div className="flex grow flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-secondary-foreground">
                Project name
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
            </div>
          </div>

          {/* Icon picker */}
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold text-secondary-foreground">
              Icon
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-[9px] border transition",
                    icon === ic
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-transparent bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ProjectIcon icon={ic} className="size-[18px]" />
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold text-secondary-foreground">
              Color
            </span>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-[30px] rounded-full ring-offset-2 ring-offset-background transition",
                    color === c && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Description (optional) */}
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold text-secondary-foreground">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={2}
            />
          </div>

          {/* Access (create only) */}
          {!editing && (
            <div className="flex flex-col gap-2">
              <span className="text-[12.5px] font-semibold text-secondary-foreground">
                Access
              </span>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as "workspace" | "private")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Everyone in the workspace</SelectItem>
                  <SelectItem value="private">Only people I add</SelectItem>
                </SelectContent>
              </Select>
              {visibility === "private" && (
                <span className="text-[11px] text-muted-foreground">
                  You can add members after creating it (project menu → Manage access).
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-1 flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim()}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {editing ? "Save changes" : "Create project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
