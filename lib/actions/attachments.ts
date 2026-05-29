"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function recordAttachment(input: {
  orgId: string;
  taskId: string;
  storagePath: string;
  fileName: string;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      org_id: input.orgId,
      task_id: input.taskId,
      storage_path: input.storagePath,
      file_name: input.fileName,
      uploaded_by: user.id,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    org_id: input.orgId,
    task_id: input.taskId,
    actor_id: user.id,
    action: "attached_file",
    meta: { file_name: input.fileName },
  });
  return { error: null, attachment: data };
}

export async function deleteAttachment(id: string, storagePath: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.storage.from("attachments").remove([storagePath]);
  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// Short-lived signed URL for a private attachment download.
export async function getAttachmentUrl(storagePath: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 60 * 10);
  if (error) return { error: error.message, url: null };
  return { error: null, url: data.signedUrl };
}
