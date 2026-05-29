"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type JSONContent } from "@tiptap/react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextEditor } from "@/components/task/rich-text-editor";
import { fetchComments, qk } from "@/lib/queries";
import { addComment, deleteComment } from "@/lib/actions/comments";
import { createClient } from "@/lib/supabase/client";
import { initials, displayName, relativeTime } from "@/lib/format";
import { toast } from "sonner";

const EMPTY: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function CommentThread({
  orgId,
  taskId,
  currentUserId,
  canComment,
}: {
  orgId: string;
  taskId: string;
  currentUserId: string;
  canComment: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<JSONContent>(EMPTY);
  const [key, setKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: qk.comments(taskId),
    queryFn: () => fetchComments(taskId),
  });

  // Realtime for this task's comments.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${taskId}` },
        () => queryClient.invalidateQueries({ queryKey: qk.comments(taskId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  function isEmpty(doc: JSONContent) {
    const text = JSON.stringify(doc.content ?? []);
    return !/\"text\"/.test(text);
  }

  async function submit() {
    if (isEmpty(draft)) return;
    setSubmitting(true);
    const res = await addComment(orgId, taskId, draft);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setDraft(EMPTY);
    setKey((k) => k + 1);
    queryClient.invalidateQueries({ queryKey: qk.comments(taskId) });
  }

  async function remove(id: string) {
    const res = await deleteComment(id);
    if (res.error) toast.error(res.error);
    else queryClient.invalidateQueries({ queryKey: qk.comments(taskId) });
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar className="size-7">
            <AvatarImage src={c.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {initials(c.author?.full_name, c.author?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{displayName(c.author)}</span>
              <span className="text-xs text-muted-foreground">
                {relativeTime(c.created_at)}
              </span>
              {c.author_id === currentUserId && (
                <button
                  onClick={() => remove(c.id)}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-0.5 rounded-md bg-muted/50 px-3 py-2">
              <RichTextEditor value={c.body as JSONContent} editable={false} />
            </div>
          </div>
        </div>
      ))}

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {canComment && (
        <div className="space-y-2 border-t pt-4">
          <RichTextEditor
            key={key}
            value={EMPTY}
            placeholder="Write a comment…"
            onChange={setDraft}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
