import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { emitEvent } from "@/lib/automation/engine";

// Authenticated write endpoint for the Task Mate MCP server (and other
// token-bearing clients). Runs the same mutations as the app's server actions
// AND fires the automation engine — which direct table writes can't do.
//
// Auth: Authorization: Bearer <supabase access token>. RLS still applies; the
// token identifies the user, so cross-tenant writes are impossible.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function plainToDoc(text: string) {
  const t = (text || "").trim();
  if (!t) return { type: "doc", content: [] };
  return {
    type: "doc",
    content: t.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  // Client bound to the user's JWT — every query is RLS-scoped to them.
  const supabase = createClient<Database>(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userData.user)
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const userId = userData.user.id;

  let body: { action?: string; args?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action;
  const a = body.args ?? {};

  async function logActivity(
    orgId: string,
    taskId: string,
    actionName: string,
    meta?: Record<string, unknown>,
  ) {
    await supabase
      .from("activity_log")
      .insert({ org_id: orgId, task_id: taskId, actor_id: userId, action: actionName, meta: meta ?? null });
  }

  try {
    switch (action) {
      case "create_task": {
        const projectId = String(a.project_id ?? "");
        const title = String(a.title ?? "").trim();
        if (!projectId || !title)
          return NextResponse.json({ error: "project_id and title required" }, { status: 400 });
        // Derive org from the project (don't trust a client-supplied org).
        const { data: proj, error: pErr } = await supabase
          .from("projects")
          .select("org_id")
          .eq("id", projectId)
          .maybeSingle();
        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
        if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const row: Record<string, unknown> = {
          org_id: proj.org_id,
          project_id: projectId,
          title,
          created_by: userId,
          position: Date.now(),
        };
        if (a.parent_id) row.parent_id = a.parent_id;
        if (a.status_id) row.status_id = a.status_id;
        if (a.priority) row.priority = a.priority;
        if (a.type) row.type = a.type;
        if (a.assignee_id) row.assignee_id = a.assignee_id;
        if (a.due_date) row.due_date = a.due_date;
        if (typeof a.description === "string") row.description = plainToDoc(a.description);

        const { data: created, error } = await supabase
          .from("tasks")
          .insert(row as never)
          .select("id")
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        await logActivity(proj.org_id, created.id, "created");
        await emitEvent(supabase, { taskId: created.id, type: "task_created", actorId: userId });
        return NextResponse.json({ id: created.id, created: true });
      }

      case "update_task": {
        const taskId = String(a.task_id ?? "");
        if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });
        const patch: Record<string, unknown> = {};
        for (const k of ["title", "priority", "type", "status_id", "assignee_id", "due_date"] as const)
          if (k in a) patch[k] = a[k];
        if (typeof a.description === "string") patch.description = plainToDoc(a.description);
        if (Object.keys(patch).length === 0)
          return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

        const { data: t, error } = await supabase
          .from("tasks")
          .update(patch as never)
          .eq("id", taskId)
          .select("org_id")
          .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        if (!t) return NextResponse.json({ error: "Task not found" }, { status: 404 });

        await logActivity(t.org_id, taskId, "updated", patch);
        if ("status_id" in patch)
          await emitEvent(supabase, { taskId, type: "status_changed", actorId: userId });
        if ("assignee_id" in patch)
          await emitEvent(supabase, { taskId, type: "assignee_changed", actorId: userId });
        if ("priority" in patch)
          await emitEvent(supabase, { taskId, type: "priority_changed", actorId: userId });
        if ("due_date" in patch)
          await emitEvent(supabase, { taskId, type: "due_changed", actorId: userId });
        return NextResponse.json({ updated: true });
      }

      case "add_comment": {
        const taskId = String(a.task_id ?? "");
        const text = String(a.text ?? "");
        if (!taskId || !text.trim())
          return NextResponse.json({ error: "task_id and text required" }, { status: 400 });
        const { data: t, error: tErr } = await supabase
          .from("tasks")
          .select("org_id")
          .eq("id", taskId)
          .maybeSingle();
        if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
        if (!t) return NextResponse.json({ error: "Task not found" }, { status: 404 });

        const { data: c, error } = await supabase
          .from("comments")
          .insert({ org_id: t.org_id, task_id: taskId, author_id: userId, body: plainToDoc(text) as never })
          .select("id")
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        await emitEvent(supabase, { taskId, type: "comment_added", actorId: userId });
        return NextResponse.json({ id: c.id, added: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
