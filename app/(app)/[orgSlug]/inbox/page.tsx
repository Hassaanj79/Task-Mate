import { getActiveOrg } from "@/lib/auth";
import { InboxView } from "@/components/screens/inbox-view";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getActiveOrg(orgSlug);
  return <InboxView orgSlug={orgSlug} orgId={org.id} />;
}
