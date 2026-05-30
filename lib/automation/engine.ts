import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type TriggerType =
  | "task_created"
  | "status_changed"
  | "assignee_changed"
  | "priority_changed"
  | "due_changed"
  | "label_added"
  | "comment_added";

type Snapshot = {
  org_id: string;
  project_id: string;
  status_id: string | null;
  assignee_id: string | null;
  priority: string;
  due_date: string | null;
  created_by: string;
  label_ids: string[];
};

type Rule = {
  id: string;
  project_id: string | null;
  trigger: { type?: string; config?: Record<string, unknown> };
  conditions: { op?: "and" | "or"; rules?: ConditionRule[] };
  actions: Record<string, unknown>[];
  created_by: string | null;
};

type ConditionRule = { field: string; op: string; value?: string };

function matchTrigger(
  trigger: Rule["trigger"],
  snap: Snapshot,
  eventConfig?: Record<string, unknown>,
): boolean {
  const c = trigger.config ?? {};
  switch (trigger.type) {
    case "status_changed":
      return !c.to || snap.status_id === c.to;
    case "priority_changed":
      return !c.to || snap.priority === c.to;
    case "assignee_changed":
      return !c.to || snap.assignee_id === c.to;
    case "label_added":
      return !c.label_id || eventConfig?.label_id === c.label_id;
    case "task_created":
    case "due_changed":
    case "comment_added":
      return true;
    default:
      return false;
  }
}

function evalOne(r: ConditionRule, snap: Snapshot): boolean {
  const v = r.value;
  switch (r.field) {
    case "status":
      if (r.op === "is") return snap.status_id === v;
      if (r.op === "is_not") return snap.status_id !== v;
      if (r.op === "is_set") return snap.status_id != null;
      if (r.op === "is_empty") return snap.status_id == null;
      return true;
    case "assignee":
      if (r.op === "is") return snap.assignee_id === v;
      if (r.op === "is_not") return snap.assignee_id !== v;
      if (r.op === "is_set") return snap.assignee_id != null;
      if (r.op === "is_empty") return snap.assignee_id == null;
      return true;
    case "priority":
      if (r.op === "is") return snap.priority === v;
      if (r.op === "is_not") return snap.priority !== v;
      return true;
    case "label":
      if (r.op === "has_label") return snap.label_ids.includes(v ?? "");
      if (r.op === "not_has_label") return !snap.label_ids.includes(v ?? "");
      return true;
    case "due":
      if (r.op === "is_set") return snap.due_date != null;
      if (r.op === "is_empty") return snap.due_date == null;
      if (r.op === "overdue")
        return snap.due_date != null && new Date(snap.due_date) < new Date();
      if (r.op === "due_within") {
        if (!snap.due_date) return false;
        const days = Number(v ?? 0);
        return new Date(snap.due_date) <= new Date(Date.now() + days * 86400000);
      }
      return true;
    default:
      return true;
  }
}

function evalConditions(cond: Rule["conditions"], snap: Snapshot): boolean {
  const rules = cond?.rules ?? [];
  if (rules.length === 0) return true;
  const results = rules.map((r) => evalOne(r, snap));
  return cond.op === "or" ? results.some(Boolean) : results.every(Boolean);
}

// Fire automations for a task event. Runs AFTER the mutation, never throws —
// a failing automation must never break the user's action.
export async function emitEvent(
  supabase: Client,
  args: {
    taskId: string;
    type: TriggerType;
    actorId: string;
    eventConfig?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { data: task } = await supabase
      .from("tasks")
      .select(
        "id, org_id, project_id, status_id, assignee_id, priority, due_date, created_by",
      )
      .eq("id", args.taskId)
      .maybeSingle();
    if (!task) return;

    const { data: links } = await supabase
      .from("task_labels")
      .select("label_id")
      .eq("task_id", args.taskId);

    const snap: Snapshot = {
      org_id: task.org_id,
      project_id: task.project_id,
      status_id: task.status_id,
      assignee_id: task.assignee_id,
      priority: task.priority,
      due_date: task.due_date,
      created_by: task.created_by,
      label_ids: (links ?? []).map((l) => l.label_id),
    };

    const { data: rules } = await supabase
      .from("automations")
      .select("id, project_id, trigger, conditions, actions, created_by")
      .eq("org_id", task.org_id)
      .eq("enabled", true);

    const matched = ((rules ?? []) as unknown as Rule[]).filter(
      (r) =>
        (!r.project_id || r.project_id === task.project_id) &&
        r.trigger?.type === args.type &&
        matchTrigger(r.trigger, snap, args.eventConfig) &&
        evalConditions(r.conditions, snap),
    );
    if (matched.length === 0) return;

    const eventId = crypto.randomUUID();

    for (const r of matched) {
      let error: string | null = null;
      for (const action of r.actions ?? []) {
        const { error: e } = await supabase.rpc("apply_automation_action", {
          p_org: task.org_id,
          p_task: args.taskId,
          p_actor: r.created_by ?? args.actorId,
          p_action: action as unknown as never,
        });
        if (e) {
          error = e.message;
          break;
        }
      }
      await supabase.from("automation_runs").insert({
        org_id: task.org_id,
        automation_id: r.id,
        task_id: args.taskId,
        status: error ? "failed" : "success",
        event_id: eventId,
        event: { type: args.type, ...(args.eventConfig ?? {}) },
        error,
      });
    }
  } catch {
    // swallow — automations are best-effort, never break the mutation
  }
}
