"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "@/lib/queries";
import type { OrgRole, Profile } from "@/lib/database.types";

type ProjectContextValue = {
  orgId: string;
  orgSlug: string;
  projectId: string;
  projectName: string;
  role: OrgRole;
  members: Profile[];
  currentUserId: string;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  // Bumped when the header "New task" button / `c` shortcut fires; views
  // watch it to open their own task-creation affordance.
  addTick: number;
  requestAdd: () => void;
};

const Ctx = createContext<ProjectContextValue | null>(null);

export function useProject() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProject must be used within ProjectProvider");
  return v;
}

export function ProjectProvider({
  orgId,
  orgSlug,
  projectId,
  projectName,
  role,
  members,
  currentUserId,
  children,
}: {
  orgId: string;
  orgSlug: string;
  projectId: string;
  projectName: string;
  role: OrgRole;
  members: Profile[];
  currentUserId: string;
  children: React.ReactNode;
}) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [addTick, setAddTick] = useState(0);
  const queryClient = useQueryClient();

  // Realtime: any change to this project's tasks/statuses refreshes the board/list.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.tasks(projectId) });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_statuses", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: qk.statuses(projectId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return (
    <Ctx.Provider
      value={{
        orgId,
        orgSlug,
        projectId,
        projectName,
        role,
        members,
        currentUserId,
        openTaskId,
        setOpenTaskId,
        addTick,
        requestAdd: () => setAddTick((n) => n + 1),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
