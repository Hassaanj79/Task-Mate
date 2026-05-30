"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, LayoutGrid, List, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/project/project-context";
import { ProjectIcon } from "@/components/project/project-icon";
import { ProjectDialog } from "@/components/project/project-dialog";
import { canWrite } from "@/lib/rbac";
import { useEffect, useState } from "react";

export function ProjectHeader({
  projectId,
  projectName,
  projectColor,
  projectIcon,
  orgSlug,
}: {
  projectId: string;
  projectName: string;
  projectColor: string | null;
  projectIcon: string | null;
  orgSlug: string;
}) {
  const pathname = usePathname();
  const { role, orgId, requestAdd } = useProject();
  const base = `/${orgSlug}/projects/${projectId}`;
  const writable = canWrite(role);
  const [editOpen, setEditOpen] = useState(false);

  // Keyboard "c" to create a task (ignored while typing in a field).
  useEffect(() => {
    if (!writable) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing =
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable;
      if (e.key === "c" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        requestAdd();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [writable, requestAdd]);

  const tab = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-1.5 border-b-2 px-1 pb-2 pt-1 text-sm font-medium transition-colors",
          active
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className="shrink-0 border-b px-6 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => writable && setEditOpen(true)}
          disabled={!writable}
          title={writable ? "Rename / edit project" : undefined}
          className="group flex min-w-0 items-center gap-2.5 text-lg font-semibold tracking-tight disabled:cursor-default"
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in oklch, ${projectColor ?? "var(--primary)"} 15%, var(--card))`,
              color: projectColor ?? undefined,
            }}
          >
            <ProjectIcon icon={projectIcon} className="size-[18px]" />
          </span>
          <span className="truncate">{projectName}</span>
          {writable && (
            <Pencil className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
          )}
        </button>
        {writable && (
          <Button size="sm" onClick={requestAdd}>
            <Plus className="size-4" />
            New task
          </Button>
        )}
      </div>

      {editOpen && (
        <ProjectDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          orgId={orgId}
          orgSlug={orgSlug}
          project={{
            id: projectId,
            name: projectName,
            color: projectColor,
            icon: projectIcon,
          }}
        />
      )}
      <div className="mt-3 flex items-center gap-4">
        {tab(`${base}/board`, "Board", <LayoutGrid className="size-4" />)}
        {tab(`${base}/list`, "List", <List className="size-4" />)}
      </div>
    </div>
  );
}
