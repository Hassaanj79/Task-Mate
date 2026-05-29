"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Bold, Italic, List, ListOrdered, Strikethrough } from "lucide-react";
import { mentionExtension, type MentionMember } from "@/lib/mention";

const baseClass =
  "prose prose-sm dark:prose-invert max-w-none focus:outline-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5";

export function RichTextEditor({
  value,
  editable = true,
  placeholder,
  onChange,
  className,
  mentionMembers,
}: {
  value: JSONContent | null;
  editable?: boolean;
  placeholder?: string;
  onChange?: (json: JSONContent) => void;
  className?: string;
  mentionMembers?: MentionMember[];
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ...(mentionMembers ? [mentionExtension(mentionMembers)] : []),
    ],
    content: value ?? undefined,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(baseClass, "min-h-[2rem]", className),
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) {
    return <div className={cn(baseClass, "text-muted-foreground", className)}>…</div>;
  }

  return (
    <div>
      {editable && (
        <div className="mb-2 flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
        </div>
      )}
      {editable && placeholder && editor.isEmpty && (
        <p className="pointer-events-none -mb-7 text-sm text-muted-foreground">
          {placeholder}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded transition",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
