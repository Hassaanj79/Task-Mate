import { redirect } from "next/navigation";
import { getUserOrgs } from "@/lib/auth";
import { CreateFirstOrg } from "@/components/org/create-first-org";

// Root of the app: send the user to their first workspace, or onboard.
export default async function AppHome() {
  const orgs = await getUserOrgs();
  if (orgs.length > 0) redirect(`/${orgs[0].slug}`);
  return <CreateFirstOrg />;
}
