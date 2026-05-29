"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, FolderKanban, Inbox, UserPlus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProjectIcon } from "@/components/project/project-icon";
import { createClient } from "@/lib/supabase/client";
import { useShell } from "@/components/app/shell-context";

export function SearchPalette() {
  const router = useRouter();
  const { searchOpen, setSearchOpen, activeOrg, activeSlug, projects } = useShell();
  const [query, setQuery] = useState("");

  // ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["search-tasks", activeOrg.id, query],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tasks")
        .select("id, title, project_id")
        .eq("org_id", activeOrg.id)
        .ilike("title", `%${query}%`)
        .limit(6);
      return data ?? [];
    },
    enabled: searchOpen && query.length > 0,
  });

  const filteredProjects = projects.filter(
    (p) => !query || p.name.toLowerCase().includes(query.toLowerCase()),
  );

  function go(path: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(path);
  }

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-1/4 translate-y-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tasks, projects…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {filteredProjects.length > 0 && (
          <CommandGroup heading="Projects">
            {filteredProjects.slice(0, 5).map((p) => (
              <CommandItem
                key={p.id}
                value={`project-${p.id}`}
                onSelect={() => go(`/${activeSlug}/projects/${p.id}/board`)}
              >
                <ProjectIcon
                  icon={p.icon}
                  className="size-4"
                  style={{ color: p.color ?? undefined }}
                />
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks.map((t) => (
              <CommandItem
                key={t.id}
                value={`task-${t.id}`}
                onSelect={() => go(`/${activeSlug}/projects/${t.project_id}/board`)}
              >
                <CheckSquare className="size-4 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && (
          <CommandGroup heading="Quick actions">
            <CommandItem value="qa-projects" onSelect={() => go(`/${activeSlug}`)}>
              <FolderKanban className="size-4 text-muted-foreground" />
              Go to projects
            </CommandItem>
            <CommandItem value="qa-mytasks" onSelect={() => go(`/${activeSlug}/my-tasks`)}>
              <CheckSquare className="size-4 text-muted-foreground" />
              My Tasks
            </CommandItem>
            <CommandItem value="qa-inbox" onSelect={() => go(`/${activeSlug}/inbox`)}>
              <Inbox className="size-4 text-muted-foreground" />
              Inbox
            </CommandItem>
            <CommandItem
              value="qa-invite"
              onSelect={() => go(`/${activeSlug}/settings/members`)}
            >
              <UserPlus className="size-4 text-muted-foreground" />
              Invite people
            </CommandItem>
          </CommandGroup>
        )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
