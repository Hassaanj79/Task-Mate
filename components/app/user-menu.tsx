"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, displayName } from "@/lib/format";
import type { Profile } from "@/lib/database.types";

export function UserMenu({ profile }: { profile: Profile | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="size-8 cursor-pointer transition hover:opacity-90">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {initials(profile?.full_name, profile?.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{displayName(profile)}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {profile?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
