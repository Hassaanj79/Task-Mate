import { headers } from "next/headers";
import { getActiveOrg } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await getActiveOrg(orgSlug); // gate access to org members

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${proto}://${host}`;

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        <IntegrationsSettings
          orgSlug={orgSlug}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
          anonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}
          appUrl={appUrl}
        />
      </div>
    </SettingsLayout>
  );
}
