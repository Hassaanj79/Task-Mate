"use client";

import { useState } from "react";
import { Copy, Check, Plug, Terminal, Bot } from "lucide-react";
import { toast } from "sonner";

function CopyBlock({ label, text }: { label?: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      )}
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 text-xs leading-relaxed">
          {text}
        </pre>
        <button
          onClick={copy}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:text-foreground"
          title="Copy"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

const TOOLS = [
  ["whoami", "Signed-in user + workspace"],
  ["list_projects", "Projects in the workspace"],
  ["list_statuses", "Board columns of a project"],
  ["list_tasks", "Tasks sorted by priority"],
  ["get_next_task", "Highest-priority incomplete task"],
  ["list_overdue", "Incomplete tasks past due"],
  ["get_task", "Full task detail + comments"],
  ["list_members", "Workspace members (for assign / @mention)"],
  ["create_task", "Create a task"],
  ["create_subtask", "Create a subtask"],
  ["list_subtasks", "Subtasks of a task"],
  ["update_task", "Change priority/type/status/assignee/…"],
  ["set_due", "Set or clear a due date"],
  ["assign_to", "Assign to a user / me / unassign"],
  ["complete_task", "Move to a Done column"],
  ["add_comment", "Comment (+ optional @mentions)"],
];

export function IntegrationsSettings({
  orgSlug,
  supabaseUrl,
  anonKey,
  appUrl,
}: {
  orgSlug: string;
  supabaseUrl: string;
  anonKey: string;
  appUrl: string;
}) {
  const desktopConfig = `{
  "mcpServers": {
    "taskmate": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-server/index.mjs"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "${supabaseUrl}",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "${anonKey}",
        "TASKMATE_EMAIL": "you@example.com",
        "TASKMATE_PASSWORD": "your-password",
        "TASKMATE_ORG": "${orgSlug}",
        "TASKMATE_API_URL": "${appUrl}"
      }
    }
  }
}`;

  const codeCmd = `claude mcp add taskmate \\
  -e NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl} \\
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey} \\
  -e TASKMATE_EMAIL=you@example.com \\
  -e TASKMATE_PASSWORD=your-password \\
  -e TASKMATE_ORG=${orgSlug} \\
  -e TASKMATE_API_URL=${appUrl} \\
  -- node /ABSOLUTE/PATH/TO/mcp-server/index.mjs`;

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Plug className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Claude to Task Mate over MCP so it can read your tasks and
            work them one by one by priority. The connector runs on your machine
            and signs in as you — access is limited to what you can already see.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">1. Get the connector</h2>
        <p className="text-sm text-muted-foreground">
          It lives in the app repo under{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">mcp-server/</code>.
          Install its dependencies once:
        </p>
        <CopyBlock text={`cd mcp-server\nnpm install`} />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4" /> 2a. Claude Desktop
        </h2>
        <p className="text-sm text-muted-foreground">
          Add to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            ~/Library/Application Support/Claude/claude_desktop_config.json
          </code>{" "}
          (set the absolute path + your password), then restart Claude.
        </p>
        <CopyBlock text={desktopConfig} />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Terminal className="size-4" /> 2b. Claude Code
        </h2>
        <CopyBlock text={codeCmd} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">3. Use it</h2>
        <p className="text-sm text-muted-foreground">Ask Claude:</p>
        <CopyBlock
          text={`Use Task Mate. Repeatedly call get_next_task; for each, do the work, add_comment what you did, then complete_task. Stop when none remain.`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Available tools</h2>
        <div className="grid gap-x-6 gap-y-1.5 rounded-lg border p-4 sm:grid-cols-2">
          {TOOLS.map(([name, desc]) => (
            <div key={name} className="flex items-baseline gap-2 text-sm">
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                {name}
              </code>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        Your password is stored in the local MCP config only. Writes route
        through this app (<code>{appUrl}/api/mcp</code>) so automations fire;
        everything stays scoped to your account by row-level security.
      </p>
    </div>
  );
}
