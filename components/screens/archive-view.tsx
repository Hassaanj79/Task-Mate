"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/app/topbar";
import { ProjectIcon } from "@/components/project/project-icon";
import { restoreTask, deleteTask } from "@/lib/actions/tasks";
import { setProjectArchived, deleteProject } from "@/lib/actions/projects";
import { toast } from "sonner";

export type ArchivedItem = {
  id: string;
  kind: "task" | "project";
  title: string;
  subtitle: string;
  archivedAt: string;
  color: string | null;
  icon: string | null;
};

const RETENTION_DAYS = 30;

function daysLeft(archivedAt: string) {
  const ms = new Date(archivedAt).getTime() + RETENTION_DAYS * 86400000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function ArchiveView({
  orgSlug,
  projects,
  tasks,
}: {
  orgSlug: string;
  projects: ArchivedItem[];
  tasks: ArchivedItem[];
}) {
  const router = useRouter();
  const [, start] = useTransition();

  function restore(item: ArchivedItem) {
    start(async () => {
      const res =
        item.kind === "task"
          ? await restoreTask(item.id)
          : await setProjectArchived(item.id, orgSlug, false);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Restored");
        router.refresh();
      }
    });
  }

  function purge(item: ArchivedItem) {
    start(async () => {
      const res =
        item.kind === "task"
          ? await deleteTask(item.id)
          : await deleteProject(item.id, orgSlug);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Deleted permanently");
        router.refresh();
      }
    });
  }

  const empty = projects.length === 0 && tasks.length === 0;

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Archive"
        icon={<Archive className="size-[19px] text-muted-foreground" />}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-7 py-7">
          <p className="text-[13px] text-muted-foreground">
            Archived items are kept for {RETENTION_DAYS} days, then permanently
            deleted automatically. Restore anything you want to keep.
          </p>

          {empty && (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
              <Archive className="size-10" />
              <p className="font-medium">Archive is empty.</p>
            </div>
          )}

          {projects.length > 0 && (
            <Section title="Projects" count={projects.length}>
              {projects.map((p) => (
                <Row
                  key={p.id}
                  item={p}
                  onRestore={() => restore(p)}
                  onPurge={() => purge(p)}
                />
              ))}
            </Section>
          )}

          {tasks.length > 0 && (
            <Section title="Tasks" count={tasks.length}>
              {tasks.map((t) => (
                <Row
                  key={t.id}
                  item={t}
                  onRestore={() => restore(t)}
                  onPurge={() => purge(t)}
                />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold">{title}</span>
        <span className="rounded-full bg-secondary px-1.5 text-xs font-semibold text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="overflow-hidden rounded-[var(--radius)] border bg-card shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Row({
  item,
  onRestore,
  onPurge,
}: {
  item: ArchivedItem;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const left = daysLeft(item.archivedAt);
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      {item.kind === "project" ? (
        <span
          className="flex size-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in oklch, ${item.color ?? "var(--primary)"} 14%, var(--card))`,
            color: item.color ?? undefined,
          }}
        >
          <ProjectIcon icon={item.icon} className="size-4" />
        </span>
      ) : (
        <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Archive className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{item.title}</p>
        <p className="truncate text-[12px] text-muted-foreground">
          {item.subtitle}
        </p>
      </div>
      <span
        className={`text-[12px] font-medium ${left <= 5 ? "text-destructive" : "text-muted-foreground"}`}
      >
        {left} day{left === 1 ? "" : "s"} left
      </span>
      <Button variant="ghost" size="sm" onClick={onRestore}>
        <RotateCcw className="size-3.5" /> Restore
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={onPurge}
        title="Delete permanently"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
