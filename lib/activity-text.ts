export const ACTION_TEXT: Record<string, string> = {
  created: "created",
  status_changed: "moved",
  commented: "commented on",
  attached_file: "attached a file to",
  updated_title: "renamed",
  updated_priority: "changed priority of",
  updated_assignee_id: "reassigned",
  updated_due_date: "changed the due date of",
  updated_description: "edited",
  updated_status_id: "changed the status of",
};

export function actionLabel(action: string) {
  return ACTION_TEXT[action] ?? action.replace(/_/g, " ");
}
