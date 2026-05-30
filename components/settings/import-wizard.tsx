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

const FIELDS: { key: FieldKey; label: string; required?: boolean; hints: string[] }[] = [
  { key: "title", label: "Title", required: true, hints: ["name", "title", "task"] },
  { key: "status", label: "Status / Column", hints: ["status", "state", "stage"] },
  { key: "priority", label: "Priority", hints: ["priority"] },
  { key: "assignee", label: "Assignee", hints: ["assignee", "person", "owner", "assigned"] },
  { key: "due", label: "Due date", hints: ["due", "date", "deadline"] },
  { key: "labels", label: "Types / Tags", hints: ["tag", "label", "type", "category"] },
  { key: "description", label: "Description", hints: ["description", "notes", "details", "summary"] },
];

const NONE = "__none__";

export function ImportWizard({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
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
    if (!projectName) setProjectName(file.name.replace(/\.csv$/i, ""));
    // auto-guess mapping
    const guess: Record<FieldKey, number> = { ...map };
    for (const f of FIELDS) {
      const idx = h.findIndex((col) => f.hints.some((hint) => col.toLowerCase().includes(hint)));
      guess[f.key] = idx;
    }
    if (guess.title < 0) guess.title = 0;
    setMap(guess);
  }

  function setField(key: FieldKey, value: string) {
    setMap((m) => ({ ...m, [key]: value === NONE ? -1 : Number(value) }));
  }

  function runImport() {
    if (map.title < 0) {
      toast.error("Pick the Title column.");
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
    start(async () => {
      const res = await importTasks(orgId, orgSlug, projectName, payload);
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
        <h1 className="text-[21px] font-bold tracking-tight">Import from Notion</h1>
        <p className="text-sm text-muted-foreground">
          Export your Notion database as CSV, upload it here, map the columns,
          and it becomes a project. Missing statuses are created as new columns.
        </p>
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
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-semibold text-secondary-foreground">
              Project name
            </Label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="max-w-sm" />
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

          <Button onClick={runImport} disabled={pending || !projectName.trim()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Import {rows.length} tasks
          </Button>
        </>
      )}
    </div>
  );
}
