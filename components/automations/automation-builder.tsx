"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRIGGERS, ACTIONS, CONDITION_FIELDS } from "@/lib/automation/catalog";
import { PRIORITIES } from "@/lib/constants";
import { displayName } from "@/lib/format";
import {
  createAutomation,
  updateAutomation,
  type AutomationInput,
} from "@/lib/actions/automations";
import { toast } from "sonner";
import type { Automation, Profile } from "@/lib/database.types";

export type PickerData = {
  projects: { id: string; name: string }[];
  statuses: { id: string; name: string; color: string | null; project_id: string }[];
  labels: { id: string; name: string; color: string | null }[];
  members: Profile[];
};

type Cfg = Record<string, unknown>;
type Cond = { field: string; op: string; value?: string };

export function AutomationBuilder({
  open,
  onOpenChange,
  orgId,
  orgSlug,
  data,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  orgSlug: string;
  data: PickerData;
  initial: Partial<Automation> | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [projectId, setProjectId] = useState<string>(initial?.project_id ?? "");
  const [trigger, setTrigger] = useState<{ type: string; config?: Cfg }>(
    (initial?.trigger as { type: string; config?: Cfg }) ?? { type: "task_created" },
  );
  const [conds, setConds] = useState<{ op: "and" | "or"; rules: Cond[] }>(
    (initial?.conditions as { op: "and" | "or"; rules: Cond[] }) ?? { op: "and", rules: [] },
  );
  const [actions, setActions] = useState<{ type: string; config?: Cfg }[]>(
    (initial?.actions as { type: string; config?: Cfg }[]) ?? [],
  );

  const statusesFor = (pid: string) =>
    data.statuses.filter((s) => s.project_id === pid);
  const triggerMeta = TRIGGERS.find((t) => t.type === trigger.type);

  function setTriggerCfg(patch: Cfg) {
    setTrigger((t) => ({ ...t, config: { ...(t.config ?? {}), ...patch } }));
  }
  function setActionCfg(i: number, patch: Cfg) {
    setActions((arr) =>
      arr.map((a, idx) => (idx === i ? { ...a, config: { ...(a.config ?? {}), ...patch } } : a)),
    );
  }
  function setCond(i: number, patch: Partial<Cond>) {
    setConds((c) => ({ ...c, rules: c.rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  }

  function save() {
    const input: AutomationInput = {
      name,
      projectId: projectId || null,
      trigger,
      conditions: conds,
      actions,
    };
    start(async () => {
      const res = editing
        ? await updateAutomation(initial!.id!, orgSlug, input)
        : await createAutomation(orgId, orgSlug, input);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      onOpenChange(false);
      toast.success(editing ? "Automation saved" : "Automation created");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            {editing ? "Edit automation" : "New automation"}
          </DialogTitle>
          <DialogDescription>When… if… then. Runs automatically.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Row label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Escalate overdue" />
          </Row>

          <Row label="Applies to">
            <Select value={projectId || "all"} onValueChange={(v) => setProjectId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Whole workspace</SelectItem>
                {data.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          {/* TRIGGER */}
          <Section title="When">
            <Select
              value={trigger.type}
              onValueChange={(v) => setTrigger({ type: v, config: {} })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {triggerMeta?.config === "to_status" && (
              <StatusSelect
                value={String(trigger.config?.to ?? "")}
                statuses={statusesFor(projectId)}
                placeholder={projectId ? "to any status" : "select a project first"}
                onChange={(v) => setTriggerCfg({ to: v })}
              />
            )}
            {triggerMeta?.config === "to_priority" && (
              <PrioritySelect value={String(trigger.config?.to ?? "")} onChange={(v) => setTriggerCfg({ to: v })} anyLabel="to any priority" />
            )}
            {triggerMeta?.config === "to_assignee" && (
              <MemberSelect members={data.members} value={String(trigger.config?.to ?? "")} onChange={(v) => setTriggerCfg({ to: v })} anyLabel="to anyone" />
            )}
            {triggerMeta?.config === "label" && (
              <LabelSelect labels={data.labels} value={String(trigger.config?.label_id ?? "")} onChange={(v) => setTriggerCfg({ label_id: v })} anyLabel="any type" />
            )}
            {triggerMeta?.config === "schedule" && (
              <Select value={String(trigger.config?.when ?? "today")} onValueChange={(v) => setTriggerCfg({ when: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">on the due date</SelectItem>
                  <SelectItem value="overdue">when overdue</SelectItem>
                </SelectContent>
              </Select>
            )}
            {triggerMeta?.scheduled && (
              <p className="text-[11px] text-muted-foreground">Scheduled rules run once daily (08:00 UTC).</p>
            )}
          </Section>

          {/* CONDITIONS */}
          <Section
            title="If"
            action={
              conds.rules.length > 1 ? (
                <Select value={conds.op} onValueChange={(v) => setConds((c) => ({ ...c, op: v as "and" | "or" }))}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">Match all</SelectItem>
                    <SelectItem value="or">Match any</SelectItem>
                  </SelectContent>
                </Select>
              ) : null
            }
          >
            {conds.rules.map((r, i) => {
              const fmeta = CONDITION_FIELDS.find((f) => f.field === r.field)!;
              const noValue = ["is_set", "is_empty", "overdue"].includes(r.op);
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <Select value={r.field} onValueChange={(v) => setCond(i, { field: v, op: CONDITION_FIELDS.find((f) => f.field === v)!.ops[0].op, value: "" })}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_FIELDS.map((f) => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={r.op} onValueChange={(v) => setCond(i, { op: v })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{fmeta.ops.map((o) => <SelectItem key={o.op} value={o.op}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {!noValue && (
                    <CondValue field={r.field} op={r.op} value={r.value ?? ""} data={data} projectId={projectId} onChange={(v) => setCond(i, { value: v })} />
                  )}
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setConds((c) => ({ ...c, rules: c.rules.filter((_, idx) => idx !== i) }))}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setConds((c) => ({ ...c, rules: [...c.rules, { field: "status", op: "is", value: "" }] }))}>
              <Plus className="size-3.5" /> Add condition
            </Button>
          </Section>

          {/* ACTIONS */}
          <Section title="Then">
            {actions.map((a, i) => {
              const ameta = ACTIONS.find((x) => x.type === a.type)!;
              return (
                <div key={i} className="space-y-2 rounded-lg border p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Select value={a.type} onValueChange={(v) => setActions((arr) => arr.map((x, idx) => (idx === i ? { type: v, config: {} } : x)))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{ACTIONS.map((x) => <SelectItem key={x.type} value={x.type}>{x.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setActions((arr) => arr.filter((_, idx) => idx !== i))}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <ActionConfig action={a} index={i} meta={ameta} data={data} projectId={projectId} setCfg={setActionCfg} />
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setActions((arr) => [...arr, { type: "notify", config: { recipient: "assignee", message: "" } }])}>
              <Plus className="size-3.5" /> Add action
            </Button>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save" : "Create automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-semibold text-secondary-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatusSelect({ value, statuses, onChange, placeholder }: { value: string; statuses: PickerData["statuses"]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Select value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="any">{placeholder ?? "any"}</SelectItem>
        {statuses.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function PrioritySelect({ value, onChange, anyLabel }: { value: string; onChange: (v: string) => void; anyLabel?: string }) {
  return (
    <Select value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {anyLabel && <SelectItem value="any">{anyLabel}</SelectItem>}
        {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function MemberSelect({ members, value, onChange, anyLabel, allowUnassigned }: { members: Profile[]; value: string; onChange: (v: string) => void; anyLabel?: string; allowUnassigned?: boolean }) {
  return (
    <Select value={value || (anyLabel ? "any" : "none")} onValueChange={(v) => onChange(v === "any" ? "" : v === "none" ? "" : v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {anyLabel && <SelectItem value="any">{anyLabel}</SelectItem>}
        {allowUnassigned && <SelectItem value="none">Unassigned</SelectItem>}
        {members.map((m) => <SelectItem key={m.id} value={m.id}>{displayName(m)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function LabelSelect({ labels, value, onChange, anyLabel }: { labels: PickerData["labels"]; value: string; onChange: (v: string) => void; anyLabel?: string }) {
  return (
    <Select value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {anyLabel && <SelectItem value="any">{anyLabel}</SelectItem>}
        {labels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function CondValue({ field, op, value, data, projectId, onChange }: { field: string; op: string; value: string; data: PickerData; projectId: string; onChange: (v: string) => void }) {
  if (field === "due" && op === "due_within")
    return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-20" placeholder="days" />;
  if (field === "status") return <StatusSelect value={value} statuses={data.statuses.filter((s) => s.project_id === projectId)} onChange={onChange} placeholder="status" />;
  if (field === "assignee") return <MemberSelect members={data.members} value={value} onChange={onChange} allowUnassigned />;
  if (field === "priority") return <PrioritySelect value={value} onChange={onChange} />;
  if (field === "label") return <LabelSelect labels={data.labels} value={value} onChange={onChange} />;
  return null;
}

function ActionConfig({ action, index, meta, data, projectId, setCfg }: { action: { type: string; config?: Cfg }; index: number; meta: { config: string }; data: PickerData; projectId: string; setCfg: (i: number, patch: Cfg) => void }) {
  const cfg = action.config ?? {};
  if (meta.config === "status") return <StatusSelect value={String(cfg.status_id ?? "")} statuses={data.statuses.filter((s) => s.project_id === projectId)} placeholder={projectId ? "pick status" : "select a project first"} onChange={(v) => setCfg(index, { status_id: v })} />;
  if (meta.config === "priority") return <PrioritySelect value={String(cfg.priority ?? "")} onChange={(v) => setCfg(index, { priority: v })} />;
  if (meta.config === "assignee") return <MemberSelect members={data.members} value={String(cfg.assignee_id ?? "")} onChange={(v) => setCfg(index, { assignee_id: v })} allowUnassigned />;
  if (meta.config === "label") return <LabelSelect labels={data.labels} value={String(cfg.label_id ?? "")} onChange={(v) => setCfg(index, { label_id: v })} />;
  if (meta.config === "comment") return <Input value={String(cfg.text ?? "")} onChange={(e) => setCfg(index, { text: e.target.value })} placeholder="Comment text" className="h-8" />;
  if (meta.config === "due")
    return (
      <div className="flex items-center gap-1.5">
        <Select value={String(cfg.mode ?? "shift")} onValueChange={(v) => setCfg(index, { mode: v })}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shift">shift by days</SelectItem>
            <SelectItem value="set">set to date</SelectItem>
            <SelectItem value="clear">clear</SelectItem>
          </SelectContent>
        </Select>
        {cfg.mode === "set" ? (
          <Input type="date" value={String(cfg.date ?? "").slice(0, 10)} onChange={(e) => setCfg(index, { date: e.target.value ? new Date(e.target.value).toISOString() : "" })} className="h-8" />
        ) : cfg.mode === "clear" ? null : (
          <Input type="number" value={String(cfg.days ?? "")} onChange={(e) => setCfg(index, { days: e.target.value })} className="h-8 w-20" placeholder="days" />
        )}
      </div>
    );
  if (meta.config === "notify")
    return (
      <div className="flex flex-col gap-1.5">
        <Select value={String(cfg.recipient ?? "assignee")} onValueChange={(v) => setCfg(index, { recipient: v })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="assignee">the assignee</SelectItem>
            <SelectItem value="creator">the creator</SelectItem>
            <SelectItem value="admins">workspace admins</SelectItem>
            {data.members.map((m) => <SelectItem key={m.id} value={m.id}>{displayName(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={String(cfg.message ?? "")} onChange={(e) => setCfg(index, { message: e.target.value })} placeholder="Notification message" className="h-8" />
      </div>
    );
  return null;
}
