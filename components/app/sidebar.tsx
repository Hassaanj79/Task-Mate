"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CheckSquare,
  Inbox,
  Search,
  Plus,
  Archive,
  Settings,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { OrgSwitcher } from "@/components/org/org-switcher";
import { ProjectIcon } from "@/components/project/project-icon";
import { ProjectDialog } from "@/components/project/project-dialog";
import { ManageAccess } from "@/components/project/manage-access";
import { useShell } from "@/components/app/shell-context";
import { setProjectArchived, deleteProject } from "@/lib/actions/projects";
import { canManageMembers, canWrite } from "@/lib/rbac";
import { toast } from "sonner";
import type { Project } from "@/lib/database.types";

type SidebarProject = Pick<
  Project,
  "id" | "name" | "color" | "icon" | "parent_id"
>;

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { orgs, activeSlug, activeOrg, projects, role, counts, setSearchOpen, currentUserId } =
    useShell();
  const base = `/${activeSlug}`;
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SidebarProject | null>(null);
  const [subParent, setSubParent] = useState<SidebarProject | null>(null);
  const [accessOf, setAccessOf] = useState<SidebarProject | null>(null);
  const manageAccess = canManageMembers(role);
  const writable = canWrite(role);

  // Group projects into a parent → children tree.
  const childrenOf = new Map<string | null, SidebarProject[]>();
  for (const p of projects) {
    const key = p.parent_id ?? null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(p);
    childrenOf.set(key, arr);
  }
  const roots = childrenOf.get(null) ?? [];

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-2.5 pb-1.5 pt-2.5">
        <OrgSwitcher orgs={orgs} activeSlug={activeSlug} />
      </div>

      {/* Search */}
      <div className="px-3 pb-2 pt-0.5">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-sm transition hover:text-foreground"
        >
          <Search className="size-[15px]" />
          <span className="grow text-left">Search…</span>
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70">
            <kbd className="rounded border bg-secondary px-1">⌘</kbd>
            <kbd className="rounded border bg-secondary px-1">K</kbd>
          </span>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-px px-3">
        <NavItem href={base} icon={<Home className="size-[17px]" />} label="Home" active={pathname === base} onNavigate={onNavigate} />
        <NavItem
          href={`${base}/my-tasks`}
          icon={<CheckSquare className="size-[17px]" />}
          label="My Tasks"
          count={counts.myTasks}
          active={pathname === `${base}/my-tasks`}
          onNavigate={onNavigate}
        />
        <NavItem
          href={`${base}/inbox`}
          icon={<Inbox className="size-[17px]" />}
          label="Inbox"
          count={counts.inbox}
          active={pathname === `${base}/inbox`}
          onNavigate={onNavigate}
        />
      </nav>

      {/* Projects */}
      <div className="flex items-center justify-between px-[18px] pb-1.5 pt-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Projects
        </span>
        {writable && (
          <button
            onClick={() => setCreateOpen(true)}
            title="New project"
            className="flex size-5 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="size-[15px]" />
          </button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-px px-3 pb-2">
          {projects.length === 0 && (
            <p className="px-2 py-1 text-[13px] text-muted-foreground">
              No projects yet.
            </p>
          )}
          {roots.map((p) => (
            <SidebarProjectItem
              key={p.id}
              project={p}
              depth={0}
              childrenOf={childrenOf}
              base={base}
              orgSlug={activeSlug}
              pathname={pathname}
              writable={writable}
              manageAccess={manageAccess}
              onNavigate={onNavigate}
              onEdit={setEditing}
              onAddSub={setSubParent}
              onAccess={setAccessOf}
            />
          ))}
          <NavItem
            href={`${base}/archive`}
            icon={<Archive className="size-[17px]" />}
            label="Archived"
            active={pathname === `${base}/archive`}
            onNavigate={onNavigate}
          />
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="flex flex-col gap-px border-t px-3 py-3">
        {canManageMembers(role) || true ? (
          <NavItem
            href={`${base}/settings/general`}
            icon={<Settings className="size-[17px]" />}
            label="Settings"
            active={pathname.startsWith(`${base}/settings`)}
            onNavigate={onNavigate}
          />
        ) : null}
        <button
          onClick={() => toast("Help center", { icon: <HelpCircle className="size-4" /> })}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13.5px] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
        >
          <HelpCircle className="size-[17px] text-muted-foreground" />
          Help &amp; feedback
        </button>
      </div>

      <ProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={activeOrg.id}
        orgSlug={activeSlug}
      />
      {editing && (
        <ProjectDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          orgId={activeOrg.id}
          orgSlug={activeSlug}
          project={editing}
        />
      )}
      {subParent && (
        <ProjectDialog
          open={!!subParent}
          onOpenChange={(v) => !v && setSubParent(null)}
          orgId={activeOrg.id}
          orgSlug={activeSlug}
          parentId={subParent.id}
          parentName={subParent.name}
        />
      )}
      {accessOf && (
        <ManageAccess
          open={!!accessOf}
          onOpenChange={(v) => !v && setAccessOf(null)}
          orgId={activeOrg.id}
          orgSlug={activeSlug}
          projectId={accessOf.id}
          projectName={accessOf.name}
          creatorId={currentUserId}
        />
      )}
    </div>
  );
}

