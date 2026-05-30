"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CheckSquare,
  Inbox,
  Search,
  Plus,
  Archive,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { ProjectIcon } from "@/components/project/project-icon";
import { ProjectDialog } from "@/components/project/project-dialog";
import { useShell } from "@/components/app/shell-context";
import { canManageMembers, canWrite } from "@/lib/rbac";
import { toast } from "sonner";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { orgs, activeSlug, activeOrg, projects, role, counts, setSearchOpen } =
    useShell();
  const base = `/${activeSlug}`;
  const [createOpen, setCreateOpen] = useState(false);
  const writable = canWrite(role);

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
          {projects.map((p) => {
            const href = `${base}/projects/${p.id}/board`;
            const active = pathname.startsWith(`${base}/projects/${p.id}`);
            return (
              <NavItem
                key={p.id}
                href={href}
                icon={
                  <ProjectIcon
                    icon={p.icon}
                    className="size-4"
                    style={{ color: p.color ?? undefined }}
                  />
                }
                label={p.name}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}
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
    </div>
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
