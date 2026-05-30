import Link from "next/link";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInviteButton } from "@/components/org/accept-invite-button";
import { Logo } from "@/components/brand/logo";
import { ROLE_LABEL } from "@/lib/rbac";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getUser();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Logo className="mb-8" markClassName="size-9" textClassName="text-2xl" />

      <Card className="w-full max-w-sm">
        {!user ? (
          <>
            <CardHeader>
              <CardTitle>You&apos;ve been invited</CardTitle>
              <CardDescription>
                Sign in or create an account to accept this invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/login?redirect=/invite/${token}`}>Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/signup?redirect=/invite/${token}`}>
                  Create account
                </Link>
              </Button>
            </CardContent>
          </>
        ) : (
          <InviteDetails token={token} />
        )}
      </Card>
    </div>
  );
}

async function InviteDetails({ token }: { token: string }) {
  const supabase = await createClient();
  // RLS: invitee can read their own pending invite (email match).
  const { data: invite } = await supabase
    .from("invitations")
    .select("id, email, role, status")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <>
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>
            This invitation is invalid, already used, or was issued to a different
            email address than the one you&apos;re signed in with.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Go to your workspace</Link>
          </Button>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Join the workspace</CardTitle>
        <CardDescription>
          You were invited as <strong>{ROLE_LABEL[invite.role]}</strong> ({invite.email}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteButton token={token} />
      </CardContent>
    </>
  );
}
