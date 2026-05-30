// UI metadata for the no-code automation builder. Shared client/server.

export type ConfigKind =
  | "none"
  | "status"
  | "priority"
  | "assignee"
  | "label"
  | "due"
  | "comment"
  | "notify"
  | "schedule";

export type TriggerMeta = {
  type: string;
  label: string;
  config: "none" | "to_status" | "to_priority" | "to_assignee" | "label" | "schedule";
  needsProject?: boolean;
  scheduled?: boolean;
};

export const TRIGGERS: TriggerMeta[] = [
  { type: "task_created", label: "Task is created", config: "none" },
  { type: "status_changed", label: "Status changes", config: "to_status", needsProject: true },
  { type: "assignee_changed", label: "Assignee changes", config: "to_assignee" },
  { type: "priority_changed", label: "Priority changes", config: "to_priority" },
  { type: "due_changed", label: "Due date changes", config: "none" },
  { type: "label_added", label: "Type is added", config: "label" },
  { type: "comment_added", label: "Comment is added", config: "none" },
  { type: "due_date", label: "Due date arrives (scheduled)", config: "schedule", scheduled: true },
];

export type ActionMeta = { type: string; label: string; config: ConfigKind; needsProject?: boolean };

export const ACTIONS: ActionMeta[] = [
  { type: "set_status", label: "Set status", config: "status", needsProject: true },
  { type: "set_priority", label: "Set priority", config: "priority" },
  { type: "set_assignee", label: "Set assignee", config: "assignee" },
  { type: "set_due", label: "Set due date", config: "due" },
  { type: "add_label", label: "Add type", config: "label" },
  { type: "remove_label", label: "Remove type", config: "label" },
  { type: "add_comment", label: "Post a comment", config: "comment" },
  { type: "notify", label: "Send a notification", config: "notify" },
];

export type CondFieldMeta = { field: string; label: string; ops: { op: string; label: string }[]; value: ConfigKind };

export const CONDITION_FIELDS: CondFieldMeta[] = [
  {
    field: "status",
    label: "Status",
    value: "status",
    ops: [
      { op: "is", label: "is" },
      { op: "is_not", label: "is not" },
      { op: "is_set", label: "is set" },
      { op: "is_empty", label: "is empty" },
    ],
  },
  {
    field: "assignee",
    label: "Assignee",
    value: "assignee",
    ops: [
      { op: "is", label: "is" },
      { op: "is_not", label: "is not" },
      { op: "is_set", label: "is set" },
      { op: "is_empty", label: "is empty (unassigned)" },
    ],
  },
  {
    field: "priority",
    label: "Priority",
    value: "priority",
    ops: [
      { op: "is", label: "is" },
      { op: "is_not", label: "is not" },
    ],
  },
  {
    field: "label",
    label: "Type",
    value: "label",
    ops: [
      { op: "has_label", label: "has" },
      { op: "not_has_label", label: "does not have" },
    ],
  },
  {
    field: "due",
    label: "Due date",
    value: "due",
    ops: [
      { op: "is_set", label: "is set" },
      { op: "is_empty", label: "is empty" },
      { op: "overdue", label: "is overdue" },
      { op: "due_within", label: "is within (days)" },
    ],
  },
];

export const RECIPES: {
  id: string;
  name: string;
  description: string;
  trigger: { type: string; config?: Record<string, unknown> };
  conditions: { op: "and" | "or"; rules: unknown[] };
  actions: { type: string; config?: Record<string, unknown> }[];
}[] = [
  {
    id: "created-notify-creator",
    name: "Welcome a new task",
    description: "When a task is created, post a comment.",
    trigger: { type: "task_created" },
    conditions: { op: "and", rules: [] },
    actions: [{ type: "add_comment", config: { text: "Task created — let's get started!" } }],
  },
  {
    id: "assignee-notify",
    name: "Notify on assignment",
    description: "When the assignee changes, notify the new assignee.",
    trigger: { type: "assignee_changed" },
    conditions: { op: "and", rules: [] },
    actions: [{ type: "notify", config: { recipient: "assignee", message: "You were assigned a task" } }],
  },
  {
    id: "urgent-notify-admins",
    name: "Escalate urgent work",
    description: "When priority becomes Urgent, notify admins.",
    trigger: { type: "priority_changed", config: { to: "urgent" } },
    conditions: { op: "and", rules: [] },
    actions: [{ type: "notify", config: { recipient: "admins", message: "An urgent task needs attention" } }],
  },
  {
    id: "bug-urgent",
    name: "Flag bugs as urgent",
    description: "When the Bug type is added, set priority to Urgent.",
    trigger: { type: "label_added" },
    conditions: { op: "and", rules: [] },
    actions: [{ type: "set_priority", config: { priority: "urgent" } }],
  },
  {
    id: "overdue-escalate",
    name: "Escalate overdue tasks (daily)",
    description: "Each morning, bump overdue tasks to High and comment.",
    trigger: { type: "due_date", config: { when: "overdue" } },
    conditions: { op: "and", rules: [] },
    actions: [
      { type: "set_priority", config: { priority: "high" } },
      { type: "notify", config: { recipient: "assignee", message: "This task is overdue" } },
    ],
  },
  {
    id: "comment-notify-creator",
    name: "Ping creator on discussion",
    description: "When a comment is added, notify the task creator.",
    trigger: { type: "comment_added" },
    conditions: { op: "and", rules: [] },
    actions: [{ type: "notify", config: { recipient: "creator", message: "New comment on your task" } }],
  },
];
