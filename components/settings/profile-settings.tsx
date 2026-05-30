"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/settings/combobox";
import { ImageUpload } from "@/components/settings/image-upload";
import { updateProfile, setAvatar } from "@/lib/actions/profile";
import { initials, displayName } from "@/lib/format";
import { orgColor } from "@/lib/format";
import { toast } from "sonner";
import type { Profile } from "@/lib/database.types";

function timezones(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (Intl as any).supportedValuesOf;
    if (typeof fn === "function") return fn("timeZone");
  } catch {
    // ignore
  }
  return ["UTC", "America/New_York", "Europe/London", "Asia/Karachi", "Asia/Tokyo"];
}

export function ProfileSettings({
  profile,
  roleLabel,
}: {
  profile: Profile;
  roleLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [timezone, setTimezone] = useState(profile.timezone ?? "");
  const tzList = useMemo(() => timezones(), []);

  function save(formData: FormData) {
    formData.set("timezone", timezone);
    start(async () => {
      const res = await updateProfile(formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Profile saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[21px] font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your personal information across every workspace.
        </p>
      </div>

      <div className="space-y-3 border-b pb-6">
        <h2 className="text-[15px] font-bold">Photo</h2>
        <ImageUpload
          bucket="avatars"
          pathPrefix={profile.id}
          currentUrl={profile.avatar_url}
          fallback={initials(profile.full_name, profile.email)}
          shape="circle"
          tint={orgColor(profile.id)}
          onChange={(url) =>
            start(async () => {
              await setAvatar(url);
              router.refresh();
            })
          }
        />
      </div>

      <form action={save} className="space-y-6">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder={displayName(profile)}
              required
            />
          </Field>
          <Field label="Email">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Phone number">
            <Input
              name="phone"
              defaultValue={profile.phone ?? ""}
              placeholder="+1 555 000 1234"
            />
          </Field>
          <Field label="Job title">
            <Input
              name="job_title"
              defaultValue={profile.job_title ?? ""}
              placeholder="Product Manager"
            />
          </Field>
          <Field label="Role">
            <div>
              <Badge variant="secondary">{roleLabel}</Badge>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                Set by your workspace admins.
              </p>
            </div>
          </Field>
          <Field label="Timezone">
            <Combobox
              options={tzList}
              value={timezone || null}
              onChange={setTimezone}
              placeholder="Select timezone"
            />
          </Field>
        </div>

        <Field label="Bio">
          <Textarea
            name="bio"
            defaultValue={profile.bio ?? ""}
            placeholder="A short intro about you."
            rows={3}
            className="max-w-2xl"
          />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-semibold text-secondary-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