function SidebarProjectItem({
  project,
  depth,
  childrenOf,
  base,
  orgSlug,
  pathname,
  writable,
  manageAccess,
  onNavigate,
  onEdit,
  onAddSub,
  onAccess,
}: {
  project: SidebarProject;
  depth: number;
  childrenOf: Map<string | null, SidebarProject[]>;
  base: string;
  orgSlug: string;
  pathname: string;
  writable: boolean;
  manageAccess: boolean;
  onNavigate?: () => void;
  onEdit: (p: SidebarProject) => void;
  onAddSub: (p: SidebarProject) => void;
  onAccess: (p: SidebarProject) => void;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const href = `${base}/projects/${project.id}/board`;
  const active = pathname.startsWith(`${base}/projects/${project.id}`);
  const kids = childrenOf.get(project.id) ?? [];

  function archive() {
    start(async () => {
      const res = await setProjectArchived(project.id, orgSlug, true);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Project archived");
        if (pathname.startsWith(`${base}/projects/${project.id}`)) router.push(base);
        else router.refresh();
      }
    });
  }

  function remove() {
    setConfirmDelete(false);
    start(async () => {
      const res = await deleteProject(project.id, orgSlug);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Project deleted");
        if (pathname.startsWith(`${base}/projects/${project.id}`)) router.push(base);
        else router.refresh();
      }
    });
  }

  return (
    <>
    <div
      className={cn(
        "group relative flex items-center rounded-md transition",
        active
          ? "bg-accent font-semibold text-foreground"
          : "font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
      style={{ marginLeft: depth * 12 }}
    >
      {active && (
        <span className="absolute -left-[9px] top-2 bottom-2 w-[3px] rounded-sm bg-primary" />
      )}
      {kids.length > 0 ? (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <Link
        href={href}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-[7px] pr-2 text-[13.5px]"
      >
        <ProjectIcon
          icon={project.icon}
          className="size-4 shrink-0"
          style={{ color: project.color ?? undefined }}
        />
        <span className="truncate">{project.name}</span>
      </Link>
      {writable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mr-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background/60 hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onAddSub(project)}
              className="whitespace-nowrap"
            >
              <FolderPlus className="size-4 shrink-0" /> Sub-project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            {manageAccess && (
              <DropdownMenuItem onClick={() => onAccess(project)}>
                <Lock className="size-4" /> Manage access
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={archive}>
              <Archive className="size-4" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the project and all of its tasks,
              comments, and attachments. To keep it recoverable for 30 days,
              archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    {expanded &&
      kids.map((child) => (
        <SidebarProjectItem
          key={child.id}
          project={child}
          depth={depth + 1}
          childrenOf={childrenOf}
          base={base}
          orgSlug={orgSlug}
          pathname={pathname}
          writable={writable}
          manageAccess={manageAccess}
          onNavigate={onNavigate}
          onEdit={onEdit}
          onAddSub={onAddSub}
          onAccess={onAccess}
        />
      ))}
    </>
  );
}

function NavItem({
  href,
  icon,
  label,
  count,
  active,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] transition",
        active
          ? "bg-accent font-semibold text-foreground"
          : "font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute -left-[9px] top-2 bottom-2 w-[3px] rounded-sm bg-primary" />
      )}
      <span className={cn(active ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="grow truncate">{label}</span>
      {count != null && count > 0 && (
        <span className="rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-muted-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
