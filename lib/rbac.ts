import type { OrgRole } from "@/lib/database.types";

// Client/server-shared role helpers. These mirror the RLS policies for UX
// (hiding buttons users can't use). The database RLS is the real enforcement.

export const ROLE_RANK: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
  guest: 0,
};

export function canWrite(role: OrgRole): boolean {
  // owner / admin / member can create & edit tasks/projects; guests are read-only.
  return ROLE_RANK[role] >= ROLE_RANK.member;
}

export function canManageMembers(role: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

export function canConfigureOrg(role: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

export function canDeleteOrg(role: OrgRole): boolean {
  return role === "owner";
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

export const ASSIGNABLE_ROLES: OrgRole[] = ["admin", "member", "guest"];
