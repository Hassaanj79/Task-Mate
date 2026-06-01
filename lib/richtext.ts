import type { RichText } from "@/lib/database.types";

// Flatten a Tiptap doc to plain text (paragraphs joined by newlines).
export function richTextToPlain(doc: RichText): string {
  if (!doc || !doc.content) return "";
  const parts: string[] = [];
  const walk = (nodes: unknown[]) => {
    for (const n of nodes) {
      const node = n as { type?: string; text?: string; content?: unknown[] };
      if (node.type === "text" && node.text) parts.push(node.text);
      else if (node.content) walk(node.content);
      if (node.type === "paragraph") parts.push("\n");
    }
  };
  walk(doc.content);
  return parts.join("").replace(/\n{2,}/g, "\n").trim();
}

// Wrap plain text (newline-separated) back into a minimal Tiptap doc.
export function plainToRichText(text: string): RichText {
  const trimmed = text.trim();
  if (!trimmed) return { type: "doc", content: [] };
  return {
    type: "doc",
    content: trimmed.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
