"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { MembershipOrg } from "@/lib/auth";
import type { OrgRole, Profile, Project } from "@/lib/database.types";

export type ShellData = {
  profile: Profile | null;
  currentUserId: string;
  orgs: MembershipOrg[];
  activeSlug: string;
  activeOrg: MembershipOrg;
  projects: Pick<Project, "id" | "name" | "color" | "icon" | "parent_id">[];
  role: OrgRole;
  counts: { myTasks: number; inbox: number };
};

type ShellContextValue = ShellData & {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const Ctx = createContext<ShellContextValue | null>(null);

export function useShell() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShell must be used within ShellProvider");
  return v;
}

export function ShellProvider({
  data,
  children,
}: {
  data: ShellData;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("tm-sidebar-collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("tm-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <Ctx.Provider
      value={{
        ...data,
        mobileOpen,
        setMobileOpen,
        searchOpen,
        setSearchOpen,
        collapsed,
        toggleCollapsed,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
