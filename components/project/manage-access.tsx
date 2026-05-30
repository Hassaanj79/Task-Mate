"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import {
  setProjectVisibility,
  addProjectMember,
  removeProjectMember,
} from "@/lib/actions/projects";
import { initials, displayName } from "@/lib/format";
import { toast } from "sonner";
import type { Profile } from "@/lib/database.types";

export function ManageAccess({
  open,
  onOpenChange,
  orgId,
  orgSlug,
  projectId,
  projectName,
  creatorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  orgSlug: string;
  projectId: string;
  projectName: string;
  creatorId: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<"workspace" | "private">("workspace");
  const [members, setMembers] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const [{ data: proj }, { data: memberRows }, { data: pm }] = await Promise.all([
        supabase.from("projects").select("visibility").eq("id", projectId).maybeSingle(),
        supabase.from("organization_members").select("profiles(*)").eq("org_id", orgId),
        supabase.from("project_members").select("user_id").eq("project_id", projectId),
      ]);
      if (!active) return;
      setVisibility((proj?.visibility as "workspace" | "private") ?? "workspace");
      setMembers((memberRows ?? []).map((r) => r.profiles as unknown as Profile).filter(Boolean));
      setSelected(new Set((pm ?? []).map((r) => r.user_id)));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, orgId, projectId]);

  function changeVisibility(v: "workspace" | "private") {
    setVisibility(v);
    start(async () => {
      const res = await setProjectVisibility(projectId, orgId, orgSlug, v);
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function toggle(userId: string) {
    const has = selected.has(userId);
    const next = new Set(selected);
    if (has) next.delete(userId);
    else next.add(userId);
    setSelected(next);
    start(async () => {
      const res = has
        ? await removeProjectMember(projectId, orgSlug, userId)
        : await addProjectMember(projectId, orgId, orgSlug, userId);
      if (res?.error) {
        toast.error(res.error);
        setSelected(selected); // revert
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Project access</DialogTitle>
          <DialogDescription className="truncate">{projectName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <span className="text-[12.5px] font-semibold text-secondary-foreground">
            Who can access
          </span>
          <Select value={visibility} onValueChange={(v) => changeVisibility(v as "workspace" | "private")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace">Everyone in the workspace</SelectItem>
              <SelectItem value="private">Only people I add</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {visibility === "private" && (
          <div className="space-y-2">
            <span className="text-[12.5px] font-semibold text-secondary-foreground">
              People with access
            </span>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                <div className="space-y-0.5">
                  {members.map((m) => {
                    const on = selected.has(m.id);
                    const isCreator = m.id === creatorId;
                    return (
                      <button
                        key={m.id}
                        disabled={isCreator}
                        onClick={() => toggle(m.id)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-accent disabled:opacity-60"
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={m.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {initials(m.full_name, m.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {displayName(m)} {isCreator && <span className="text-muted-foreground">(owner)</span>}
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            {m.email}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-md border",
                            on || isCreator ? "border-primary bg-primary text-primary-foreground" : "border-input",
                          )}
                        >
                          {(on || isCreator) && <Check className="size-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
