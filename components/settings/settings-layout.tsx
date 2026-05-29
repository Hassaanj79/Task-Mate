"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, BarChart3, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/app/topbar";
import { useShell } from "@/components/app/shell-context";
import { canManageMembers } from "@/lib/rbac";
import { toast } from "sonner";

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeSlug, role } = useShell();
  const base = `/${activeSlug}/settings`;

  const items = [
    { id: "general", label: "General", icon: Settings, href: `${base}/general` },
    ...(canManageMembers(role)
      ? [{ id: "members", label: "Members", icon: Users, href: `${base}/members` }]
      : []),
    { id: "labels", label: "Labels", icon: Tag, href: `${base}/labels` },
    { id: "billing", label: "Billing", icon: BarChart3, href: null },
  ];

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Settings"
        icon={<Settings className="size-[19px] text-muted-foreground" />}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav className="hidden w-52 shrink-0 flex-col gap-0.5 border-r bg-muted/40 p-3 sm:flex">
          <span className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Workspace
          </span>
          {items.map((it) => {
            const active = it.href ? pathname.startsWith(it.href) : false;
            const Icon = it.icon;
            const cls = cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13.5px] font-medium transition",
              active
                ? "bg-accent font-semibold text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            );
            if (!it.href) {
              return (
                <button
                  key={it.id}
                  onClick={() => toast(`${it.label} — coming soon`)}
                  className={cls}
                >
                  <Icon className="size-[17px]" />
                  {it.label}
                </button>
              );
            }
            return (
              <Link key={it.id} href={it.href} className={cls}>
                <Icon
                  className={cn(
                    "size-[17px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
