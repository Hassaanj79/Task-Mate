"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { useShell } from "@/components/app/shell-context";

export function Topbar({
  title,
  icon,
  right,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { profile, setMobileOpen } = useShell();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 md:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        {icon}
        {title && (
          <h1 className="truncate text-[15.5px] font-bold tracking-tight">
            {title}
          </h1>
        )}
        {children}
      </div>
      <div className="flex items-center gap-1">
        {right}
        <ThemeToggle />
        <NotificationsBell />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
