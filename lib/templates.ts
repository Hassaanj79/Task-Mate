// Pre-seeded project templates. Picking one on project creation seeds the
// board columns, a set of workspace labels, and a few starter tasks.
// Patterns distilled from common Kanban / Scrum / bug-tracking / content /
// roadmap / marketing setups in ClickUp, Jira, Asana, Linear.

export type TemplateStatus = { name: string; color: string };
export type TemplateLabel = { name: string; color: string };
export type TemplateTask = {
  title: string;
  status: number; // index into statuses
  priority?: "none" | "low" | "medium" | "high" | "urgent";
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string; // PROJECT_ICONS name
  color: string;
  statuses: TemplateStatus[];
  labels: TemplateLabel[];
  tasks: TemplateTask[];
};

// status hues
const GRAY = "oklch(0.62 0.02 260)";
const PURPLE = "oklch(0.6 0.14 300)";
const BLUE = "oklch(0.62 0.13 250)";
const AMBER = "oklch(0.7 0.13 70)";
const GREEN = "oklch(0.64 0.13 155)";
const PINK = "oklch(0.65 0.15 350)";
const RED = "oklch(0.6 0.18 25)";
const CORAL = "oklch(0.66 0.15 42)";

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch with three simple columns.",
    icon: "folder",
    color: CORAL,
    statuses: [
      { name: "To Do", color: GRAY },
      { name: "In Progress", color: BLUE },
      { name: "Done", color: GREEN },
    ],
    labels: [],
    tasks: [],
  },
  {
    id: "kanban",
    name: "Kanban Board",
    description: "Flow work across a backlog and delivery stages.",
    icon: "layout-grid",
    color: BLUE,
    statuses: [
      { name: "Backlog", color: GRAY },
      { name: "To Do", color: PURPLE },
      { name: "In Progress", color: BLUE },
      { name: "Done", color: GREEN },
    ],
    labels: [
      { name: "Quick win", color: GREEN },
      { name: "Blocked", color: RED },
      { name: "Needs spec", color: AMBER },
    ],
    tasks: [
      { title: "Set up the project workspace", status: 1, priority: "medium" },
      { title: "Define the first milestone", status: 1, priority: "high" },
      { title: "Triage the backlog", status: 0, priority: "low" },
    ],
  },
  {
    id: "scrum",
    name: "Scrum Sprint",
    description: "Sprint workflow with review and a groomed backlog.",
    icon: "zap",
    color: PURPLE,
    statuses: [
      { name: "Backlog", color: GRAY },
      { name: "To Do", color: PURPLE },
      { name: "In Progress", color: BLUE },
      { name: "In Review", color: AMBER },
      { name: "Done", color: GREEN },
    ],
    labels: [
      { name: "Frontend", color: BLUE },
      { name: "Backend", color: GREEN },
      { name: "Bug", color: RED },
      { name: "Research", color: AMBER },
    ],
    tasks: [
      { title: "Sprint planning", status: 1, priority: "high" },
      { title: "Daily standup notes", status: 1, priority: "low" },
      { title: "Set up CI pipeline", status: 2, priority: "medium" },
      { title: "Sprint retro", status: 0, priority: "none" },
    ],
  },
  {
    id: "bug-tracker",
    name: "Bug Tracker",
    description: "Intake, triage, and resolve issues with severity labels.",
    icon: "target",
    color: RED,
    statuses: [
      { name: "New", color: GRAY },
      { name: "Triaged", color: PURPLE },
      { name: "In Progress", color: BLUE },
      { name: "In Review", color: AMBER },
      { name: "Resolved", color: GREEN },
    ],
    labels: [
      { name: "Critical", color: RED },
      { name: "High", color: AMBER },
      { name: "Medium", color: BLUE },
      { name: "Low", color: GRAY },
      { name: "Regression", color: PINK },
    ],
    tasks: [
      { title: "Crash on cold start", status: 1, priority: "urgent" },
      { title: "Login button misaligned on mobile", status: 0, priority: "low" },
      { title: "Slow query on dashboard", status: 2, priority: "high" },
    ],
  },
  {
    id: "content",
    name: "Content Calendar",
    description: "Plan content from idea to published across channels.",
    icon: "file-text",
    color: PINK,
    statuses: [
      { name: "Ideas", color: GRAY },
      { name: "Writing", color: PURPLE },
      { name: "Editing", color: AMBER },
      { name: "Scheduled", color: BLUE },
      { name: "Published", color: GREEN },
    ],
    labels: [
      { name: "Blog", color: PURPLE },
      { name: "Social", color: PINK },
      { name: "Newsletter", color: BLUE },
      { name: "Video", color: RED },
    ],
    tasks: [
      { title: "Q3 content themes", status: 0, priority: "medium" },
      { title: "Launch announcement post", status: 1, priority: "high" },
      { title: "Weekly newsletter", status: 1, priority: "low" },
    ],
  },
  {
    id: "roadmap",
    name: "Product Roadmap",
    description: "Track features from idea to shipped.",
    icon: "rocket",
    color: CORAL,
    statuses: [
      { name: "Ideas", color: GRAY },
      { name: "Planned", color: PURPLE },
      { name: "In Progress", color: BLUE },
      { name: "Shipped", color: GREEN },
    ],
    labels: [
      { name: "Feature", color: BLUE },
      { name: "Improvement", color: GREEN },
      { name: "Research", color: AMBER },
      { name: "Tech debt", color: GRAY },
    ],
    tasks: [
      { title: "Dark mode", status: 1, priority: "medium" },
      { title: "Mobile app v2", status: 0, priority: "high" },
      { title: "Onboarding revamp", status: 2, priority: "high" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Run a campaign from planning to launch.",
    icon: "bar-chart",
    color: AMBER,
    statuses: [
      { name: "Planning", color: GRAY },
      { name: "In Progress", color: BLUE },
      { name: "Review", color: AMBER },
      { name: "Launched", color: GREEN },
    ],
    labels: [
      { name: "Design", color: PURPLE },
      { name: "Copy", color: BLUE },
      { name: "Ads", color: RED },
      { name: "Email", color: GREEN },
    ],
    tasks: [
      { title: "Campaign brief", status: 0, priority: "high" },
      { title: "Landing page design", status: 1, priority: "medium" },
      { title: "Ad creative set", status: 1, priority: "medium" },
    ],
  },
];

export function getTemplate(id: string): ProjectTemplate {
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? PROJECT_TEMPLATES[0];
}
