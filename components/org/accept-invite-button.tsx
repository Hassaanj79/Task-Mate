"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions/members";
import { toast } from "sonner";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInvitation(token);
          if (res?.error) toast.error(res.error);
        })
      }
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      Accept invitation
    </Button>
  );
}
