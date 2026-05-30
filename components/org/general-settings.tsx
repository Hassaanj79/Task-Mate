"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Combobox } from "@/components/settings/combobox";
import { ImageUpload } from "@/components/settings/image-upload";
import { updateOrg, deleteOrg, setOrgLogo } from "@/lib/actions/orgs";
import { canConfigureOrg, canDeleteOrg } from "@/lib/rbac";
import { BUSINESS_TYPES, COMPANY_SIZES } from "@/lib/business-types";
import { orgInitials, orgColor } from "@/lib/format";
import { toast } from "sonner";
import type { Organization, OrgRole } from "@/lib/database.types";

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-b pb-6">
      <div>
        <h2 className="text-[15px] font-bold">{title}</h2>
        {desc && <p className="text-[13px] text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function GeneralSettings({
  org,
  role,
}: {
  org: Organization;
  role: OrgRole;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  const editable = canConfigureOrg(role);
  const deletable = canDeleteOrg(role);

  const [businessType, setBusinessType] = useState(org.business_type ?? "");
  const [companySize, setCompanySize] = useState(org.company_size ?? "");

  function save(formData: FormData) {
    formData.set("business_type", businessType);
    formData.set("company_size", companySize);
    start(async () => {
      const res = await updateOrg(org.id, org.slug, formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Changes saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[21px] font-bold tracking-tight">General</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace profile and details.
        </p>
      </div>

      <Section title="Workspace logo" desc="Shown across the app and on invitations.">
        <ImageUpload
          bucket="org-logos"
          pathPrefix={org.id}
          currentUrl={org.logo_url}
          fallback={orgInitials(org.name)}
          tint={orgColor(org.id)}
          disabled={!editable}
          onChange={(url) =>
            start(async () => {
              await setOrgLogo(org.id, org.slug, url);
              router.refresh();
            })
          }
        />
      </Section>

      <form action={save} className="space-y-7">
        <Section title="Details" desc="Basic information about your workspace.">
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Field label="Workspace name" required>
              <Input name="name" defaultValue={org.name} disabled={!editable} required />
            </Field>
            <Field label="Contact email">
              <Input
                name="email"
                type="email"
                defaultValue={org.email ?? ""}
                placeholder="hello@company.com"
                disabled={!editable}
              />
            </Field>
            <Field label="Phone number">
              <Input
                name="phone"
                defaultValue={org.phone ?? ""}
                placeholder="+1 555 000 1234"
                disabled={!editable}
              />
            </Field>
            <Field label="Website">
              <Input
                name="website"
                defaultValue={org.website ?? ""}
                placeholder="https://company.com"
                disabled={!editable}
              />
            </Field>
            <Field label="Business / service type">
              <Combobox
                options={BUSINESS_TYPES}
                value={businessType || null}
                onChange={setBusinessType}
                placeholder="Select a type"
                disabled={!editable}
              />
            </Field>
            <Field label="Company size">
              <Select
                value={companySize || undefined}
                onValueChange={setCompanySize}
                disabled={!editable}
              >
                <SelectTrigger className="max-w-[420px]">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} {s === "Just me" ? "" : "people"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Address">
            <Textarea
              name="address"
              defaultValue={org.address ?? ""}
              placeholder="Street, city, state, country"
              rows={2}
              className="max-w-2xl"
              disabled={!editable}
            />
          </Field>
          <Field label="Description">
            <Textarea
              name="description"
              defaultValue={org.description ?? ""}
              placeholder="What does your team do?"
              rows={3}
              className="max-w-2xl"
              disabled={!editable}
            />
          </Field>

          <p className="text-xs text-muted-foreground">
            Workspace URL: taskmate.app/{org.slug}
          </p>
        </Section>

        {editable && (
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        )}
      </form>

      {deletable && (
        <div className="space-y-3 rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-5">
          <div>
            <h2 className="text-[15px] font-bold text-destructive">Danger zone</h2>
            <p className="text-[13px] text-muted-foreground">
              Permanently delete this workspace and everything in it. This cannot
              be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{org.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes all projects, tasks, comments, and members. Type{" "}
                  <span className="font-semibold">{org.name}</span> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={org.name}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText !== org.name || pending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    start(async () => {
                      const res = await deleteOrg(org.id);
                      if (res?.error) toast.error(res.error);
                    });
                  }}
                >
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
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
