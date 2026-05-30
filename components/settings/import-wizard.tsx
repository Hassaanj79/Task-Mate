"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseCsvTable } from "@/lib/csv";
import { importTasks, type ImportRow } from "@/lib/actions/import";
import { toast } from "sonner";

type FieldKey = "title" | "status" | "priority" | "assignee" | "due" | "labels" | "description";

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "title", label: "Title", required: true },
  { key: "status", label: "Status / Column" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "due", label: "Due date" },
  { key: "labels", label: "Types / Tags" },
  { key: "description", label: "Description" },
];

const SOURCES: Record<
  string,
  { label: string; instructions: string; hints: Record<FieldKey, string[]> }
> = {
  notion: {
    label: "Notion",
    instructions: "In Notion: ••• → Export → Markdown & CSV (or CSV).",
    hints: {
      title: ["name", "title"], status: ["status", "state"], priority: ["priority"],
      assignee: ["assignee", "person", "owner", "assigned"], due: ["due", "date", "deadline"],
      labels: ["tag", "label", "type", "category"], description: ["description", "notes", "details"],
    },
  },
  clickup: {
    label: "ClickUp",
    instructions: "In ClickUp: List view → ••• → Export → CSV.",
    hints: {
      title: ["task name", "name", "title"], status: ["status"], priority: ["priority"],
      assignee: ["assignee", "assigned to", "assignees"], due: ["due date", "due", "date"],
      labels: ["tags", "tag", "label"], description: ["description", "text content", "content", "details"],
    },
  },
  jira: {
    label: "Jira",
    instructions: "In Jira: Issues → Export → Export Excel CSV (all fields).",
    hints: {
      title: ["summary", "title", "name"], status: ["status"], priority: ["priority"],
      assignee: ["assignee", "assignee email"], due: ["due date", "due"],
      labels: ["labels", "components", "label"], description: ["description"],
    },
  },
  generic: {
    label: "Other / Generic CSV",
    instructions: "Any CSV with a header row.",
    hints: {
      title: ["title", "name", "task", "summary"], status: ["status", "state", "stage"],
      priority: ["priority"], assignee: ["assignee", "person", "owner", "assigned"],
      due: ["due", "date", "deadline"], labels: ["tag", "label", "type", "category"],
      description: ["description", "notes", "details"],
    },
  },
};

const NONE = "__none__";

function guessMap(headers: string[], source: string): Record<FieldKey, number> {
  const hints = SOURCES[source].hints;
  const m = {} as Record<FieldKey, number>;
  for (const f of FIELDS) {
    m[f.key] = headers.findIndex((col) =>
      hints[f.key].some((hint) => col.toLowerCase().includes(hint)),
    );
  }
  if (m.title < 0) m.title = headers.length ? 0 : -1;
  return m;
}

export function ImportWizard({
  orgId,
  orgSlug,
  projects,
}: {
  orgId: string;
  orgSlug: string;
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState("notion");
  const [fileName, setFileName] = useState("");
  const [dest, setDest] = useState<"new" | "existing">("new");
  const [existingId, setExistingId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<FieldKey, number>>({
    title: -1, status: -1, priority: -1, assignee: -1, due: -1, labels: -1, description: -1,
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { headers: h, rows: r } = parseCsvTable(text);
    setFileName(file.name);
    setHeaders(h);
    setRows(r);
    if (!projectName) {
      // Notion exports as "Name <32-hex id>.csv" — drop the id.
      const clean = file.name
        .replace(/\.csv$/i, "")
        .replace(/\s+[0-9a-f]{32}$/i, "")
        .trim();
      setProjectName(clean);
    }
    setMap(guessMap(h, source));
  }

  function changeSource(s: string) {
    setSource(s);
    if (headers.length) setMap(guessMap(headers, s));
  }

  function setField(key: FieldKey, value: string) {
    setMap((m) => ({ ...m, [key]: value === NONE ? -1 : Number(value) }));
  }

  function runImport() {
    if (map.title < 0) {
      toast.error("Pick the Title column.");
      return;
    }
    if (dest === "new" && !projectName.trim()) {
      toast.error("Enter a project name.");
      return;
    }
    if (dest === "existing" && !existingId) {
      toast.error("Pick a project.");
      return;
    }
    const payload: ImportRow[] = rows.map((r) => ({
      title: r[map.title] ?? "",
      status: map.status >= 0 ? r[map.status] : undefined,
      priority: map.priority >= 0 ? r[map.priority] : undefined,
      assignee: map.assignee >= 0 ? r[map.assignee] : undefined,
      due: map.due >= 0 ? r[map.due] : undefined,
      labels: map.labels >= 0 ? r[map.labels] : undefined,
      description: map.description >= 0 ? r[map.description] : undefined,
    }));
    const destination =
      dest === "new"
        ? ({ mode: "new", name: projectName } as const)
        : ({ mode: "existing", projectId: existingId } as const);
    start(async () => {
      const res = await importTasks(orgId, orgSlug, destination, payload);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Imported ${res.created} task${res.created === 1 ? "" : "s"}`);
      router.push(`/${orgSlug}/projects/${res.projectId}/board`);
    });
  }

  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[21px] font-bold tracking-tight">Import tasks</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV from Notion, ClickUp, or Jira. It becomes a project —
          missing statuses are created as new columns, tags become types.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12.5px] font-semibold text-secondary-foreground">
          Source
        </Label>
        <Select value={source} onValueChange={changeSource}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SOURCES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11.5px] text-muted-foreground">{SOURCES[source].instructions}</p>
      </div>

      {/* Upload */}
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" /> Choose CSV
        </Button>
        {fileName && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="size-4" /> {fileName} · {rows.length} rows
          </span>
        )}
      </div>

      {headers.length > 0 && (
        <>
          <div className="space-y-2">
            <Label className="text-[12.5px] font-semibold text-secondary-foreground">
              Add tasks to
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={dest} onValueChange={(v) => setDest(v as "new" | "existing")}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">A new project</SelectItem>
                  <SelectItem value="existing" disabled={projects.length === 0}>
                    An existing project
                  </SelectItem>
                </SelectContent>
              </Select>
              {dest === "new" ? (
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="New project name"
                  className="max-w-xs"
                />
              ) : (
                <Select value={existingId} onValueChange={setExistingId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Pick a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {dest === "existing" && (
              <p className="text-[11.5px] text-muted-foreground">
                Reuses the project&apos;s existing columns; any new statuses are added.
              </p>
            )}
          </div>

          {/* Mapping */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Map columns
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-[13px] font-medium">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </span>
                  <Select
                    value={map[f.key] >= 0 ? String(map[f.key]) : NONE}
                    onValueChange={(v) => setField(f.key, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— none —</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Preview
            </span>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-[12.5px]">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    {FIELDS.filter((f) => map[f.key] >= 0).map((f) => (
                      <th key={f.key} className="px-3 py-2 font-semibold">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, ri) => (
                    <tr key={ri} className="border-t">
                      {FIELDS.filter((f) => map[f.key] >= 0).map((f) => (
                        <td key={f.key} className="max-w-[200px] truncate px-3 py-2">
                          {r[map[f.key]]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Button
            onClick={runImport}
            disabled={
              pending ||
              (dest === "new" ? !projectName.trim() : !existingId)
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Import {rows.length} tasks
          </Button>
        </>
      )}
    </div>
  );
}
