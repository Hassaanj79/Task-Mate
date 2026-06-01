import Mention from "@tiptap/extension-mention";
import { mergeAttributes } from "@tiptap/core";

export type MentionMember = { id: string; label: string };

// Tiptap Mention with a lightweight vanilla popup (no tippy dependency).
export function mentionExtension(members: MentionMember[]) {
  const labelFor = (attrs: { id?: string | null; label?: string | null }) =>
    attrs.label ??
    members.find((m) => m.id === attrs.id)?.label ??
    attrs.id ??
    "someone";

  return Mention.configure({
    HTMLAttributes: { class: "tm-mention" },
    // Render "@Name", falling back to a members lookup for older nodes that
    // were saved without a label attr.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderHTML: ({ options, node }: any) => [
      "span",
      mergeAttributes({ "data-type": "mention" }, options.HTMLAttributes),
      `@${labelFor(node.attrs)}`,
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderText: ({ node }: any) => `@${labelFor(node.attrs)}`,
    suggestion: {
      char: "@",
      items: ({ query }: { query: string }) =>
        members
          .filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6),
      // Overriding `suggestion` drops Mention's built-in command, so the node
      // would be inserted with no `label` attr (renders "@null"). Re-supply it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      command: ({ editor, range, props }: any) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "mention", attrs: { id: props.id, label: props.label } },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: () => {
        let el: HTMLDivElement | null = null;
        let items: MentionMember[] = [];
        let selected = 0;
        let command: ((item: MentionMember) => void) | null = null;

        function paint() {
          if (!el) return;
          el.innerHTML = "";
          if (items.length === 0) {
            el.style.display = "none";
            return;
          }
          el.style.display = "block";
          items.forEach((m, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = m.label;
            b.style.cssText = `display:block;width:100%;text-align:left;padding:6px 10px;border-radius:6px;font-size:13px;cursor:pointer;color:var(--foreground);background:${i === selected ? "var(--accent)" : "transparent"};`;
            b.onmousedown = (e) => {
              e.preventDefault();
              command?.(m);
            };
            b.onmouseenter = () => {
              selected = i;
              paint();
            };
            el!.appendChild(b);
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function place(props: any) {
          if (!el || !props.clientRect) return;
          const r = props.clientRect();
          if (!r) return;
          el.style.left = `${r.left}px`;
          el.style.top = `${r.bottom + 6}px`;
        }

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStart: (props: any) => {
            items = props.items;
            command = props.command;
            selected = 0;
            el = document.createElement("div");
            el.style.cssText =
              "position:fixed;z-index:300;min-width:180px;padding:4px;background:var(--popover);border:1px solid var(--border);border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.18);";
            document.body.appendChild(el);
            place(props);
            paint();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onUpdate: (props: any) => {
            items = props.items;
            command = props.command;
            place(props);
            paint();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onKeyDown: (props: any) => {
            if (props.event.key === "ArrowDown") {
              selected = (selected + 1) % Math.max(items.length, 1);
              paint();
              return true;
            }
            if (props.event.key === "ArrowUp") {
              selected = (selected - 1 + items.length) % Math.max(items.length, 1);
              paint();
              return true;
            }
            if (props.event.key === "Enter") {
              if (items[selected]) command?.(items[selected]);
              return true;
            }
            if (props.event.key === "Escape") {
              el?.remove();
              el = null;
              return true;
            }
            return false;
          },
          onExit: () => {
            el?.remove();
            el = null;
          },
        };
      },
    },
  });
}

// Pull mentioned profile ids out of a Tiptap document.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMentionIds(doc: any): string[] {
  const ids = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function walk(node: any) {
    if (!node) return;
    if (node.type === "mention" && node.attrs?.id) ids.add(node.attrs.id);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  }
  walk(doc);
  return [...ids];
}
