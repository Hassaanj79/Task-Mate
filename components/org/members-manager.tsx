"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, MoreHorizontal, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  inviteMember,
  revokeInvite,
  changeMemberRole,
  removeMember,
} from "@/lib/actions/members";
import { ASSIGNABLE_ROLES, ROLE_LABEL } from "@/lib/rbac";
import { initials, displayName } from "@/lib/format";
import { toast } from "sonner";
import type { Invitation, OrgRole, Profile } from "@/lib/database.types";

type Member = {
  id: string;
  role: OrgRole;
  user_id: string;
  profile: Profile;
};

export function MembersManager({
  orgId,
  orgSlug,
  currentUserId,
  currentRole,
  members,
  invites,
}: {
  orgId: string;
  orgSlug: string;
  currentUserId: string;
  currentRole: OrgRole;
  members: Member[];
  invites: Invitation[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const isOwner = currentRole === "owner";

  function run(fn: () => Promise<{ error: string | null }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this workspace.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" /> Invite
        </Button>
      </div>

      {/* Members list */}
      <div className="divide-y rounded-lg border">
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId;
          const canEditRole = !isSelf && m.role !== "owner";
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="size-9">
                <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {initials(m.profile?.full_name, m.profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {displayName(m.profile)}
                  </span>
                  {isSelf && <Badge variant="outline">You</Badge>}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {m.profile?.email}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {ROLE_LABEL[m.role]}
              </Badge>
              {(canEditRole || (!isSelf && isOwner)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change role</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={m.role}
                      onValueChange={(v) =>
                        run(
                          () => changeMemberRole(m.id, orgSlug, v as OrgRole),
                          "Role updated",
                        )
                      }
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <DropdownMenuRadioItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        run(() => removeMember(m.id, orgSlug), "Member removed")
                      }
                    >
                      Remove from workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Pending invitations
          </h2>
          <div className="divide-y rounded-lg border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{inv.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Invited as {ROLE_LABEL[inv.role]}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyInviteLink(inv.token)}
                >
                  <Copy className="size-4" /> Copy link
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    run(() => revokeInvite(inv.id, orgSlug), "Invitation revoked")
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        orgId={orgId}
        orgSlug={orgSlug}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  orgId,
  orgSlug,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState<OrgRole>("member");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&apos;ll join this workspace with the role you choose. Share the
            invite link after creating it.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              fd.set("role", role);
              const res = await inviteMember(orgId, orgSlug, fd);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              onOpenChange(false);
              toast.success("Invitation created");
              router.refresh();
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="teammate@company.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Create invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
