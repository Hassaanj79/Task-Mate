"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, Loader2, Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createOrg } from "@/lib/actions/orgs";
import { orgInitials, orgColor } from "@/lib/format";
import { toast } from "sonner";
import type { MembershipOrg } from "@/lib/auth";

export function OrgSwitcher({
  orgs,
  activeSlug,
}: {
  orgs: MembershipOrg[];
  activeSlug: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const active = orgs.find((o) => o.slug === activeSlug) ?? orgs[0];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left transition hover:bg-accent/60">
            <span
              className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold text-white"
              style={{ backgroundColor: orgColor(active?.id ?? "") }}
            >
              {orgInitials(active?.name ?? "?")}
            </span>
            <span className="flex min-w-0 grow flex-col">
              <span className="truncate text-[13.5px] font-semibold">
                {active?.name ?? "Workspace"}
              </span>
              <span className="text-[11px] capitalize text-muted-foreground">
                {active?.role} · Free plan
              </span>
            </span>
            <ChevronsUpDown className="size-[15px] shrink-0 text-muted-foreground/70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          {orgs.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => o.slug !== activeSlug && router.push(`/${o.slug}`)}
            >
              <span
                className="flex size-[22px] items-center justify-center rounded-md text-[10.5px] font-bold text-white"
                style={{ backgroundColor: orgColor(o.id) }}
              >
                {orgInitials(o.name)}
              </span>
              <span className="grow truncate">{o.name}</span>
              <Check
                className={cn(
                  "size-4",
                  o.slug === activeSlug ? "opacity-100" : "opacity-0",
                )}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New workspace
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/${activeSlug}/settings/general`)}
          >
            <Settings className="size-4" /> Workspace settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>
            Workspaces keep each team&apos;s projects and data fully separate.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              const res = await createOrg(fd);
              if (res?.error) toast.error(res.error);
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">Workspace name</Label>
            <Input id="org-name" name="name" placeholder="Acme Inc." required autoFocus />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
