"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle2,
  CheckSquare,
  Clock,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ProjectDialog } from "@/components/project/project-dialog";
import { ProjectIcon } from "@/components/project/project-icon";
import { AvatarStack } from "@/components/task/task-bits";
import { setProjectArchived, deleteProject } from "@/lib/actions/projects";
import { canWrite } from "@/lib/rbac";
import { toast } from "sonner";
import type { OrgRole, Profile, Project } from "@/lib/database.types";

type ProjectWithStats = Project & {
  taskCount: number;
  doneCount: number;
  pct: number;
  assignees: Profile[];
};

type Stats = {
  assignedToMe: number;
  dueSoon: number;
  completed: number;
  projectCount: number;
};

export function ProjectGrid({
  orgId,
  orgSlug,
  role,
  userName,
  stats,
  projects,
}: {
  orgId: string;
  orgSlug: string;
  role: OrgRole;
  userName: string;
  stats: Stats;
  projects: ProjectWithStats[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithStats | null>(null);
  const [deleting, setDeleting] = useState<ProjectWithStats | null>(null);
  const writable = canWrite(role);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function archiveToggle(p: ProjectWithStats) {
    start(async () => {
      const res = await setProjectArchived(p.id, orgSlug, !p.archived);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(p.archived ? "Project restored" : "Project archived");
        router.refresh();
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const p = deleting;
    setDeleting(null);
    start(async () => {
      const res = await deleteProject(p.id, orgSlug);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Project deleted");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{today}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {greeting}, {userName} <span className="align-middle">👋</span>
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<CheckSquare className="size-[18px]" />}
          tint="var(--primary)"
          value={stats.assignedToMe}
          label="Assigned to me"
        />
        <StatCard
          icon={<Clock className="size-[18px]" />}
          tint="oklch(0.7 0.13 70)"
          value={stats.dueSoon}
          label="Due this week"
        />
        <StatCard
          icon={<TrendingUp className="size-[18px]" />}
          tint="oklch(0.64 0.13 155)"
          value={stats.completed}
          label="Completed"
        />
        <StatCard
          icon={<FolderKanban className="size-[18px]" />}
          tint="oklch(0.6 0.14 300)"
          value={stats.projectCount}
          label="Active projects"
        />
      </div>

      {/* Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            Projects{" "}
            <span className="font-semibold text-muted-foreground">
              {active.length}
            </span>
          </h2>
          {writable && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New project
            </Button>
          )}
        </div>

        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <FolderKanban className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Create a project to start adding tasks.
              </p>
            </div>
            {writable && (
              <Button onClick={() => setCreateOpen(true)} variant="outline">
                <Plus className="size-4" /> New project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                orgSlug={orgSlug}
                writable={writable}
                onEdit={() => setEditing(p)}
                onArchive={() => archiveToggle(p)}
                onDelete={() => setDeleting(p)}
              />
            ))}
            {writable && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition hover:border-primary hover:bg-accent hover:text-accent-foreground"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <Plus className="size-5" />
                </span>
                <span className="text-sm font-semibold">New project</span>
              </button>
            )}
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Archived</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                orgSlug={orgSlug}
                writable={writable}
                onEdit={() => setEditing(p)}
                onArchive={() => archiveToggle(p)}
                onDelete={() => setDeleting(p)}
              />
            ))}
          </div>
        </div>
      )}

      <ProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={orgId}
        orgSlug={orgSlug}
      />
      {editing && (
        <ProjectDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          orgId={orgId}
          orgSlug={orgSlug}
          project={editing}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project and all of its tasks, comments,
              and attachments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon,
  tint,
  value,
  label,
}: {
  icon: React.ReactNode;
  tint: string;
  value: number;
  label: string;
}) {
  return (
    <div className="group rounded-xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <span
          className="flex size-9 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: `color-mix(in oklch, ${tint} 14%, var(--card))`, color: tint }}
        >
          {icon}
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-2xl font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-[13px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function ProjectCard({
  project,
  orgSlug,
  writable,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: ProjectWithStats;
  orgSlug: string;
  writable: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const color = project.color ?? "#6366f1";
  const href = `/${orgSlug}/projects/${project.id}/board`;
  const greenDone = project.pct >= 70;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md">
      <span
        className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <div className="space-y-4 p-[18px]">
        <div className="flex items-start justify-between">
          <Link href={href} className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-[11px]"
              style={{
                backgroundColor: `color-mix(in oklch, ${color} 14%, var(--card))`,
                color,
              }}
            >
              <ProjectIcon icon={project.icon} className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="font-semibold leading-tight">{project.name}</span>
              <span className="text-xs text-muted-foreground">
                {project.taskCount} tasks
              </span>
            </span>
          </Link>
          {writable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 transition group-hover:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  {project.archived ? (
                    <>
                      <ArchiveRestore className="size-4" /> Restore
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" /> Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {project.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        )}

        <Link href={href} className="block space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Progress</span>
            <span style={{ color: greenDone ? "oklch(0.64 0.13 155)" : undefined }}>
              {project.pct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${project.pct}%`,
                backgroundColor: greenDone ? "oklch(0.64 0.13 155)" : color,
              }}
            />
          </div>
        </Link>

        <div className="flex items-center justify-between">
          <AvatarStack profiles={project.assignees} />
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5" style={{ color: "oklch(0.64 0.13 155)" }} />
            {project.doneCount} done
          </span>
        </div>
      </div>
    </div>
  );
}
