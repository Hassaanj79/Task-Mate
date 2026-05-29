"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProject } from "@/components/project/project-context";
import { ProjectIcon } from "@/components/project/project-icon";
import { canWrite } from "@/lib/rbac";
import { useEffect } from "react";

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
  const { role, requestAdd } = useProject();
  const base = `/${orgSlug}/projects/${projectId}`;
  const writable = canWrite(role);

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
        <h1 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span
            className="flex size-7 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in oklch, ${projectColor ?? "var(--primary)"} 15%, var(--card))`,
              color: projectColor ?? undefined,
            }}
          >
            <ProjectIcon icon={projectIcon} className="size-[18px]" />
          </span>
          {projectName}
        </h1>
        {writable && (
          <Button size="sm" onClick={requestAdd}>
            <Plus className="size-4" />
            New task
          </Button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-4">
        {tab(`${base}/board`, "Board", <LayoutGrid className="size-4" />)}
        {tab(`${base}/list`, "List", <List className="size-4" />)}
      </div>
    </div>
  );
}
