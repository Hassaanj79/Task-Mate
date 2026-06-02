# Task Mate MCP server

Lets Claude (Desktop, Code, or any MCP client) read and manage your Task Mate
tasks — list them, pick the next one by priority, update status/priority/
assignee, comment, and mark complete.

## How it works / security

- Authenticates as **you** via Supabase email + password and uses your JWT for
  every query. **Row-Level Security scopes all access to your account** — same
  rules as the web app. No service-role key, no cross-tenant access.
- Reads the same Supabase project as the app (anon URL + anon key).
- Credentials are read from environment variables only.

## Tools

| Tool | What it does |
|------|--------------|
| `whoami` | Show signed-in user + active workspace |
| `list_projects` | Projects in the workspace |
| `list_statuses` | Board columns for a project (in order) |
| `list_tasks` | Tasks sorted by priority (filters: project, mine-only, completed) |
| `get_next_task` | The single highest-priority incomplete task |
| `get_task` | Full task detail + comments |
| `create_task` | Create a task |
| `update_task` | Change priority/type/status/assignee/title/description/due |
| `complete_task` | Move the task to a "Done"-type column |
| `add_comment` | Add a plain-text comment |
| `list_overdue` | Incomplete tasks past their due date |
| `list_subtasks` | Subtasks of a task |
| `create_subtask` | Create a subtask under a parent |

## Setup

```bash
cd mcp-server
npm install
```

### Quick auth test

```bash
TASKMATE_SUPABASE_URL=https://YOUR.supabase.co \
TASKMATE_SUPABASE_ANON_KEY=eyJ... \
TASKMATE_EMAIL=you@example.com \
TASKMATE_PASSWORD=secret \
node index.mjs
```

Expect: `Signed in as you@example.com; workspace: <slug>` then `Ready.`
(It then waits on stdio — Ctrl-C to quit.)

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "taskmate": {
      "command": "node",
      "args": ["/Users/hassaam/Task Mate/mcp-server/index.mjs"],
      "env": {
        "TASKMATE_SUPABASE_URL": "https://YOUR.supabase.co",
        "TASKMATE_SUPABASE_ANON_KEY": "eyJ...",
        "TASKMATE_EMAIL": "you@example.com",
        "TASKMATE_PASSWORD": "secret",
        "TASKMATE_ORG": "your-workspace-slug"
      }
    }
  }
}
```

Restart Claude Desktop. The `taskmate` tools appear in the 🔌 menu.

### Claude Code

```bash
claude mcp add taskmate \
  -e TASKMATE_SUPABASE_URL=https://YOUR.supabase.co \
  -e TASKMATE_SUPABASE_ANON_KEY=eyJ... \
  -e TASKMATE_EMAIL=you@example.com \
  -e TASKMATE_PASSWORD=secret \
  -e TASKMATE_ORG=your-workspace-slug \
  -- node "/Users/hassaam/Task Mate/mcp-server/index.mjs"
```

## "Work through my tasks by priority"

Tell Claude:

> Use Task Mate. Repeatedly call `get_next_task`; for each, do the work,
> add a short comment on what you did, then `complete_task`. Stop when there
> are no incomplete tasks.

## Automations

Set `TASKMATE_API_URL` to your app URL (e.g.
`https://task-mate-henna.vercel.app`) to route writes through `/api/mcp`. Then
creating/updating tasks, completing, and commenting **fire the automation
engine** — same as actions in the web app. The endpoint authenticates with your
JWT, so RLS still applies. Leave it unset to write straight to the DB (faster,
but automations don't run).

## Limits

- `complete_task` picks the first column whose name matches
  `done|complete|closed|resolved|shipped|finished`, else the last column.
- "Mine" = tasks where you are the assignee.
- Reads always hit the DB directly (fast); only writes use the API.
