import { LayoutDashboard, Sparkles, Mic, GraduationCap, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

// Routes are unchanged — only the visual labels are new (Command Center, Live Lecture, Knowledge Library).
export const NAV_ITEMS: NavItem[] = [
  { label: "Command Center", path: "/dashboard", icon: LayoutDashboard },
  { label: "AI Tutor", path: "/transform", icon: Sparkles },
  { label: "Live Lecture", path: "/classroom", icon: Mic },
  { label: "Knowledge Library", path: "/subjects", icon: GraduationCap },
];
