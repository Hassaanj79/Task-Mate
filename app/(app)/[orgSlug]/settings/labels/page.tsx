import { getActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { LabelsSettings, type LabelWithUsage } from "@/components/settings/labels-settings";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getActiveOrg(orgSlug);
  const supabase = await createClient();

  const [{ data: labels }, { data: links }] = await Promise.all([
    supabase.from("labels").select("*").eq("org_id", org.id).order("name"),
    supabase.from("task_labels").select("label_id").eq("org_id", org.id),
  ]);

  const usage = new Map<string, number>();
  for (const l of links ?? []) usage.set(l.label_id, (usage.get(l.label_id) ?? 0) + 1);

  const rows: LabelWithUsage[] = (labels ?? []).map((l) => ({
    ...l,
    usage: usage.get(l.id) ?? 0,
  }));

  return (
    <SettingsLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        <LabelsSettings orgId={org.id} orgSlug={orgSlug} labels={rows} />
      </div>
    </SettingsLayout>
  );
}
