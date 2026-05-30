"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { emitEvent } from "@/lib/automation/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function plainText(doc: any): string {
  let out = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(n: any) {
    if (!n) return;
    if (typeof n.text === "string") out += n.text;
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }
  walk(doc);
  return out.trim().slice(0, 140);
}

export async function addComment(
  orgId: string,
  taskId: string,
  body: unknown,
  mentionedIds: string[] = [],
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

  await emitEvent(supabase, { taskId, type: "comment_added", actorId: user.id });

  // Notify mentioned co-members (never self). RLS confirms org membership.
  const recipients = [...new Set(mentionedIds)].filter((id) => id !== user.id);
  if (recipients.length > 0) {
    const snippet = plainText(body);
    await supabase.from("notifications").insert(
      recipients.map((rid) => ({
        org_id: orgId,
        recipient_id: rid,
        actor_id: user.id,
        type: "mention",
        task_id: taskId,
        comment_id: data.id,
        body: snippet,
      })),
    );
  }

  return { error: null, id: data.id };
}

export async function deleteComment(commentId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  return { error: null };
}
