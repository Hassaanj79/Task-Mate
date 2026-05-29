import {
  Rocket,
  Image,
  LayoutGrid,
  Target,
  Users,
  Zap,
  Star,
  FileText,
  Folder,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  image: Image,
  "layout-grid": LayoutGrid,
  target: Target,
  users: Users,
  zap: Zap,
  star: Star,
  "file-text": FileText,
  folder: Folder,
  "bar-chart": BarChart3,
};

export function projectIcon(name?: string | null): LucideIcon {
  return ICONS[name ?? "folder"] ?? Folder;
}

export function ProjectIcon({
  icon,
  className,
  style,
}: {
  icon?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Index the module-scope map directly so the icon is a static component
  // reference (not one "created during render").
  const Cmp = ICONS[icon ?? "folder"] ?? Folder;
  return <Cmp className={className} style={style} />;
}
