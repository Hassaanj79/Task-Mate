"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Loader2, Download, Trash2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  recordAttachment,
  deleteAttachment,
  getAttachmentUrl,
} from "@/lib/actions/attachments";
import { fetchAttachments, qk } from "@/lib/queries";
import { relativeTime } from "@/lib/format";
import { toast } from "sonner";

export function AttachmentsList({
  orgId,
  taskId,
  canWrite,
}: {
  orgId: string;
  taskId: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [] } = useQuery({
    queryKey: qk.attachments(taskId),
    queryFn: () => fetchAttachments(taskId),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${orgId}/${taskId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: false });
      if (error) {
        toast.error(error.message);
        return;
      }
      const res = await recordAttachment({
        orgId,
        taskId,
        storagePath: path,
        fileName: file.name,
      });
      if (res.error) toast.error(res.error);
      else queryClient.invalidateQueries({ queryKey: qk.attachments(taskId) });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function download(path: string) {
    const res = await getAttachmentUrl(path);
    if (res.url) window.open(res.url, "_blank");
    else toast.error(res.error ?? "Could not open file");
  }

  async function remove(id: string, path: string) {
    const res = await deleteAttachment(id, path);
    if (res.error) toast.error(res.error);
    else queryClient.invalidateQueries({ queryKey: qk.attachments(taskId) });
  }

  return (
    <div className="space-y-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <File className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{a.file_name}</span>
          <span className="text-xs text-muted-foreground">
            {relativeTime(a.created_at)}
          </span>
          <button
            onClick={() => download(a.storage_path)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="size-4" />
          </button>
          {canWrite && (
            <button
              onClick={() => remove(a.id, a.storage_path)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}

      {canWrite && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={onFile}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
            Attach file
          </Button>
        </>
      )}
      {attachments.length === 0 && !canWrite && (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      )}
    </div>
  );
}
