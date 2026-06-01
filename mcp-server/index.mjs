#!/usr/bin/env node
// Task Mate MCP server.
// Lets Claude read and manage your tasks. Authenticates as YOU via Supabase
// email+password, so Row-Level Security scopes every call to your account —
// no service-role key, no cross-tenant access.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// ---- config ----
const SUPABASE_URL =
  process.env.TASKMATE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.TASKMATE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.TASKMATE_EMAIL;
const PASSWORD = process.env.TASKMATE_PASSWORD;
const ORG_SLUG = process.env.TASKMATE_ORG || null; // optional: pin one workspace

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !EMAIL || !PASSWORD) {
  console.error(
    "[taskmate-mcp] Missing env. Required: TASKMATE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), " +
      "TASKMATE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), TASKMATE_EMAIL, TASKMATE_PASSWORD.",
  );
  process.exit(1);
}

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
const PRIORITIES = ["none", "low", "medium", "high", "urgent"];
const TASK_TYPES = ["task", "bug", "feature", "story", "improvement"];
// Status names treated as "completed" for next-task / complete_task.
const DONE_RE = /\b(done|complete|completed|closed|resolved|shipped|finished)\b/i;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
});

let ME = null; // { id, email }
let ORG = null; // { id, slug, name } | null

async function init() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) {
    console.error(`[taskmate-mcp] Sign-in failed: ${error.message}`);
    process.exit(1);
  }
  ME = { id: data.user.id, email: data.user.email };

  // Resolve the active workspace (RLS lets the user read their own orgs).
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, slug, name");
  if (orgs && orgs.length) {
    ORG = ORG_SLUG ? orgs.find((o) => o.slug === ORG_SLUG) || orgs[0] : orgs[0];
  }
  console.error(
    `[taskmate-mcp] Signed in as ${ME.email}; workspace: ${ORG ? ORG.slug : "(none)"}`,
  );
}

// ---- helpers ----
const ok = (obj) => ({
  content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
});
const err = (msg) => ({
  content: [{ type: "text", text: `Error: ${msg}` }],
  isError: true,
});

function plainToDoc(text) {
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
function docToPlain(doc) {
  if (!doc || !doc.content) return "";
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.type === "text" && n.text) out.push(n.text);
      else if (n.content) walk(n.content);
      if (n.type === "paragraph") out.push("\n");
    }
  };
  walk(doc.content);
  return out.join("").replace(/\n{2,}/g, "\n").trim();
}

