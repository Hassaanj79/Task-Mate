"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createOrg } from "@/lib/actions/orgs";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function CreateFirstOrg() {
  const [pending, start] = useTransition();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <LogoMark className="mb-2 size-9" />
          <CardTitle>Create your first workspace</CardTitle>
          <CardDescription>
            A workspace holds your team&apos;s projects and tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" placeholder="Acme Inc." required autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
