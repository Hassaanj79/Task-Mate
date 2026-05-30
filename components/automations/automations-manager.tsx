"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  History,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AutomationBuilder,
  type PickerData,
} from "@/components/automations/automation-builder";
import { RunHistory } from "@/components/automations/run-history";
import { TRIGGERS, ACTIONS, RECIPES } from "@/lib/automation/catalog";
import { toggleAutomation, deleteAutomation } from "@/lib/actions/automations";
import { toast } from "sonner";
import type { Automation, Profile } from "@/lib/database.types";

export function AutomationsManager({
  orgId,
  orgSlug,
  automations,
  projects,
  statuses,
  labels,
  members,
}: {
  orgId: string;
  orgSlug: string;
  automations: Automation[];
  projects: { id: string; name: string }[];
  statuses: { id: string; name: string; color: string | null; project_id: string }[];
  labels: { id: string; name: string; color: string | null }[];
  members: Profile[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [initial, setInitial] = useState<Partial<Automation> | null>(null);
  const [historyOf, setHistoryOf] = useState<Automation | null>(null);

  const data: PickerData = { projects, statuses, labels, members };
  const projectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name ?? "Project" : "Whole workspace";

  function openNew() {
    setInitial(null);
    setBuilderOpen(true);
  }
  function openRecipe(r: (typeof RECIPES)[number]) {
    setInitial({
      name: r.name,
      project_id: null,
      trigger: r.trigger,
      conditions: r.conditions as unknown as Record<string, unknown>,
      actions: r.actions as unknown as Record<string, unknown>[],
    });
    setBuilderOpen(true);
  }
  function openEdit(a: Automation) {
    setInitial(a);
    setBuilderOpen(true);
  }

  function toggle(a: Automation, enabled: boolean) {
    start(async () => {
      const res = await toggleAutomation(a.id, orgSlug, enabled);
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });
  }
  function remove(a: Automation) {
    start(async () => {
      const res = await deleteAutomation(a.id, orgSlug);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Automation deleted");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[21px] font-bold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground">
            Run actions automatically when things happen — like ClickUp, Jira, or Notion.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" /> New automation
        </Button>
      </div>

      {/* Recipe gallery */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Start from a recipe
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              onClick={() => openRecipe(r)}
              className="flex items-start gap-2.5 rounded-lg border bg-card p-3 text-left transition hover:border-primary"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Zap className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{r.name}</span>
                <span className="block text-[11.5px] leading-tight text-muted-foreground">
                  {r.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Existing automations */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Your automations ({automations.length})
        </p>
        {automations.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            No automations yet. Start from a recipe or create one.
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {automations.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <Switch checked={a.enabled} onCheckedChange={(v) => toggle(a, v)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{a.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {projectName(a.project_id)} · When{" "}
                    {TRIGGERS.find((t) => t.type === (a.trigger as { type: string }).type)?.label ?? "event"}
                    {" · "}
                    {(a.actions?.length ?? 0)} action{(a.actions?.length ?? 0) === 1 ? "" : "s"}
                    {a.run_count > 0 ? ` · ran ${a.run_count}×` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(a)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHistoryOf(a)}>
                      <History className="size-4" /> Run history
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => remove(a)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Actions available: {ACTIONS.map((a) => a.label).join(" · ")}.
      </p>

      {builderOpen && (
        <AutomationBuilder
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          orgId={orgId}
          orgSlug={orgSlug}
          data={data}
          initial={initial}
        />
      )}
      {historyOf && (
        <RunHistory
          open={!!historyOf}
          onOpenChange={(v) => !v && setHistoryOf(null)}
          automationId={historyOf.id}
          name={historyOf.name}
        />
      )}
    </div>
  );
}
