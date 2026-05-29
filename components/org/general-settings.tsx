"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateOrg, deleteOrg } from "@/lib/actions/orgs";
import { canConfigureOrg, canDeleteOrg } from "@/lib/rbac";
import { toast } from "sonner";
import type { OrgRole } from "@/lib/database.types";

export function GeneralSettings({
  orgId,
  orgSlug,
  name,
  slug,
  role,
}: {
  orgId: string;
  orgSlug: string;
  name: string;
  slug: string;
  role: OrgRole;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const editable = canConfigureOrg(role);
  const deletable = canDeleteOrg(role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>The display name for this workspace.</CardDescription>
        </CardHeader>
        <form
          action={(fd) =>
            start(async () => {
              const res = await updateOrg(orgId, orgSlug, fd);
              if (res?.error) toast.error(res.error);
              else {
                toast.success("Saved");
                router.refresh();
              }
            })
          }
        >
          <CardContent className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={name}
              disabled={!editable}
              required
            />
            <p className="text-xs text-muted-foreground">Workspace URL: /{slug}</p>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!editable || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {deletable && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete this workspace and everything in it. This cannot
              be undone.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete workspace</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes all projects, tasks, comments, and members. Type{" "}
                    <span className="font-semibold">{name}</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={name}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== name || pending}
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={(e) => {
                      e.preventDefault();
                      start(async () => {
                        const res = await deleteOrg(orgId);
                        if (res?.error) toast.error(res.error);
                      });
                    }}
                  >
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
