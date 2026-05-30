// Hand-maintained types mirroring supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` if the schema changes.

export type OrgRole = "owner" | "admin" | "member" | "guest";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";
export type InviteStatus = "pending" | "accepted" | "revoked";

// Tiptap document JSON (loosely typed)
export type RichText = { type: "doc"; content?: unknown[] } | null;

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  bio: string | null;
  timezone: string | null;
  created_at: string;
}

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  business_type: string | null;
  company_size: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
}

export type OrganizationMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export type Invitation = {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  token: string;
  status: InviteStatus;
  invited_by: string;
  created_at: string;
}

export type Project = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  archived: boolean;
  archived_at: string | null;
  created_by: string;
  created_at: string;
}

export type TaskStatus = {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  color: string | null;
  position: number;
}

export type Label = {
  id: string;
  org_id: string;
  name: string;
  color: string | null;
}

export type Task = {
  id: string;
  org_id: string;
  project_id: string;
  status_id: string | null;
  parent_id: string | null;
  title: string;
  description: RichText;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TaskLabel = {
  task_id: string;
  label_id: string;
  org_id: string;
}

export type Comment = {
  id: string;
  org_id: string;
  task_id: string;
  author_id: string;
  body: RichText;
  created_at: string;
}

export type Attachment = {
  id: string;
  org_id: string;
  task_id: string;
  storage_path: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}

export type Notification = {
  id: string;
  org_id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  task_id: string | null;
  comment_id: string | null;
  body: string | null;
  read: boolean;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  org_id: string;
  task_id: string | null;
  actor_id: string | null;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

type Row<T> = T;
type Insert<T, Optional extends keyof T = never> = Omit<
  Partial<Pick<T, Optional>> & Omit<T, Optional>,
  never
>;
type Update<T> = Partial<T>;

// supabase-js expects every table to carry a `Relationships` field; add an
// empty one to each so query inference works without hand-writing FK metadata.
type AddRelationships<T> = { [K in keyof T]: T[K] & { Relationships: [] } };

export type Database = {
  public: {
    Tables: AddRelationships<{
      profiles: {
        Row: Row<Profile>;
        Insert: Insert<
          Profile,
          "full_name" | "avatar_url" | "phone" | "job_title" | "bio" | "timezone" | "created_at"
        >;
        Update: Update<Profile>;
      };
      organizations: {
        Row: Row<Organization>;
        Insert: Insert<
          Organization,
          | "id"
          | "logo_url"
          | "email"
          | "phone"
          | "address"
          | "website"
          | "business_type"
          | "company_size"
          | "description"
          | "created_at"
        >;
        Update: Update<Organization>;
      };
      organization_members: {
        Row: Row<OrganizationMember>;
        Insert: Insert<OrganizationMember, "id" | "role" | "created_at">;
        Update: Update<OrganizationMember>;
      };
      invitations: {
        Row: Row<Invitation>;
        Insert: Insert<Invitation, "id" | "role" | "token" | "status" | "created_at">;
        Update: Update<Invitation>;
      };
      projects: {
        Row: Row<Project>;
        Insert: Insert<Project, "id" | "description" | "color" | "icon" | "archived" | "archived_at" | "created_at">;
        Update: Update<Project>;
      };
      task_statuses: {
        Row: Row<TaskStatus>;
        Insert: Insert<TaskStatus, "id" | "color" | "position">;
        Update: Update<TaskStatus>;
      };
      labels: {
        Row: Row<Label>;
        Insert: Insert<Label, "id" | "color">;
        Update: Update<Label>;
      };
      tasks: {
        Row: Row<Task>;
        Insert: Insert<
          Task,
          | "id"
          | "status_id"
          | "parent_id"
          | "description"
          | "priority"
          | "assignee_id"
          | "due_date"
          | "position"
          | "archived_at"
          | "created_at"
          | "updated_at"
        >;
        Update: Update<Task>;
      };
      task_labels: {
        Row: Row<TaskLabel>;
        Insert: Insert<TaskLabel>;
        Update: Update<TaskLabel>;
      };
      comments: {
        Row: Row<Comment>;
        Insert: Insert<Comment, "id" | "created_at">;
        Update: Update<Comment>;
      };
      attachments: {
        Row: Row<Attachment>;
        Insert: Insert<Attachment, "id" | "created_at">;
        Update: Update<Attachment>;
      };
      activity_log: {
        Row: Row<ActivityLog>;
        Insert: Insert<ActivityLog, "id" | "task_id" | "actor_id" | "meta" | "created_at">;
        Update: Update<ActivityLog>;
      };
      notifications: {
        Row: Row<Notification>;
        Insert: Insert<
          Notification,
          "id" | "actor_id" | "task_id" | "comment_id" | "body" | "read" | "created_at"
        >;
        Update: Update<Notification>;
      };
    }>;
    Views: Record<string, never>;
    Functions: {
      is_org_member: { Args: { p_org: string }; Returns: boolean };
      has_org_role: { Args: { p_org: string; p_roles: string[] }; Returns: boolean };
      accept_invitation: { Args: { p_token: string }; Returns: string };
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: Organization;
      };
    };
    Enums: {
      org_role: OrgRole;
      task_priority: TaskPriority;
      invite_status: InviteStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
