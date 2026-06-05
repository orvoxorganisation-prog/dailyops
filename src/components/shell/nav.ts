import type { ComponentType } from "react";
import {
  Building2,
  CalendarOff,
  ClipboardList,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Paperclip,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";

type IconType = ComponentType<{ className?: string }>;
export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
}

const employeeNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Daily Reports", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/goals", label: "Weekly Goals", icon: Target },
  { href: "/proof", label: "Proof of Work", icon: Paperclip },
  { href: "/leave", label: "Leave", icon: CalendarOff },
];

const adminNav: NavItem[] = [
  { href: "/company", label: "Company", icon: Building2 },
  { href: "/summary", label: "Daily Summary", icon: Sparkles },
  { href: "/performance", label: "Performance", icon: Gauge },
  { href: "/analytics", label: "Team Analytics", icon: TrendingUp },
  { href: "/all-reports", label: "All Reports", icon: Inbox },
  { href: "/admin/assignments", label: "Tasks & Goals", icon: ClipboardList },
  { href: "/admin/users", label: "Employees", icon: Users },
  { href: "/admin/leave", label: "Leave", icon: CalendarOff },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const navFor = (role: Role): NavItem[] => (role === "admin" ? adminNav : employeeNav);
