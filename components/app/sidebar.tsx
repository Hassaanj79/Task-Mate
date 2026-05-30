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
  PanelLeftClose,
  PanelLeft,
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

export function SidebarContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const {
    orgs,
    activeSlug,
    activeOrg,
    projects,
    role,
    counts,
    setSearchOpen,
    currentUserId,
    toggleCollapsed,
  } = useShell();
  const base = `/${activeSlug}`;
  const c = collapsed;
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SidebarProject | null>(null);
  const [subParent, setSubParent] = useState<SidebarProject | null>(null);
  const [accessOf, setAccessOf] = useState<SidebarProject | null>(null);
  const manageAccess = canManageMembers(role);
  const writable = canWrite(role);

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
      {/* Top: org switcher + collapse toggle */}
      <div className={cn("flex gap-1 pt-2.5", c ? "flex-col items-center px-1.5" : "items-center px-2.5")}>
        <div className={c ? "" : "min-w-0 grow"}>
          <OrgSwitcher orgs={orgs} activeSlug={activeSlug} collapsed={c} />
        </div>
        <button
          onClick={toggleCollapsed}
          title={c ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground md:flex"
        >
          {c ? <PanelLeft className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>
      </div>

      {/* Search */}
      <div className={cn("pb-2 pt-1.5", c ? "px-1.5" : "px-3")}>
        {c ? (
          <button
            onClick={() => setSearchOpen(true)}
            title="Search (⌘K)"
            className="flex w-full items-center justify-center rounded-md border bg-card py-1.5 text-muted-foreground shadow-sm transition hover:text-foreground"
          >
            <Search className="size-[16px]" />
          </button>
        ) : (
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
        )}
      </div>

      {/* Primary nav */}
      <nav className={cn("flex flex-col gap-px", c ? "px-1.5" : "px-3")}>
        <NavItem href={base} icon={<Home className="size-[17px]" />} label="Home" active={pathname === base} onNavigate={onNavigate} collapsed={c} />
        <NavItem href={`${base}/my-tasks`} icon={<CheckSquare className="size-[17px]" />} label="My Tasks" count={counts.myTasks} active={pathname === `${base}/my-tasks`} onNavigate={onNavigate} collapsed={c} />
        <NavItem href={`${base}/inbox`} icon={<Inbox className="size-[17px]" />} label="Inbox" count={counts.inbox} active={pathname === `${base}/inbox`} onNavigate={onNavigate} collapsed={c} />
      </nav>

      {/* Projects */}
      <div className={cn("flex items-center justify-between pb-1.5 pt-4", c ? "px-2" : "px-[18px]")}>
        {!c && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Projects
          </span>
        )}
        {writable && (
          <button
            onClick={() => setCreateOpen(true)}
            title="New project"
            className={cn(
              "flex size-5 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
              c && "mx-auto",
            )}
          >
            <Plus className="size-[15px]" />
          </button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav className={cn("flex flex-col gap-px pb-2", c ? "px-1.5" : "px-3")}>
          {projects.length === 0 && !c && (
            <p className="px-2 py-1 text-[13px] text-muted-foreground">No projects yet.</p>
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
              collapsed={c}
              onNavigate={onNavigate}
              onEdit={setEditing}
              onAddSub={setSubParent}
              onAccess={setAccessOf}
            />
          ))}
          <NavItem href={`${base}/archive`} icon={<Archive className="size-[17px]" />} label="Archived" active={pathname === `${base}/archive`} onNavigate={onNavigate} collapsed={c} />
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className={cn("flex flex-col gap-px border-t py-3", c ? "px-1.5" : "px-3")}>
        <NavItem href={`${base}/settings/general`} icon={<Settings className="size-[17px]" />} label="Settings" active={pathname.startsWith(`${base}/settings`)} onNavigate={onNavigate} collapsed={c} />
        {!c && (
          <button
            onClick={() => toast("Help center", { icon: <HelpCircle className="size-4" /> })}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13.5px] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
          >
            <HelpCircle className="size-[17px] text-muted-foreground" />
            Help &amp; feedback
          </button>
        )}
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
  collapsed,
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
  collapsed?: boolean;
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

  if (collapsed) {
    // Icon-only rail: render this project and any children flat.
    return (
      <>
        <Link
          href={href}
          onClick={onNavigate}
          title={project.name}
          className={cn(
            "flex items-center justify-center rounded-md py-2 transition",
            active ? "bg-accent" : "hover:bg-accent/60",
          )}
        >
          <ProjectIcon
            icon={project.icon}
            className="size-4"
            style={{ color: project.color ?? undefined }}
          />
        </Link>
        {kids.map((child) => (
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
            collapsed
            onNavigate={onNavigate}
            onEdit={onEdit}
            onAddSub={onAddSub}
            onAccess={onAccess}
          />
        ))}
      </>
    );
  }

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
        "group relative flex min-w-0 items-center rounded-md transition",
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
        className="flex min-w-0 flex-1 items-start gap-2.5 py-[7px] pr-1 text-[13.5px]"
      >
        <ProjectIcon
          icon={project.icon}
          className="mt-0.5 size-4 shrink-0"
          style={{ color: project.color ?? undefined }}
        />
        <span className="min-w-0 break-words">{project.name}</span>
      </Link>
      {writable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mr-1 mt-1 flex size-6 shrink-0 items-center justify-center self-start rounded text-muted-foreground/60 transition hover:bg-background/60 hover:text-foreground group-hover:text-muted-foreground data-[state=open]:text-foreground">
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
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        title={label}
        className={cn(
          "relative flex items-center justify-center rounded-md py-2 transition",
          active
            ? "bg-accent text-primary"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        {icon}
        {count != null && count > 0 && (
          <span className="absolute right-1.5 top-1.5 size-[7px] rounded-full bg-primary ring-2 ring-sidebar" />
        )}
      </Link>
    );
  }
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
