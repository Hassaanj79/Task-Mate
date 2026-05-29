"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function addComment(
  orgId: string,
  taskId: string,
  body: unknown,
) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ org_id: orgId, task_id: taskId, author_id: user.id, body: body as never })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    org_id: orgId,
    task_id: taskId,
    actor_id: user.id,
    action: "commented",
  });
  return { error: null, id: data.id };
}

export async function deleteComment(commentId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  return { error: null };
}
