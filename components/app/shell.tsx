"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/app/sidebar";
import { SearchPalette } from "@/components/app/search-palette";
import { NotificationsListener } from "@/components/app/notifications-listener";
import { ShellProvider, useShell, type ShellData } from "@/components/app/shell-context";

export function Shell({
  data,
  children,
}: {
  data: ShellData;
  children: React.ReactNode;
}) {
  return (
    <ShellProvider data={data}>
      <ShellInner>{children}</ShellInner>
    </ShellProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { mobileOpen, setMobileOpen, collapsed } = useShell();
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r transition-[width] duration-200 md:block ${
          collapsed ? "w-14" : "w-[248px]"
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[272px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>

      <SearchPalette />
      <NotificationsListener />
    </div>
  );
}