async function statusMap(projectId) {
  const { data } = await supabase
    .from("task_statuses")
    .select("id, name, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  return data || [];
}
const isDone = (statuses, statusId) => {
  const s = statuses.find((x) => x.id === statusId);
  return s ? DONE_RE.test(s.name) : false;
};

function shapeTask(t, statuses) {
  const s = statuses.find((x) => x.id === t.status_id);
  return {
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    status: s ? s.name : null,
    status_id: t.status_id,
    assignee_id: t.assignee_id,
    assigned_to_me: t.assignee_id === ME.id,
    due_date: t.due_date,
    project_id: t.project_id,
    description: docToPlain(t.description),
    completed: isDone(statuses, t.status_id),
    created_at: t.created_at,
  };
}

function sortByPriority(a, b) {
  const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (pr) return pr;
  const ad = a.due_date ? Date.parse(a.due_date) : Infinity;
  const bd = b.due_date ? Date.parse(b.due_date) : Infinity;
  if (ad !== bd) return ad - bd;
  return 0;
}

// ---- server ----
const server = new McpServer({ name: "taskmate", version: "0.1.0" });

server.tool(
  "whoami",
  "Show the signed-in Task Mate user and active workspace.",
  {},
  async () => ok({ user: ME, workspace: ORG }),
);

server.tool(
  "list_projects",
  "List projects in the active workspace.",
  {},
  async () => {
    let q = supabase
      .from("projects")
      .select("id, name, description, visibility, archived")
      .eq("archived", false)
      .order("name");
    if (ORG) q = q.eq("org_id", ORG.id);
    const { data, error } = await q;
    if (error) return err(error.message);
    return ok(data);
  },
);

server.tool(
  "list_statuses",
  "List board columns (statuses) for a project, in order.",
  { project_id: z.string().describe("Project id") },
  async ({ project_id }) => ok(await statusMap(project_id)),
);

server.tool(
  "list_tasks",
  "List tasks, sorted by priority (urgent first). Filter by project, mine-only, or completion.",
  {
    project_id: z.string().optional(),
    only_mine: z.boolean().optional().describe("Only tasks assigned to me"),
    include_completed: z.boolean().optional().describe("Default false"),
    limit: z.number().int().min(1).max(200).optional(),
  },
  async ({ project_id, only_mine, include_completed, limit }) => {
    let q = supabase
      .from("tasks")
      .select("*")
      .is("parent_id", null)
      .is("archived_at", null);
    if (project_id) q = q.eq("project_id", project_id);
    else if (ORG) q = q.eq("org_id", ORG.id);
    if (only_mine) q = q.eq("assignee_id", ME.id);
    const { data, error } = await q;
    if (error) return err(error.message);

    // Resolve statuses per involved project for names + done detection.
    const projectIds = [...new Set((data || []).map((t) => t.project_id))];
    const sMap = {};
    for (const pid of projectIds) sMap[pid] = await statusMap(pid);

    let rows = (data || []).map((t) => shapeTask(t, sMap[t.project_id] || []));
    if (!include_completed) rows = rows.filter((r) => !r.completed);
    rows.sort(sortByPriority);
    if (limit) rows = rows.slice(0, limit);
    return ok({ count: rows.length, tasks: rows });
  },
);

server.tool(
  "get_next_task",
  "Get the single highest-priority incomplete task to work on next.",
  {
    project_id: z.string().optional(),
    only_mine: z.boolean().optional().describe("Default true"),
  },
  async ({ project_id, only_mine }) => {
    const mine = only_mine !== false;
    let q = supabase
      .from("tasks")
      .select("*")
      .is("parent_id", null)
      .is("archived_at", null);
    if (project_id) q = q.eq("project_id", project_id);
    else if (ORG) q = q.eq("org_id", ORG.id);
    if (mine) q = q.eq("assignee_id", ME.id);
    const { data, error } = await q;
    if (error) return err(error.message);

    const projectIds = [...new Set((data || []).map((t) => t.project_id))];
    const sMap = {};
    for (const pid of projectIds) sMap[pid] = await statusMap(pid);

    const rows = (data || [])
      .map((t) => shapeTask(t, sMap[t.project_id] || []))
      .filter((r) => !r.completed)
      .sort(sortByPriority);
    if (!rows.length) return ok({ next: null, message: "No incomplete tasks." });
    return ok({ next: rows[0] });
  },
);

server.tool(
  "get_task",
  "Get a task's full detail plus its comments.",
  { task_id: z.string() },
  async ({ task_id }) => {
    const { data: t, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .maybeSingle();
    if (error) return err(error.message);
    if (!t) return err("Task not found (or no access).");
    const statuses = await statusMap(t.project_id);
    const { data: comments } = await supabase
      .from("comments")
      .select("id, body, author_id, created_at")
      .eq("task_id", task_id)
      .order("created_at", { ascending: true });
    return ok({
      ...shapeTask(t, statuses),
      comments: (comments || []).map((c) => ({
        id: c.id,
        author_id: c.author_id,
        text: docToPlain(c.body),
        created_at: c.created_at,
      })),
    });
  },
);

server.tool(
  "create_task",
  "Create a task in a project.",
  {
    project_id: z.string(),
    title: z.string(),
    status_id: z.string().optional(),
    priority: z.enum(PRIORITIES).optional(),
    type: z.enum(TASK_TYPES).optional(),
    description: z.string().optional(),
    assign_to_me: z.boolean().optional(),
    due_date: z.string().optional().describe("ISO timestamp"),
  },
  async (a) => {
    if (!ORG) return err("No active workspace.");
    const row = {
      org_id: ORG.id,
      project_id: a.project_id,
      title: a.title,
      created_by: ME.id,
      position: Date.now(),
    };
    if (a.status_id) row.status_id = a.status_id;
    if (a.priority) row.priority = a.priority;
    if (a.type) row.type = a.type;
    if (a.description) row.description = plainToDoc(a.description);
    if (a.assign_to_me) row.assignee_id = ME.id;
    if (a.due_date) row.due_date = a.due_date;
    const { data, error } = await supabase
      .from("tasks")
      .insert(row)
      .select("id")
      .single();
    if (error) return err(error.message);
    return ok({ id: data.id, created: true });
  },
);

server.tool(
  "update_task",
  "Update fields on a task (priority, type, status, assignee, title, description, due date).",
  {
    task_id: z.string(),
    title: z.string().optional(),
    priority: z.enum(PRIORITIES).optional(),
    type: z.enum(TASK_TYPES).optional(),
    status_id: z.string().optional(),
    assignee_id: z.string().nullable().optional(),
    assign_to_me: z.boolean().optional(),
    description: z.string().optional(),
    due_date: z.string().nullable().optional(),
  },
  async (a) => {
    const patch = {};
    if (a.title !== undefined) patch.title = a.title;
    if (a.priority !== undefined) patch.priority = a.priority;
    if (a.type !== undefined) patch.type = a.type;
    if (a.status_id !== undefined) patch.status_id = a.status_id;
    if (a.assignee_id !== undefined) patch.assignee_id = a.assignee_id;
    if (a.assign_to_me) patch.assignee_id = ME.id;
    if (a.description !== undefined) patch.description = plainToDoc(a.description);
    if (a.due_date !== undefined) patch.due_date = a.due_date;
    if (!Object.keys(patch).length) return err("Nothing to update.");
    const { error } = await supabase.from("tasks").update(patch).eq("id", a.task_id);
    if (error) return err(error.message);
    return ok({ updated: true });
  },
);

server.tool(
  "complete_task",
  "Mark a task complete by moving it to a 'Done'-type column in its project.",
  { task_id: z.string() },
  async ({ task_id }) => {
    const { data: t, error } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", task_id)
      .maybeSingle();
    if (error) return err(error.message);
    if (!t) return err("Task not found (or no access).");
    const statuses = await statusMap(t.project_id);
    const done =
      statuses.find((s) => DONE_RE.test(s.name)) ||
      statuses[statuses.length - 1]; // fall back to last column
    if (!done) return err("No statuses in this project to move to.");
    const { error: uErr } = await supabase
      .from("tasks")
      .update({ status_id: done.id })
      .eq("id", task_id);
    if (uErr) return err(uErr.message);
    return ok({ completed: true, moved_to: done.name });
  },
);

server.tool(
  "add_comment",
  "Add a plain-text comment to a task.",
  { task_id: z.string(), text: z.string() },
  async ({ task_id, text }) => {
    if (!ORG) return err("No active workspace.");
    const { data, error } = await supabase
      .from("comments")
      .insert({
        org_id: ORG.id,
        task_id,
        author_id: ME.id,
        body: plainToDoc(text),
      })
      .select("id")
      .single();
    if (error) return err(error.message);
    return ok({ id: data.id, added: true });
  },
);

await init();
await server.connect(new StdioServerTransport());
console.error("[taskmate-mcp] Ready.");
