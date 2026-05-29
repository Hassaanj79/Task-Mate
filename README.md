# Task Mate

A multi-tenant task-management SaaS (a simpler ClickUp / Jira / Notion). Organizations
are hard-isolated from each other by Postgres **Row Level Security**; each org has
projects, each project has tasks shown in **Board** (Kanban, drag-and-drop) and **List**
(sortable table) views, with members, roles, comments, labels, subtasks, attachments,
activity history, and **real-time** updates.

## Stack

- **Next.js (App Router, TypeScript)** — Server Components + Server Actions
- **Tailwind CSS v4 + shadcn/ui** — warm-light "Task Mate" theme, coral accent, Inter
- **Supabase** — Auth, Postgres (+ RLS), Realtime, Storage — via `@supabase/ssr`
- **dnd-kit** (Kanban) · **Tiptap** (rich text) · **TanStack Query** (server state) ·
  **TanStack Table** (list) · **React Hook Form + Zod** · **lucide-react** · **sonner**

## Architecture

Shared Postgres database, an `org_id` column on every tenant table, plus RLS. Every
read/write goes through a Supabase client created with the logged-in user's JWT, so
Postgres evaluates RLS using `auth.uid()` and refuses rows the user's org membership
doesn't allow. All mutations are **Server Actions** using the RLS-aware server client —
the service-role key is **never** used in client-reachable code.

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a project. From **Settings → API** copy:

- **Project URL** (e.g. `https://xxxx.supabase.co`)
- **anon / public** key
- **service_role** key (server-only)

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co     # the API URL, NOT the dashboard URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...                          # server only; not used by the app today
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> The URL must be the API URL `https://<ref>.supabase.co` — not the
> `https://supabase.com/dashboard/project/<ref>` dashboard link.

### 3. Run the database migrations

Open **Supabase Studio → SQL Editor** and run, in order:

1. `supabase/migrations/0001_init.sql` — schema, helper functions, signup trigger,
   **RLS policies on every table**, and the `accept_invitation` RPC.
2. `supabase/migrations/0002_storage.sql` — creates the private `attachments` bucket
   and its storage policies.
3. `supabase/migrations/0003_create_org_rpc.sql` — `create_organization` RPC +
   creator-read policy (lets a signed-in user create a workspace from the app;
   avoids the RLS bootstrap where a brand-new org has no membership yet).

(Or, with the Supabase CLI linked to your project: `supabase db push`.)

### 4. Enable Realtime

`0001_init.sql` already adds `tasks`, `comments`, `task_statuses`, and `activity_log`
to the `supabase_realtime` publication. If your project needs it enabled in the
dashboard too: **Database → Replication → `supabase_realtime`** and confirm those
tables are included.

### 5. Google sign-in (optional)

**Authentication → Providers → Google**: enable it and add your OAuth credentials.
Add `http://localhost:3000/auth/callback` (and your production URL) to the provider's
redirect allow-list and to **Authentication → URL Configuration → Redirect URLs**.

### 6. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up — a profile, a first
workspace, and an owner membership are created automatically by the signup trigger.

## Roles (RBAC)

| Action | owner | admin | member | guest |
|---|:--:|:--:|:--:|:--:|
| View org data | ✓ | ✓ | ✓ | ✓ |
| Create / edit tasks & projects, comment | ✓ | ✓ | ✓ | — |
| Invite / remove members, change roles | ✓ | ✓ | — | — |
| Rename / configure org | ✓ | ✓ | — | — |
| Delete org | ✓ | — | — | — |

RBAC is enforced in the database by RLS; the UI mirrors it (`lib/rbac.ts`) only to
hide controls users can't use.

## Project layout

```
app/
  (auth)/login | signup            # email/password + Google
  auth/callback/route.ts           # OAuth + email-confirm code exchange
  invite/[token]/                  # accept an invitation
  (app)/                           # protected; requires a session
    [orgSlug]/                     # active org in the URL
      page.tsx                     # dashboard (greeting, stats, project grid)
      settings/members | general
      projects/[projectId]/board   # Kanban
      projects/[projectId]/list    # table
lib/
  supabase/{server,client,middleware}.ts
  auth.ts  rbac.ts  queries.ts  constants.ts  format.ts
  actions/{auth,orgs,projects,members,tasks,comments,attachments}.ts
components/{app,org,project,board,task,list,ui}/
supabase/migrations/0001_init.sql  0002_storage.sql
middleware.ts                       # session refresh + route guard
```

## Notes

- Board ordering uses a fractional numeric `position` — dropping a card between two
  others sets `position = (prev + next) / 2`, so a drag never reindexes the column.
- Out of scope for v1 (clean seams left, not built): billing/Stripe, custom fields,
  automations, time tracking.
